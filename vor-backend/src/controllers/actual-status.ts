import { Response } from 'express'
import { AuthRequest, ApiResponse, AppError } from '../utils/types'
import prisma from '../config/prisma'
import { z } from 'zod'
import { getVehicleCabangFilter, getVehicleRelationTypeFilter } from '../utils/cabangFilter'

const createActualStatusSchema = z.object({
  vehicleId: z.string(),
  date: z.string().datetime(),
  statusCode: z.string(),
  notes: z.string().optional(),
})

const updateActualStatusSchema = z.object({
  statusCode: z.string(),
  notes: z.string().optional(),
})

export const createActualStatus = async (req: AuthRequest, res: Response) => {
  const body = createActualStatusSchema.parse(req.body)

  // Check if vehicle exists
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: body.vehicleId },
  })

  if (!vehicle) {
    throw new AppError('Vehicle tidak ditemukan', 404)
  }

  // Check if status code exists
  const masterStatus = await prisma.masterStatus.findUnique({
    where: { code: body.statusCode },
  })

  if (!masterStatus) {
    throw new AppError('Status code tidak ditemukan', 404)
  }

  // Check if already exists for this vehicle and date
  const existingStatus = await prisma.actualStatus.findFirst({
    where: {
      vehicleId: body.vehicleId,
      date: new Date(body.date),
    },
  })

  if (existingStatus) {
    throw new AppError('Status sudah ada untuk vehicle dan tanggal ini', 409)
  }

  const actualStatus = await prisma.actualStatus.create({
    data: {
      vehicleId: body.vehicleId,
      date: new Date(body.date),
      statusCode: body.statusCode,
      notes: body.notes,
      createdBy: req.user!.id,
    },
    include: {
      vehicle: true,
      status: true,
    },
  })

  res.status(201).json({
    success: true,
    message: 'Actual status berhasil dibuat',
    data: actualStatus,
  } as ApiResponse<any>)
}

export const updateActualStatus = async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const body = updateActualStatusSchema.parse(req.body)

  // Check if status code exists
  const masterStatus = await prisma.masterStatus.findUnique({
    where: { code: body.statusCode },
  })

  if (!masterStatus) {
    throw new AppError('Status code tidak ditemukan', 404)
  }

  const actualStatus = await prisma.actualStatus.findUnique({
    where: { id },
  })

  if (!actualStatus) {
    throw new AppError('Actual status tidak ditemukan', 404)
  }

  const updated = await prisma.actualStatus.update({
    where: { id },
    data: {
      statusCode: body.statusCode,
      notes: body.notes,
      updatedBy: req.user!.id,
    },
    include: {
      vehicle: true,
      status: true,
    },
  })

  res.json({
    success: true,
    message: 'Actual status berhasil diperbarui',
    data: updated,
  } as ApiResponse<any>)
}

export const getActualStatusByDate = async (
  req: AuthRequest,
  res: Response
) => {
  const { date } = req.query

  if (!date) {
    throw new AppError('Parameter date harus diberikan', 400)
  }

  const targetDate = new Date(date as string)
  const startOfDay = new Date(targetDate)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(targetDate)
  endOfDay.setHours(23, 59, 59, 999)

  const cabangFilter = getVehicleCabangFilter(req)
  const typeFilter = getVehicleRelationTypeFilter(req)

  const statuses = await prisma.actualStatus.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      ...cabangFilter,
      ...typeFilter,
    },
    include: {
      vehicle: true,
      status: true,
    },
    orderBy: { vehicle: { nopol: 'asc' } },
  })

  res.json({
    success: true,
    message: 'Data actual status berhasil diambil',
    data: statuses,
  } as ApiResponse<any>)
}

export const getActualStatusByVehicleAndDate = async (
  req: AuthRequest,
  res: Response
) => {
  const { vehicleId } = req.params
  const { startDate, endDate } = req.query

  if (!startDate || !endDate) {
    throw new AppError(
      'Parameter startDate dan endDate harus diberikan',
      400
    )
  }

  const start = new Date(startDate as string)
  const end = new Date(endDate as string)

  if (start > end) {
    throw new AppError('startDate harus lebih awal dari endDate', 400)
  }

  const cabangFilter = getVehicleCabangFilter(req)
  const typeFilter = getVehicleRelationTypeFilter(req)

  const statuses = await prisma.actualStatus.findMany({
    where: {
      vehicleId,
      date: {
        gte: start,
        lte: end,
      },
      ...cabangFilter,
      ...typeFilter,
    },
    include: {
      vehicle: true,
      status: true,
    },
    orderBy: { date: 'asc' },
  })

  res.json({
    success: true,
    message: 'Data actual status berhasil diambil',
    data: statuses,
  } as ApiResponse<any>)
}

export const getActualStatusById = async (
  req: AuthRequest,
  res: Response
) => {
  const { id } = req.params

  const actualStatus = await prisma.actualStatus.findUnique({
    where: { id },
    include: {
      vehicle: true,
      status: true,
    },
  })

  if (!actualStatus) {
    throw new AppError('Actual status tidak ditemukan', 404)
  }

  res.json({
    success: true,
    message: 'Data actual status berhasil diambil',
    data: actualStatus,
  } as ApiResponse<any>)
}

export const deleteActualStatus = async (
  req: AuthRequest,
  res: Response
) => {
  const { id } = req.params

  const actualStatus = await prisma.actualStatus.findUnique({
    where: { id },
  })

  if (!actualStatus) {
    throw new AppError('Actual status tidak ditemukan', 404)
  }

  await prisma.actualStatus.delete({
    where: { id },
  })

  res.json({
    success: true,
    message: 'Actual status berhasil dihapus',
  } as ApiResponse<any>)
}

// Bulk update for grid input
export const bulkUpdateActualStatus = async (
  req: AuthRequest,
  res: Response
) => {
  const { updates } = req.body

  if (!Array.isArray(updates) || updates.length === 0) {
    throw new AppError('updates harus berupa array yang tidak kosong', 400)
  }

  const results = []

  for (const update of updates) {
    const { vehicleId, date, statusCode, notes } = update

    if (!vehicleId || !date || !statusCode) {
      results.push({
        vehicleId,
        date,
        success: false,
        message: 'vehicleId, date, dan statusCode harus diberikan',
      })
      continue
    }

    try {
      // Find or create
      const existing = await prisma.actualStatus.findFirst({
        where: {
          vehicleId,
          date: new Date(date),
        },
      })

      let result
      if (existing) {
        result = await prisma.actualStatus.update({
          where: { id: existing.id },
          data: {
            statusCode,
            notes,
            updatedBy: req.user!.id,
          },
        })
      } else {
        result = await prisma.actualStatus.create({
          data: {
            vehicleId,
            date: new Date(date),
            statusCode,
            notes,
            createdBy: req.user!.id,
          },
        })
      }

      results.push({
        vehicleId,
        date,
        success: true,
        data: result,
      })
    } catch (error) {
      results.push({
        vehicleId,
        date,
        success: false,
        message: (error as any).message,
      })
    }
  }

  const successfulCount = results.filter((r) => r.success).length
  const failedCount = results.filter((r) => !r.success).length

  res.json({
    success: failedCount === 0,
    message: 'Bulk update selesai',
    data: {
      total: results.length,
      successful: successfulCount,
      failed: failedCount,
      results,
    },
  } as ApiResponse<any>)
}
