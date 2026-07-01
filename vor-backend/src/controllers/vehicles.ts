import { Response } from 'express'
import { AuthRequest, AppError, ApiResponse } from '../utils/types'
import prisma from '../config/prisma'
import { createVehicleSchema, updateVehicleSchema } from '../utils/validators'
import { getCabangFilter, getVehicleTypeFilter } from '../utils/cabangFilter'

export const getAllVehicles = async (req: AuthRequest, res: Response) => {
  const vehicles = await prisma.vehicle.findMany({
    where: { ...getCabangFilter(req), ...getVehicleTypeFilter(req) },
    include: {
      customer: true,
      driver: true,
      branch: true,
    },
  })

  res.json({
    success: true,
    message: 'Data kendaraan berhasil diambil',
    data: vehicles,
  } as ApiResponse<any>)
}

export const getVehicleById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      customer: true,
      driver: true,
      branch: true,
      actualStatus: {
        orderBy: { date: 'desc' },
        take: 10,
      },
      forecastStatus: {
        orderBy: { date: 'desc' },
        take: 10,
      },
    },
  })

  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: 'Kendaraan tidak ditemukan',
    })
  }

  res.json({
    success: true,
    message: 'Data kendaraan berhasil diambil',
    data: vehicle,
  } as ApiResponse<any>)
}

export const createVehicle = async (req: AuthRequest, res: Response) => {
  const parsed = createVehicleSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Validasi gagal',
      error: parsed.error.issues,
    })
  }

  let data = parsed.data

  // Clean up empty strings to null/undefined
  if (data.customerId === '') {
    data.customerId = undefined
  }
  if (data.driverId === '') {
    data.driverId = undefined
  }

  // Validate and set cabang from branch
  const branch = await prisma.branch.findUnique({ where: { id: data.branchId } })
  if (!branch) {
    return res.status(404).json({
      success: false,
      message: 'Cabang tidak ditemukan',
    })
  }
  data.cabang = branch.name

  // Check if nopol already exists
  const existing = await prisma.vehicle.findUnique({
    where: { nopol: data.nopol },
  })

  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'Nopol sudah terdaftar',
    })
  }

  // Check if customerId exists (if provided)
  if (data.customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    })
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer tidak ditemukan',
      })
    }
  }

  // Check if driverId exists (if provided)
  if (data.driverId) {
    const driver = await prisma.driver.findUnique({
      where: { id: data.driverId },
    })
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver tidak ditemukan',
      })
    }
  }

  const vehicle = await prisma.vehicle.create({
    data: data as any,
    include: {
      customer: true,
      driver: true,
    },
  })

  res.status(201).json({
    success: true,
    message: 'Kendaraan berhasil ditambahkan',
    data: vehicle,
  } as ApiResponse<any>)
}

export const updateVehicle = async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  const parsed = updateVehicleSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Validasi gagal',
      error: parsed.error.issues,
    })
  }

  const data = parsed.data

  // Clean up empty strings to null/undefined
  if (data.customerId === '') {
    data.customerId = undefined
  }
  if (data.driverId === '') {
    data.driverId = undefined
  }

  if (data.branchId) {
    const branch = await prisma.branch.findUnique({ where: { id: data.branchId } })
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Cabang tidak ditemukan',
      })
    }
    data.cabang = branch.name
  }

  if (data.cabang !== undefined && data.cabang.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Cabang tidak boleh kosong',
    })
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
  })

  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: 'Kendaraan tidak ditemukan',
    })
  }

  // Check if new nopol already exists (if nopol is being updated)
  if (data.nopol && data.nopol !== vehicle.nopol) {
    const existing = await prisma.vehicle.findUnique({
      where: { nopol: data.nopol },
    })
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Nopol sudah terdaftar',
      })
    }
  }

  // Check if customerId exists (if provided)
  if (data.customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    })
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer tidak ditemukan',
      })
    }
  }

  // Check if driverId exists (if provided)
  if (data.driverId) {
    const driver = await prisma.driver.findUnique({
      where: { id: data.driverId },
    })
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver tidak ditemukan',
      })
    }
  }

  const updated = await prisma.vehicle.update({
    where: { id },
    data,
    include: {
      customer: true,
      driver: true,
    },
  })

  res.json({
    success: true,
    message: 'Kendaraan berhasil diperbarui',
    data: updated,
  } as ApiResponse<any>)
}

export const deleteVehicle = async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
  })

  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: 'Kendaraan tidak ditemukan',
    })
  }

  // Check if vehicle has any data (don't hard delete, just deactivate)
  const hasData = await prisma.actualStatus.findFirst({
    where: { vehicleId: id },
  })

  if (hasData) {
    // Soft delete by deactivating
    const updated = await prisma.vehicle.update({
      where: { id },
      data: { isActive: false },
    })
    return res.json({
      success: true,
      message: 'Kendaraan berhasil dinonaktifkan',
      data: updated,
    } as ApiResponse<any>)
  }

  // Hard delete if no data
  await prisma.vehicle.delete({
    where: { id },
  })

  res.json({
    success: true,
    message: 'Kendaraan berhasil dihapus',
  } as ApiResponse<null>)
}
