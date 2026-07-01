import { Response } from 'express'
import { AuthRequest, ApiResponse } from '../utils/types'
import prisma from '../config/prisma'
import { createDriverSchema, updateDriverSchema } from '../utils/validators'

const driverInclude = {
  branch: { select: { id: true, name: true } },
  vehicles: {
    select: { id: true, nopol: true, vehicleType: true },
  },
}

export const getAllDrivers = async (req: AuthRequest, res: Response) => {
  const where: any = {}
  if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGEMENT') {
    where.cabang = req.user.cabang
  }

  const drivers = await prisma.driver.findMany({
    where,
    include: driverInclude,
    orderBy: { name: 'asc' },
  })

  res.json({
    success: true,
    message: 'Data driver berhasil diambil',
    data: drivers,
  } as ApiResponse<any>)
}

export const getDriverById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  const driver = await prisma.driver.findUnique({
    where: { id },
    include: driverInclude,
  })

  if (!driver) {
    return res.status(404).json({
      success: false,
      message: 'Driver tidak ditemukan',
    })
  }

  res.json({
    success: true,
    message: 'Data driver berhasil diambil',
    data: driver,
  } as ApiResponse<any>)
}

export const createDriver = async (req: AuthRequest, res: Response) => {
  const parsed = createDriverSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Validasi gagal',
      error: parsed.error.issues,
    })
  }

  const data: any = { ...parsed.data }
  if (data.simExpiry) data.simExpiry = new Date(data.simExpiry)
  if (data.joinDate) data.joinDate = new Date(data.joinDate)

  if (data.branchId && !data.cabang) {
    const branch = await prisma.branch.findUnique({ where: { id: data.branchId } })
    if (branch) data.cabang = branch.name
  }

  const driver = await prisma.driver.create({
    data,
    include: driverInclude,
  })

  res.status(201).json({
    success: true,
    message: 'Driver berhasil ditambahkan',
    data: driver,
  } as ApiResponse<any>)
}

export const updateDriver = async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  const parsed = updateDriverSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Validasi gagal',
      error: parsed.error.issues,
    })
  }

  const driver = await prisma.driver.findUnique({ where: { id } })
  if (!driver) {
    return res.status(404).json({
      success: false,
      message: 'Driver tidak ditemukan',
    })
  }

  const data: any = { ...parsed.data }
  if (data.simExpiry) data.simExpiry = new Date(data.simExpiry)
  if (data.joinDate) data.joinDate = new Date(data.joinDate)

  if (data.branchId && !data.cabang) {
    const branch = await prisma.branch.findUnique({ where: { id: data.branchId } })
    if (branch) data.cabang = branch.name
  }

  const updated = await prisma.driver.update({
    where: { id },
    data,
    include: driverInclude,
  })

  res.json({
    success: true,
    message: 'Driver berhasil diperbarui',
    data: updated,
  } as ApiResponse<any>)
}

export const deleteDriver = async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  const driver = await prisma.driver.findUnique({ where: { id } })
  if (!driver) {
    return res.status(404).json({
      success: false,
      message: 'Driver tidak ditemukan',
    })
  }

  const assignedVehicles = await prisma.vehicle.findFirst({
    where: { driverId: id },
  })
  if (assignedVehicles) {
    return res.status(409).json({
      success: false,
      message: 'Driver sedang ditugaskan, tidak bisa dihapus',
    })
  }

  await prisma.driver.delete({ where: { id } })

  res.json({
    success: true,
    message: 'Driver berhasil dihapus',
  } as ApiResponse<null>)
}
