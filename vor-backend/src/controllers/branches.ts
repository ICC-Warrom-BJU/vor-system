import { Response } from 'express'
import { AuthRequest, ApiResponse, AppError } from '../utils/types'
import prisma from '../config/prisma'
import { createBranchSchema, updateBranchSchema } from '../utils/validators'

export const getAllBranches = async (req: AuthRequest, res: Response) => {
  const branches = await prisma.branch.findMany({
    orderBy: { name: 'asc' },
  })

  res.json({
    success: true,
    message: 'Daftar cabang berhasil diambil',
    data: branches,
  } as ApiResponse<any>)
}

export const getBranchById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  const branch = await prisma.branch.findUnique({ where: { id } })
  if (!branch) {
    throw new AppError('Cabang tidak ditemukan', 404)
  }

  res.json({
    success: true,
    message: 'Data cabang berhasil diambil',
    data: branch,
  } as ApiResponse<any>)
}

export const createBranch = async (req: AuthRequest, res: Response) => {
  const parsed = createBranchSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Validasi gagal', error: parsed.error.issues })
  }
  const body = parsed.data

  const existing = await prisma.branch.findUnique({ where: { name: body.name } })
  if (existing) {
    throw new AppError('Nama cabang sudah terdaftar', 409)
  }

  const branch = await prisma.branch.create({
    data: {
      name: body.name,
      code: body.code,
      description: body.description,
    },
  })

  res.status(201).json({
    success: true,
    message: 'Cabang berhasil dibuat',
    data: branch,
  } as ApiResponse<any>)
}

export const updateBranch = async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const parsed = updateBranchSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Validasi gagal', error: parsed.error.issues })
  }
  const body = parsed.data

  const branch = await prisma.branch.findUnique({ where: { id } })
  if (!branch) {
    throw new AppError('Cabang tidak ditemukan', 404)
  }

  if (body.name) {
    const existing = await prisma.branch.findFirst({
      where: {
        name: body.name,
        NOT: { id },
      },
    })
    if (existing) {
      throw new AppError('Nama cabang sudah terdaftar', 409)
    }
  }

  const updated = await prisma.branch.update({
    where: { id },
    data: {
      name: body.name,
      code: body.code,
      description: body.description,
    },
  })

  res.json({
    success: true,
    message: 'Cabang berhasil diperbarui',
    data: updated,
  } as ApiResponse<any>)
}

export const deleteBranch = async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  const branch = await prisma.branch.findUnique({ where: { id } })
  if (!branch) {
    throw new AppError('Cabang tidak ditemukan', 404)
  }

  const relatedVehicle = await prisma.vehicle.findFirst({ where: { branchId: id } })
  const relatedUser = await prisma.user.findFirst({ where: { branchId: id } })

  if (relatedVehicle || relatedUser) {
    throw new AppError('Cabang tidak dapat dihapus karena masih digunakan oleh kendaraan atau user', 400)
  }

  await prisma.branch.delete({ where: { id } })

  res.json({
    success: true,
    message: 'Cabang berhasil dihapus',
  } as ApiResponse<any>)
}
