import { Response } from 'express'
import { AuthRequest, ApiResponse, AppError } from '../utils/types'
import prisma from '../config/prisma'
import { z } from 'zod'
import { getVehicleCabangFilter, getCabangFilter } from '../utils/cabangFilter'

const createRevenueDataSchema = z.object({
  vehicleId: z.string(),
  date: z.string(), // Diubah agar lebih fleksibel menerima format YYYY-MM-DD atau ISO
  tripCount: z.number().min(0),
  totalRevenue: z.number().min(0),
  fuelExpense: z.number().min(0),
  otherExpense: z.number().optional().default(0),
  notes: z.string().optional(),
})

const updateRevenueDataSchema = z.object({
  tripCount: z.number().min(0).optional(),
  totalRevenue: z.number().min(0).optional(),
  fuelExpense: z.number().min(0).optional(),
  otherExpense: z.number().min(0).optional(),
  notes: z.string().optional(),
})

export const createRevenueData = async (req: AuthRequest, res: Response) => {
  const body = createRevenueDataSchema.parse(req.body)

  // Pastikan tanggal dinormalisasi ke awal hari untuk menghindari masalah jam/menit
  const dateObj = new Date(body.date)
  dateObj.setHours(0, 0, 0, 0)

  // Check if vehicle exists
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: body.vehicleId },
  })

  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: `Vehicle dengan ID ${body.vehicleId} tidak ditemukan. Pastikan data kendaraan sudah ada di master data.`
    })
  }

  // Check if already exists for this vehicle and date
  const existing = await prisma.revenueData.findFirst({
    where: {
      vehicleId: body.vehicleId,
      date: dateObj,
    },
  })

  if (existing) {
    throw new AppError('Revenue data sudah ada untuk vehicle dan tanggal ini', 409)
  }

  // Calculate profit
  const totalExpense = body.fuelExpense + (body.otherExpense || 0)
  const profit = body.totalRevenue - totalExpense

  const revenueData = await prisma.revenueData.create({
    data: {
      vehicleId: body.vehicleId,
      date: dateObj,
      tripCount: body.tripCount,
      totalRevenue: body.totalRevenue,
      fuelExpense: body.fuelExpense,
      otherExpense: body.otherExpense || 0,
      profit,
      notes: body.notes,
      recordedBy: req.user!.id,
    },
    include: {
      vehicle: true,
    },
  })

  res.status(201).json({
    success: true,
    message: 'Revenue data berhasil dibuat',
    data: revenueData,
  } as ApiResponse<any>)
}

export const updateRevenueData = async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const body = updateRevenueDataSchema.parse(req.body)

  const revenueData = await prisma.revenueData.findUnique({
    where: { id },
  })

  if (!revenueData) {
    throw new AppError('Revenue data tidak ditemukan', 404)
  }

  // Calculate new profit
  const totalRevenue = body.totalRevenue ?? revenueData.totalRevenue
  const fuelExpense = body.fuelExpense ?? revenueData.fuelExpense
  const otherExpense = body.otherExpense ?? revenueData.otherExpense
  const totalExpense = fuelExpense + otherExpense
  const profit = totalRevenue - totalExpense

  const updated = await prisma.revenueData.update({
    where: { id },
    data: {
      tripCount: body.tripCount,
      totalRevenue,
      fuelExpense,
      otherExpense,
      profit,
      notes: body.notes,
      recordedBy: req.user!.id,
    },
    include: {
      vehicle: true,
    },
  })

  res.json({
    success: true,
    message: 'Revenue data berhasil diperbarui',
    data: updated,
  } as ApiResponse<any>)
}

