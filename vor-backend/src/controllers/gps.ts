import { Response } from 'express'
import { AuthRequest, ApiResponse, AppError } from '../utils/types'
import prisma from '../config/prisma'
import { z } from 'zod'
import { getVehicleCabangOrBranchFilter } from '../utils/cabangFilter'
import { fetchLastPosition } from '../services/gps-integration'

const createGpsSchema = z.object({
  vehicleId: z.string().min(1),
  date: z.string(),
  totalDistance: z.number().min(0),
  drivingTime: z.number().int().min(0),
  movingTime: z.number().int().min(0),
  parkingTime: z.number().int().min(0),
  idleTime: z.number().int().min(0),
  maxSpeed: z.number().min(0).nullable().optional(),
  ratioSpeed: z.number().nullable().optional(),
})

const updateGpsSchema = z.object({
  totalDistance: z.number().min(0).optional(),
  drivingTime: z.number().int().min(0).optional(),
  movingTime: z.number().int().min(0).optional(),
  parkingTime: z.number().int().min(0).optional(),
  idleTime: z.number().int().min(0).optional(),
  maxSpeed: z.number().min(0).nullable().optional(),
  ratioSpeed: z.number().nullable().optional(),
})

export const createGpsTracking = async (req: AuthRequest, res: Response) => {
  const parsed = createGpsSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Validasi gagal', error: parsed.error.issues })
  }
  const body = parsed.data
  const dateObj = new Date(body.date)
  dateObj.setHours(0, 0, 0, 0)

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: body.vehicleId },
  })
  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: `Vehicle dengan ID ${body.vehicleId} tidak ditemukan.`,
    })
  }

  const existing = await prisma.gpsTracking.findFirst({
    where: { vehicleId: body.vehicleId, date: dateObj },
  })
  if (existing) {
    throw new AppError('Data GPS sudah ada untuk vehicle dan tanggal ini', 409)
  }

  const gpsData = await prisma.gpsTracking.create({
    data: {
      vehicleId: body.vehicleId,
      date: dateObj,
      totalDistance: body.totalDistance,
      drivingTime: body.drivingTime,
      movingTime: body.movingTime,
      parkingTime: body.parkingTime,
      idleTime: body.idleTime,
      maxSpeed: body.maxSpeed ?? null,
      ratioSpeed: body.ratioSpeed ?? null,
    },
    include: { vehicle: true },
  })

  res.status(201).json({
    success: true,
    message: 'Data GPS berhasil ditambahkan',
    data: gpsData,
  } as ApiResponse<any>)
}

export const updateGpsTracking = async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const parsed = updateGpsSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Validasi gagal', error: parsed.error.issues })
  }
  const body = parsed.data

  const existing = await prisma.gpsTracking.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError('Data GPS tidak ditemukan', 404)
  }

  const updated = await prisma.gpsTracking.update({
    where: { id },
    data: {
      totalDistance: body.totalDistance,
      drivingTime: body.drivingTime,
      movingTime: body.movingTime,
      parkingTime: body.parkingTime,
      idleTime: body.idleTime,
      maxSpeed: body.maxSpeed,
      ratioSpeed: body.ratioSpeed,
    },
    include: { vehicle: true },
  })

  res.json({
    success: true,
    message: 'Data GPS berhasil diperbarui',
    data: updated,
  } as ApiResponse<any>)
}

export const getGpsTrackingByVehicleAndDate = async (req: AuthRequest, res: Response) => {
  const { vehicleId } = req.params
  const { startDate, endDate } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  start.setHours(0, 0, 0, 0)
  const end = new Date(endDate as string)
  end.setHours(23, 59, 59, 999)

  if (start > end) {
    throw new AppError('startDate harus lebih awal dari endDate', 400)
  }

  const gpsData = await prisma.gpsTracking.findMany({
    where: {
      vehicleId,
      date: { gte: start, lte: end },
    },
    include: { vehicle: true },
    orderBy: { date: 'asc' },
  })

  const totals = {
    totalDistance: gpsData.reduce((s, r) => s + r.totalDistance, 0),
    drivingTime: gpsData.reduce((s, r) => s + r.drivingTime, 0),
    movingTime: gpsData.reduce((s, r) => s + r.movingTime, 0),
    parkingTime: gpsData.reduce((s, r) => s + r.parkingTime, 0),
    idleTime: gpsData.reduce((s, r) => s + r.idleTime, 0),
  }

  res.json({
    success: true,
    message: 'Data GPS berhasil diambil',
    data: { records: gpsData, totals, count: gpsData.length },
  } as ApiResponse<any>)
}

