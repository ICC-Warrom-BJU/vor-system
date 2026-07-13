import { Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { AuthRequest, AppError, ApiResponse } from '../utils/types'
import prisma from '../config/prisma'
import { loginSchema, registerSchema, LoginRequest, RegisterRequest } from '../utils/validators'

export const login = async (req: AuthRequest, res: Response) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Validasi gagal',
      error: parsed.error.issues,
    })
  }

  const body: LoginRequest = parsed.data

  const user = await prisma.user.findUnique({
    where: { email: body.email },
    include: {
      branch: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Email atau password salah',
    })
  }

  const isPasswordValid = await bcrypt.compare(body.password, user.password)
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Email atau password salah',
    })
  }

  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'User tidak aktif',
    })
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      cabang: user.cabang,
      branchId: user.branchId,
      allowedVehicleTypes: user.allowedVehicleTypes,
    },
    process.env.JWT_SECRET || 'vor_super_secret_jwt_key_ganti_ini_nanti',
    { expiresIn: '7d' },
  )

  res.json({
    success: true,
    message: 'Login berhasil',
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        cabang: user.cabang,
        branchId: user.branchId,
        branch: user.branch ? { id: user.branch.id, name: user.branch.name } : undefined,
        allowedVehicleTypes: user.allowedVehicleTypes,
        avatarSeed: user.avatarSeed,
      },
      token,
    },
  } as ApiResponse<any>)
}

export const register = async (req: AuthRequest, res: Response) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Validasi gagal',
      error: parsed.error.issues,
    })
  }

  const body: RegisterRequest = parsed.data

  const existingUser = await prisma.user.findUnique({
    where: { email: body.email },
  })

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'Email sudah terdaftar',
    })
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
    createData.cabang = body.cabang
  }

  const user = await prisma.user.create({
    data: createData,
    include: {
      branch: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  res.status(201).json({
    success: true,
    message: 'User berhasil terdaftar',
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      cabang: user.cabang,
      branchId: user.branchId,
      branch: user.branch ? { id: user.branch.id, name: user.branch.name } : undefined,
      allowedVehicleTypes: user.allowedVehicleTypes,
    },
  } as ApiResponse<any>)
}