export const getRevenueDataByVehicleAndDate = async (
  req: AuthRequest,
  res: Response
) => {
  const { vehicleId } = req.params
  const { startDate, endDate } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate as string);
  end.setHours(23, 59, 59, 999);

  if (start > end) {
    throw new AppError('startDate harus lebih awal dari endDate', 400)
  }

  const cabangFilter = getVehicleCabangFilter(req)

  const revenueData = await prisma.revenueData.findMany({
    where: {
      vehicleId,
      date: {
        gte: start,
        lte: end,
      },
      ...cabangFilter,
    },
    include: {
      vehicle: true,
    },
    orderBy: { date: 'asc' },
  })

  // Calculate totals
  const totals = {
    tripCount: revenueData.reduce((sum, r) => sum + r.tripCount, 0),
    totalRevenue: revenueData.reduce((sum, r) => sum + r.totalRevenue, 0),
    fuelExpense: revenueData.reduce((sum, r) => sum + r.fuelExpense, 0),
    otherExpense: revenueData.reduce((sum, r) => sum + r.otherExpense, 0),
    profit: revenueData.reduce((sum, r) => sum + r.profit, 0),
  }

  res.json({
    success: true,
    message: 'Revenue data berhasil diambil',
    data: {
      records: revenueData,
      totals,
      count: revenueData.length,
    },
  } as ApiResponse<any>)
}

export const getRevenueDataByDate = async (
  req: AuthRequest,
  res: Response
) => {
  const { startDate, endDate } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  if (isNaN(start.getTime())) {
    throw new AppError('Format startDate tidak valid', 400)
  }
  start.setHours(0, 0, 0, 0)

  const end = new Date(endDate as string)
  if (isNaN(end.getTime())) {
    throw new AppError('Format endDate tidak valid', 400)
  }
  end.setHours(23, 59, 59, 999)

  if (start > end) {
    throw new AppError('startDate harus lebih awal dari endDate', 400)
  }

  const cabangFilter = getVehicleCabangFilter(req)

  const revenueData = await prisma.revenueData.findMany({
    where: {
      date: {
        gte: start,
        lte: end,
      },
      ...cabangFilter,
    },
    include: {
      vehicle: true,
    },
    orderBy: { vehicle: { nopol: 'asc' } },
  })

  // Calculate totals
  const totals = {
    totalTrips: revenueData.reduce((sum, r) => sum + r.tripCount, 0),
    totalRevenue: revenueData.reduce((sum, r) => sum + r.totalRevenue, 0),
    totalFuelExpense: revenueData.reduce((sum, r) => sum + r.fuelExpense, 0),
    totalOtherExpense: revenueData.reduce((sum, r) => sum + r.otherExpense, 0),
    totalProfit: revenueData.reduce((sum, r) => sum + r.profit, 0),
  }

  // Target vs Actual per vehicle
  const revenueByVehicle = new Map<string, number>()
  for (const record of revenueData) {
    const current = revenueByVehicle.get(record.vehicleId) || 0
    revenueByVehicle.set(record.vehicleId, current + record.totalRevenue)
  }

  const vehicles = await prisma.vehicle.findMany({
    where: { isActive: true, ...getCabangFilter(req) },
    select: { id: true, nopol: true, vehicleType: true, targetRevenue: true },
    orderBy: { nopol: 'asc' },
  })

  const budgetComparison = vehicles.map(v => {
    const actualRevenue = revenueByVehicle.get(v.id) || 0
    const target = v.targetRevenue || 0
    const percentage = target > 0 ? Math.round((actualRevenue / target) * 10000) / 100 : 0
    return {
      vehicleId: v.id,
      nopol: v.nopol,
      vehicleType: v.vehicleType,
      monthlyTarget: target,
      actualRevenue,
      percentage,
    }
  })

  res.json({
    success: true,
    message: 'Revenue data berhasil diambil',
    data: {
      records: revenueData,
      totals,
      budgetComparison,
      count: revenueData.length,
    },
  } as ApiResponse<any>)
}

