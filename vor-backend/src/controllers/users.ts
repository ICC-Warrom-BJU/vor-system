import { Response } from 'express'
import { AuthRequest, ApiResponse, AppError } from '../utils/types'
import prisma from '../config/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'

// Kebijakan password (R-2): minimal 8 karakter + harus mengandung huruf & angka.
const strongPassword = z
  .string()
  .min(8, 'Password minimal 8 karakter')
  .regex(/[A-Za-z]/, 'Password harus mengandung huruf')
  .regex(/[0-9]/, 'Password harus mengandung angka')

const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'PLANNER', 'SUPERVISOR', 'MANAGEMENT']).optional(),
  cabang: z.string().optional(),
  branchId: z.string().optional(),
  allowedVehicleTypes: z.array(z.string()).optional(),
  avatarSeed: z.string().nullable().optional(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: strongPassword,
})

const createUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: strongPassword,
  role: z.enum(['ADMIN', 'PLANNER', 'SUPERVISOR', 'MANAGEMENT']),
  cabang: z.string().optional(),
  branchId: z.string().optional(),
  allowedVehicleTypes: z.array(z.string()).optional(),
})

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      cabang: true,
      branchId: true,
      branch: {
        select: {
          id: true,
          name: true,
        },
      },
      allowedVehicleTypes: true,
      avatarSeed: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  res.json({
    success: true,
    message: 'Daftar user berhasil diambil',
    data: users,
    count: users.length,
  } as ApiResponse<any>)
}

export const getUserById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      cabang: true,
      branchId: true,
      branch: {
        select: {
          id: true,
          name: true,
        },
      },
      allowedVehicleTypes: true,
      avatarSeed: true,
      createdAt: true,
    },
  })

  if (!user) {
    throw new AppError('User tidak ditemukan', 404)
  }

  res.json({
    success: true,
    message: 'Data user berhasil diambil',
    data: user,
  } as ApiResponse<any>)
}

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      cabang: true,
      branchId: true,
      branch: {
        select: {
          id: true,
          name: true,
        },
      },
      allowedVehicleTypes: true,
      avatarSeed: true,
      createdAt: true,
    },
  })

  if (!user) {
    throw new AppError('User tidak ditemukan', 404)
  }

  res.json({
    success: true,
    message: 'Profil user berhasil diambil',
    data: user,
  } as ApiResponse<any>)
}

export const updateUserProfile = async (req: AuthRequest, res: Response) => {
  const parsed = updateUserSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Validasi gagal', error: parsed.error.issues })
  }
  const body = parsed.data

  // Check if email is already taken
  if (body.email) {
    const existing = await prisma.user.findFirst({
      where: {
        email: body.email,
        NOT: { id: req.user!.id },
      },
    })

    if (existing) {
      throw new AppError('Email sudah digunakan', 409)
    }
  }

  const updateData: any = {
    name: body.name,
    email: body.email,
  }

  if (body.avatarSeed !== undefined) {
    updateData.avatarSeed = body.avatarSeed || null
  }

  if (body.branchId) {
    const branch = await prisma.branch.findUnique({ where: { id: body.branchId } })
    if (!branch) {
      throw new AppError('Cabang tidak ditemukan', 404)
    }
    updateData.branchId = body.branchId
    updateData.cabang = branch.name
  } else if (body.cabang !== undefined) {
    updateData.cabang = body.cabang
  }

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      cabang: true,
      branchId: true,
      branch: {
        select: {
          id: true,
          name: true,
        },
      },
      allowedVehicleTypes: true,
      avatarSeed: true,
      createdAt: true,
    },
  })

  res.json({
    success: true,
    message: 'Profil user berhasil diperbarui',
    data: user,
  } as ApiResponse<any>)
}

export const changePassword = async (req: AuthRequest, res: Response) => {
  const parsed = changePasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Validasi gagal', error: parsed.error.issues })
  }
  const body = parsed.data

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
  })

  if (!user) {
    throw new AppError('User tidak ditemukan', 404)
  }

  // Verify current password
  const isPasswordValid = await bcrypt.compare(
    body.currentPassword,
    user.password
  )

  if (!isPasswordValid) {
    throw new AppError('Password saat ini tidak sesuai', 401)
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(body.newPassword, 10)

  await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      password: hashedPassword,
    },
  })

  res.json({
    success: true,
    message: 'Password berhasil diubah',
  } as ApiResponse<any>)
}

