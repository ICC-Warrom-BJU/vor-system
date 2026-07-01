import { Response } from 'express'
import { AuthRequest, ApiResponse, AppError } from '../utils/types'
import prisma from '../config/prisma'
import { z } from 'zod'

const createForecastDeviationSchema = z.object({
  vehicleId: z.string(),
  date: z.string().datetime(),
  forecastStatusCode: z.string(),
  actualStatusCode: z.string(),
  deviationNotes: z.string().optional(),
})

export const recordForecastDeviation = async (
  req: AuthRequest,
  res: Response
) => {
  const body = createForecastDeviationSchema.parse(req.body)

  // Check if vehicle exists
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: body.vehicleId },
  })

  if (!vehicle) {
    throw new AppError('Vehicle tidak ditemukan', 404)
  }

  // Check if both status codes exist
  const forecastStatus = await prisma.masterStatus.findUnique({
    where: { code: body.forecastStatusCode },
  })

  const actualStatus = await prisma.masterStatus.findUnique({
    where: { code: body.actualStatusCode },
  })

  if (!forecastStatus || !actualStatus) {
    throw new AppError('Status code tidak valid', 404)
  }

  // Check if already recorded
  const existing = await prisma.forecastDeviation.findFirst({
    where: {
      vehicleId: body.vehicleId,
      date: new Date(body.date),
    },
  })

  if (existing) {
    throw new AppError('Deviation sudah tercatat untuk vehicle dan tanggal ini', 409)
  }

  // Determine if it's a deviation (different from forecast)
  const isDeviated = body.forecastStatusCode !== body.actualStatusCode
  const accuracy = isDeviated ? 0 : 100

  const deviation = await prisma.forecastDeviation.create({
    data: {
      vehicleId: body.vehicleId,
      date: new Date(body.date),
      forecastStatusCode: body.forecastStatusCode,
      actualStatusCode: body.actualStatusCode,
      isDeviated,
      accuracy,
      deviationNotes: body.deviationNotes,
      recordedBy: req.user!.id,
    },
    include: {
      vehicle: true,
      forecastStatus: true,
      actualStatus: true,
    },
  })

  res.status(201).json({
    success: true,
    message: 'Forecast deviation berhasil dicatat',
    data: deviation,
  } as ApiResponse<any>)
}

export const getForecastDeviationByVehicleAndDate = async (
  req: AuthRequest,
  res: Response
) => {
  const { vehicleId } = req.params
  const { startDate, endDate } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  const end = new Date(endDate as string)

  if (start > end) {
    throw new AppError('startDate harus lebih awal dari endDate', 400)
  }

  const deviations = await prisma.forecastDeviation.findMany({
    where: {
      vehicleId,
      date: {
        gte: start,
        lte: end,
      },
    },
    include: {
      vehicle: true,
      forecastStatus: true,
      actualStatus: true,
    },
    orderBy: { date: 'asc' },
  })

  // Calculate accuracy
  const totalRecords = deviations.length
  const accurateRecords = deviations.filter((d) => !d.isDeviated).length
  const accuracy = totalRecords > 0 ? (accurateRecords / totalRecords) * 100 : 0

  res.json({
    success: true,
    message: 'Forecast deviation berhasil diambil',
    data: {
      records: deviations,
      summary: {
        totalRecords,
        accurateRecords,
        deviatedRecords: totalRecords - accurateRecords,
        accuracy: Math.round(accuracy * 100) / 100,
      },
    },
  } as ApiResponse<any>)
}

export const getForecastDeviationById = async (
  req: AuthRequest,
  res: Response
) => {
  const { id } = req.params

  const deviation = await prisma.forecastDeviation.findUnique({
    where: { id },
    include: {
      vehicle: true,
      forecastStatus: true,
      actualStatus: true,
    },
  })

  if (!deviation) {
    throw new AppError('Forecast deviation tidak ditemukan', 404)
  }

  res.json({
    success: true,
    message: 'Forecast deviation berhasil diambil',
    data: deviation,
  } as ApiResponse<any>)
}

// Get accuracy report
export const getAccuracyReport = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  const end = new Date(endDate as string)

  if (start > end) {
    throw new AppError('startDate harus lebih awal dari endDate', 400)
  }

  const deviations = await prisma.forecastDeviation.findMany({
    where: {
      date: {
        gte: start,
        lte: end,
      },
    },
    include: {
      vehicle: true,
    },
  })

  // Group by vehicle
  const byVehicle = new Map()
  deviations.forEach((d) => {
    if (!byVehicle.has(d.vehicleId)) {
      byVehicle.set(d.vehicleId, {
        vehicleId: d.vehicleId,
        nopol: d.vehicle.nopol,
        total: 0,
        accurate: 0,
        deviated: 0,
        accuracy: 0,
      })
    }
    const vehicle = byVehicle.get(d.vehicleId)
    vehicle.total++
    if (!d.isDeviated) {
      vehicle.accurate++
    } else {
      vehicle.deviated++
    }
    vehicle.accuracy = Math.round((vehicle.accurate / vehicle.total) * 10000) / 100
  })

  // Calculate overall
  const totalRecords = deviations.length
  const accurateRecords = deviations.filter((d) => !d.isDeviated).length
  const overallAccuracy = totalRecords > 0 ? (accurateRecords / totalRecords) * 100 : 0

  res.json({
    success: true,
    message: 'Accuracy report berhasil dihitung',
    data: {
      overall: {
        totalRecords,
        accurateRecords,
        deviatedRecords: totalRecords - accurateRecords,
        accuracy: Math.round(overallAccuracy * 100) / 100,
      },
      byVehicle: Array.from(byVehicle.values()),
      dateRange: {
        startDate,
        endDate,
      },
    },
  } as ApiResponse<any>)
}
