import { Response } from 'express'
import { AuthRequest, ApiResponse, AppError } from '../utils/types'
import prisma from '../config/prisma'
import { z } from 'zod'
import { getVehicleCabangFilter, getVehicleRelationTypeFilter } from '../utils/cabangFilter'

const createForecastStatusSchema = z.object({
  vehicleId: z.string(),
  date: z.string().datetime(),
  statusCode: z.string(),
  confidence: z.number().min(0).max(100).optional().default(50),
  notes: z.string().optional(),
})

const updateForecastStatusSchema = z.object({
  statusCode: z.string(),
  confidence: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
})

export const createForecastStatus = async (req: AuthRequest, res: Response) => {
  const body = createForecastStatusSchema.parse(req.body)

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
  const existingStatus = await prisma.forecastStatus.findFirst({
    where: {
      vehicleId: body.vehicleId,
      date: new Date(body.date),
    },
  })

  if (existingStatus) {
    throw new AppError('Forecast status sudah ada untuk vehicle dan tanggal ini', 409)
  }

  const forecastStatus = await prisma.forecastStatus.create({
    data: {
      vehicleId: body.vehicleId,
      date: new Date(body.date),
      statusCode: body.statusCode,
      confidence: body.confidence,
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
    message: 'Forecast status berhasil dibuat',
    data: forecastStatus,
  } as ApiResponse<any>)
}

export const updateForecastStatus = async (
  req: AuthRequest,
  res: Response
) => {
  const { id } = req.params
  const body = updateForecastStatusSchema.parse(req.body)

  // Check if status code exists
  const masterStatus = await prisma.masterStatus.findUnique({
    where: { code: body.statusCode },
  })

  if (!masterStatus) {
    throw new AppError('Status code tidak ditemukan', 404)
  }

  const forecastStatus = await prisma.forecastStatus.findUnique({
    where: { id },
  })

  if (!forecastStatus) {
    throw new AppError('Forecast status tidak ditemukan', 404)
  }

  const updated = await prisma.forecastStatus.update({
    where: { id },
    data: {
      statusCode: body.statusCode,
      confidence: body.confidence,
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
    message: 'Forecast status berhasil diperbarui',
    data: updated,
  } as ApiResponse<any>)
}

export const getForecastStatusByDate = async (
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

  const statuses = await prisma.forecastStatus.findMany({
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
    message: 'Data forecast status berhasil diambil',
    data: statuses,
  } as ApiResponse<any>)
}

export const getForecastStatusByVehicleAndDateRange = async (
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

  const statuses = await prisma.forecastStatus.findMany({
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
    message: 'Data forecast status berhasil diambil',
    data: statuses,
  } as ApiResponse<any>)
}

export const getForecastStatusById = async (
  req: AuthRequest,
  res: Response
) => {
  const { id } = req.params

  const forecastStatus = await prisma.forecastStatus.findUnique({
    where: { id },
    include: {
      vehicle: true,
      status: true,
    },
  })

  if (!forecastStatus) {
    throw new AppError('Forecast status tidak ditemukan', 404)
  }

  res.json({
    success: true,
    message: 'Data forecast status berhasil diambil',
    data: forecastStatus,
  } as ApiResponse<any>)
}

export const deleteForecastStatus = async (
  req: AuthRequest,
  res: Response
) => {
  const { id } = req.params

  const forecastStatus = await prisma.forecastStatus.findUnique({
    where: { id },
  })

  if (!forecastStatus) {
    throw new AppError('Forecast status tidak ditemukan', 404)
  }

  await prisma.forecastStatus.delete({
    where: { id },
  })

  res.json({
    success: true,
    message: 'Forecast status berhasil dihapus',
  } as ApiResponse<any>)
}

// Bulk update forecast
export const bulkUpdateForecastStatus = async (
  req: AuthRequest,
  res: Response
) => {
  const { updates } = req.body

  if (!Array.isArray(updates) || updates.length === 0) {
    throw new AppError('updates harus berupa array yang tidak kosong', 400)
  }

  const results = []

  for (const update of updates) {
    const { vehicleId, date, statusCode, confidence = 50, notes } = update

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
      const existing = await prisma.forecastStatus.findFirst({
        where: {
          vehicleId,
          date: new Date(date),
        },
      })

      let result
      if (existing) {
        result = await prisma.forecastStatus.update({
          where: { id: existing.id },
          data: {
            statusCode,
            confidence,
            notes,
            updatedBy: req.user!.id,
          },
        })
      } else {
        result = await prisma.forecastStatus.create({
          data: {
            vehicleId,
            date: new Date(date),
            statusCode,
            confidence,
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

  res.json({
    success: true,
    message: 'Bulk update forecast selesai',
    data: {
      total: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    },
  } as ApiResponse<any>)
}