// Admin operations
export const createUser = async (req: AuthRequest, res: Response) => {
  const parsed = createUserSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Validasi gagal', error: parsed.error.issues })
  }
  const body = parsed.data

  // Check if email already exists
  const existing = await prisma.user.findUnique({
    where: { email: body.email },
  })

  if (existing) {
    throw new AppError('Email sudah terdaftar', 409)
  }

  const hashedPassword = await bcrypt.hash(body.password, 10)

  const createData: any = {
    name: body.name,
    email: body.email,
    password: hashedPassword,
    role: body.role,
  }

  if (body.branchId) {
    const branch = await prisma.branch.findUnique({ where: { id: body.branchId } })
    if (!branch) {
      throw new AppError('Cabang tidak ditemukan', 404)
    }
    createData.branchId = body.branchId
    createData.cabang = branch.name
  } else {
    createData.cabang = body.cabang || 'Jakarta'
  }

  if (body.allowedVehicleTypes) {
    createData.allowedVehicleTypes = body.allowedVehicleTypes
  }

  const user = await prisma.user.create({
    data: createData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      cabang: true,
      branchId: true,
      branch: {
        select: {
          id: true,
          name: true,
        },
      },
      allowedVehicleTypes: true,
      avatarSeed: true,
      createdAt: true,
    },
  })

  res.status(201).json({
    success: true,
    message: 'User berhasil dibuat',
    data: user,
  } as ApiResponse<any>)
}

export const updateUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const parsed = updateUserSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Validasi gagal', error: parsed.error.issues })
  }
  const body = parsed.data

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id },
  })

  if (!user) {
    throw new AppError('User tidak ditemukan', 404)
  }

  // Check if email is already taken
  if (body.email) {
    const existing = await prisma.user.findFirst({
      where: {
        email: body.email,
        NOT: { id },
      },
    })

    if (existing) {
      throw new AppError('Email sudah digunakan', 409)
    }
  }

  const updateData: any = {
    name: body.name,
    email: body.email,
    role: body.role,
  }

  if (body.branchId) {
    const branch = await prisma.branch.findUnique({ where: { id: body.branchId } })
    if (!branch) {
      throw new AppError('Cabang tidak ditemukan', 404)
    }
    updateData.branchId = body.branchId
    updateData.cabang = branch.name
  } else if (body.cabang !== undefined) {
    updateData.cabang = body.cabang
  }

  if (body.allowedVehicleTypes !== undefined) {
    updateData.allowedVehicleTypes = body.allowedVehicleTypes
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      cabang: true,
      branchId: true,
      branch: {
        select: {
          id: true,
          name: true,
        },
      },
      allowedVehicleTypes: true,
      avatarSeed: true,
      createdAt: true,
    },
  })

  res.json({
    success: true,
    message: 'User berhasil diperbarui',
    data: updated,
  } as ApiResponse<any>)
}

export const deleteUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  // Prevent deleting self
  if (id === req.user!.id) {
    throw new AppError('Tidak dapat menghapus akun sendiri', 400)
  }

  const user = await prisma.user.findUnique({
    where: { id },
  })

  if (!user) {
    throw new AppError('User tidak ditemukan', 404)
  }

  await prisma.user.delete({
    where: { id },
  })

  res.json({
    success: true,
    message: 'User berhasil dihapus',
  } as ApiResponse<any>)
}

export const getUsersByRole = async (req: AuthRequest, res: Response) => {
  const { role } = req.query

  if (!role) {
    throw new AppError('Parameter role harus diberikan', 400)
  }

  const users = await prisma.user.findMany({
    where: { role: role as Role },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      cabang: true,
      branchId: true,
      branch: {
        select: {
          id: true,
          name: true,
        },
      },
      allowedVehicleTypes: true,
      avatarSeed: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  res.json({
    success: true,
    message: `User dengan role ${role} berhasil diambil`,
    data: users,
    count: users.length,
  } as ApiResponse<any>)
}