export const getGpsTrackingByDate = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, branchId, nopol } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  if (isNaN(start.getTime())) throw new AppError('Format startDate tidak valid', 400)
  start.setHours(0, 0, 0, 0)

  const end = new Date(endDate as string)
  if (isNaN(end.getTime())) throw new AppError('Format endDate tidak valid', 400)
  end.setHours(23, 59, 59, 999)

  if (start > end) throw new AppError('startDate harus lebih awal dari endDate', 400)

  const cabangFilter = getVehicleCabangOrBranchFilter(req, branchId as string | undefined)

  const gpsData = await prisma.gpsTracking.findMany({
    where: {
      date: { gte: start, lte: end },
      ...(nopol ? { vehicle: { nopol: { contains: nopol as string, mode: 'insensitive' } } } : {}),
      ...cabangFilter,
    },
    include: { vehicle: true },
    orderBy: { vehicle: { nopol: 'asc' } },
  })

  const totals = {
    totalDistance: gpsData.reduce((s, r) => s + r.totalDistance, 0),
    drivingTime: gpsData.reduce((s, r) => s + r.drivingTime, 0),
    movingTime: gpsData.reduce((s, r) => s + r.movingTime, 0),
    parkingTime: gpsData.reduce((s, r) => s + r.parkingTime, 0),
    idleTime: gpsData.reduce((s, r) => s + r.idleTime, 0),
    recordCount: gpsData.length,
    vehicleCount: new Set(gpsData.map((r) => r.vehicleId)).size,
  }

  res.json({
    success: true,
    message: 'Data GPS berhasil diambil',
    data: { records: gpsData, totals },
  } as ApiResponse<any>)
}

export const getGpsTrackingById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  const gpsData = await prisma.gpsTracking.findUnique({
    where: { id },
    include: { vehicle: true },
  })

  if (!gpsData) {
    throw new AppError('Data GPS tidak ditemukan', 404)
  }

  res.json({
    success: true,
    message: 'Data GPS berhasil diambil',
    data: gpsData,
  } as ApiResponse<any>)
}

// Riwayat sinkronisasi GPS (ADMIN)
export const getGpsSyncLogs = async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Hanya ADMIN yang dapat melihat riwayat sync' })
  }
  const logs = await prisma.gpsSyncLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
  res.json({ success: true, message: 'Riwayat sync GPS berhasil diambil', data: logs } as ApiResponse<any>)
}

// Live tracking: ambil posisi terakhir 1 unit dari EasyGo (proxy, token tetap di server)
export const getLivePosition = async (req: AuthRequest, res: Response) => {
  const { vehicleId } = req.params

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } })
  if (!vehicle) {
    throw new AppError('Kendaraan tidak ditemukan', 404)
  }
  if (!vehicle.vhcId) {
    throw new AppError('Kendaraan belum memiliki VHCID (Vehicle ID EasyGo). Isi VHCID di master data terlebih dahulu.', 422)
  }

  const pos = await fetchLastPosition(vehicle.vhcId)
  if (typeof pos?.latitude !== 'number' || typeof pos?.longitude !== 'number') {
    throw new AppError('Posisi terakhir tidak tersedia dari EasyGo untuk unit ini.', 502)
  }

  res.json({
    success: true,
    message: 'Posisi terakhir berhasil diambil',
    data: {
      vehicleId: vehicle.id,
      nopol: vehicle.nopol,
      vhcId: vehicle.vhcId,
      latitude: pos.latitude,
      longitude: pos.longitude,
      lastUpdate: pos.lastupdate,
    },
  } as ApiResponse<any>)
}

export const deleteGpsTracking = async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  const existing = await prisma.gpsTracking.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError('Data GPS tidak ditemukan', 404)
  }

  await prisma.gpsTracking.delete({ where: { id } })

  res.json({
    success: true,
    message: 'Data GPS berhasil dihapus',
  } as ApiResponse<any>)
}

export const bulkUpdateGpsTracking = async (req: AuthRequest, res: Response) => {
  const { updates } = req.body

  if (!Array.isArray(updates) || updates.length === 0) {
    throw new AppError('updates harus berupa array yang tidak kosong', 400)
  }

  const results = []

  for (const update of updates) {
    const { vehicleId, date, totalDistance, drivingTime, movingTime, parkingTime, idleTime, maxSpeed, ratioSpeed } = update

    if (!vehicleId || !date || totalDistance === undefined || drivingTime === undefined || movingTime === undefined || parkingTime === undefined || idleTime === undefined) {
      results.push({
        vehicleId,
        date,
        success: false,
        message: 'vehicleId, date, totalDistance, drivingTime, movingTime, parkingTime, dan idleTime harus diberikan',
      })
      continue
    }

    try {
      const dateObj = new Date(date)
      dateObj.setHours(0, 0, 0, 0)

      const existing = await prisma.gpsTracking.findFirst({
        where: { vehicleId, date: dateObj },
      })

      let result
      if (existing) {
        result = await prisma.gpsTracking.update({
          where: { id: existing.id },
          data: { totalDistance, drivingTime, movingTime, parkingTime, idleTime, maxSpeed, ratioSpeed },
        })
      } else {
        result = await prisma.gpsTracking.create({
          data: {
            vehicleId,
            date: dateObj,
            totalDistance,
            drivingTime,
            movingTime,
            parkingTime,
            idleTime,
            maxSpeed: maxSpeed ?? null,
            ratioSpeed: ratioSpeed ?? null,
          },
        })
      }

      results.push({ vehicleId, date, success: true, data: result })
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
    message: 'Bulk update GPS selesai',
    data: {
      total: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    },
  } as ApiResponse<any>)
}