export const getRevenueDataById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  const revenueData = await prisma.revenueData.findUnique({
    where: { id },
    include: {
      vehicle: true,
    },
  })

  if (!revenueData) {
    throw new AppError('Revenue data tidak ditemukan', 404)
  }

  res.json({
    success: true,
    message: 'Revenue data berhasil diambil',
    data: revenueData,
  } as ApiResponse<any>)
}

export const deleteRevenueData = async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  const revenueData = await prisma.revenueData.findUnique({
    where: { id },
  })

  if (!revenueData) {
    throw new AppError('Revenue data tidak ditemukan', 404)
  }

  await prisma.revenueData.delete({
    where: { id },
  })

  res.json({
    success: true,
    message: 'Revenue data berhasil dihapus',
  } as ApiResponse<any>)
}

// Bulk create/update revenue data
export const bulkUpdateRevenueData = async (
  req: AuthRequest,
  res: Response
) => {
  const { updates } = req.body

  if (!Array.isArray(updates) || updates.length === 0) {
    throw new AppError('updates harus berupa array yang tidak kosong', 400)
  }

  const results = []

  for (const update of updates) {
    const { vehicleId, date, tripCount, totalRevenue, fuelExpense, otherExpense = 0, notes } = update

    if (!vehicleId || !date || tripCount === undefined || totalRevenue === undefined || fuelExpense === undefined) {
      results.push({
        vehicleId,
        date,
        success: false,
        message: 'vehicleId, date, tripCount, totalRevenue, dan fuelExpense harus diberikan',
      })
      continue
    }

    try {
      const dateObj = new Date(date)
      dateObj.setHours(0, 0, 0, 0)

      const profit = totalRevenue - (fuelExpense + otherExpense)
      
      const existing = await prisma.revenueData.findFirst({
        where: {
          vehicleId,
          date: dateObj,
        },
      })

      let result
      if (existing) {
        result = await prisma.revenueData.update({
          where: { id: existing.id },
          data: {
            tripCount,
            totalRevenue,
            fuelExpense,
            otherExpense,
            profit,
            notes,
            recordedBy: req.user!.id,
          },
        })
      } else {
        result = await prisma.revenueData.create({
          data: {
            vehicleId,
            date: dateObj,
            tripCount,
            totalRevenue,
            fuelExpense,
            otherExpense,
            profit,
            notes,
            recordedBy: req.user!.id,
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
    message: 'Bulk update revenue selesai',
    data: {
      total: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    },
  } as ApiResponse<any>)
}

// Get revenue summary
export const getRevenueSummary = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  const end = new Date(endDate as string)

  if (start > end) {
    throw new AppError('startDate harus lebih awal dari endDate', 400)
  }

  const cabangFilter = getVehicleCabangFilter(req)

  const revenueData = await prisma.revenueData.findMany({
    where: {
      date: {
        gte: start,
        lte: end,
      },
      ...cabangFilter,
    },
    include: {
      vehicle: true,
    },
  })

  // Calculate summary
  const summary = {
    totalTrips: revenueData.reduce((sum, r) => sum + r.tripCount, 0),
    totalRevenue: revenueData.reduce((sum, r) => sum + r.totalRevenue, 0),
    totalFuelExpense: revenueData.reduce((sum, r) => sum + r.fuelExpense, 0),
    totalOtherExpense: revenueData.reduce((sum, r) => sum + r.otherExpense, 0),
    totalProfit: revenueData.reduce((sum, r) => sum + r.profit, 0),
    avgRevenuePerTrip: 0,
    avgProfitPerTrip: 0,
    count: revenueData.length,
  }

  if (summary.totalTrips > 0) {
    summary.avgRevenuePerTrip = Math.round((summary.totalRevenue / summary.totalTrips) * 100) / 100
    summary.avgProfitPerTrip = Math.round((summary.totalProfit / summary.totalTrips) * 100) / 100
  }

  res.json({
    success: true,
    message: 'Revenue summary berhasil dihitung',
    data: summary,
  } as ApiResponse<any>)
}
