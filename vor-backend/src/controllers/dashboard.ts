import { Response } from 'express'
import { AuthRequest, ApiResponse, AppError } from '../utils/types'
import prisma from '../config/prisma'
import { calculateDailyKPI } from '../services/kpi-engine'
import { getCabangFilter, getVehicleCabangFilter, getOptionalBranchFilter, getOptionalVehicleBranchFilter, getVehicleCabangOrBranchFilter, getVehicleTypeFilter, getVehicleRelationTypeFilter } from '../utils/cabangFilter'

export const getFleetOverview = async (req: AuthRequest, res: Response) => {
  const { date, startDate, endDate, branchId } = req.query

  let start: Date
  let end: Date

  if (startDate && endDate) {
    start = new Date(startDate as string)
    end = new Date(endDate as string)
    if (start > end) {
      throw new AppError('startDate harus lebih awal dari endDate', 400)
    }
  } else if (date) {
    const queryDate = new Date(date as string)
    start = new Date(queryDate)
    start.setHours(0, 0, 0, 0)
    end = new Date(queryDate)
    end.setHours(23, 59, 59, 999)
  } else {
    const latestStatus = await prisma.actualStatus.findFirst({
      orderBy: { date: 'desc' },
      select: { date: true },
    })
    const queryDate = latestStatus ? new Date(latestStatus.date) : new Date()
    start = new Date(queryDate)
    start.setHours(0, 0, 0, 0)
    end = new Date(queryDate)
    end.setHours(23, 59, 59, 999)
  }

  end.setHours(23, 59, 59, 999)

  const cabangFilter = getCabangFilter(req)
  const branchFilter = getOptionalBranchFilter(req, branchId as string | undefined)
  const vehicleCabangFilter = getVehicleCabangFilter(req)
  const vehicleBranchFilter = getOptionalVehicleBranchFilter(req, branchId as string | undefined)

  const totalVehicles = await prisma.vehicle.count({
    where: { isActive: true, ...cabangFilter, ...branchFilter, ...getVehicleTypeFilter(req) },
  })

  const actualStatuses = await prisma.actualStatus.findMany({
    where: {
      date: { gte: start, lte: end },
      ...vehicleCabangFilter,
      ...vehicleBranchFilter,
      ...getVehicleRelationTypeFilter(req),
    },
    include: { status: true },
  })

  const dailyMap = new Map<string, typeof actualStatuses>()
  const statusCounts = new Map<string, number>()

  actualStatuses.forEach((s) => {
    const key = s.date.toISOString().split('T')[0]
    if (!dailyMap.has(key)) dailyMap.set(key, [])
    dailyMap.get(key)!.push(s)

    const code = s.status?.code || 'UNKNOWN'
    statusCounts.set(code, (statusCounts.get(code) || 0) + 1)
  })

  let sumKPA = 0, sumUA = 0, sumPA = 0
  let dayCount = 0
  let totalOperational = 0, totalStandby = 0, totalBreakdown = 0, totalDelay = 0, totalOther = 0

  for (const [, dayStatuses] of dailyMap) {
    let available = 0, utilized = 0, productive = 0

    dayStatuses.forEach((s) => {
      if (s.status?.isPA) available++
      if (s.status?.isUA) utilized++
      if (s.status?.isProductivity) productive++

      const group = s.status?.groupStatus || 'UNKNOWN'
      if (group === 'UTILISASI') totalOperational++
      else if (group === 'READY FOR USE' || group === 'DNA') totalStandby++
      else if (group === 'BREAKDOWN') totalBreakdown++
      else if (group === 'DELAY') totalDelay++
      else totalOther++
    })

    const dayTotal = dayStatuses.length
    sumKPA += dayTotal > 0 ? (available / dayTotal) * 100 : 0
    sumUA += available > 0 ? (utilized / available) * 100 : 0
    sumPA += dayTotal > 0 ? (productive / dayTotal) * 100 : 0
    dayCount++
  }

  const avgKPA = dayCount > 0 ? sumKPA / dayCount : 0
  const avgUA = dayCount > 0 ? sumUA / dayCount : 0
  const avgPA = dayCount > 0 ? sumPA / dayCount : 0

  const totalRecords = actualStatuses.length
  const statusDistribution: { code: string; count: number; percentage: number }[] = []
  statusCounts.forEach((count, code) => {
    statusDistribution.push({
      code,
      count,
      percentage: totalRecords > 0 ? Math.round((count / totalRecords) * 10000) / 100 : 0,
    })
  })

  const unknownCount = totalVehicles - (dailyMap.size > 0 ? Math.max(...Array.from(dailyMap.values()).map(d => d.length)) : 0)

  res.json({
    success: true,
    message: 'Fleet overview berhasil diambil',
    data: {
      dateRange: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
      totalVehicles,
      summary: {
        KPA: {
          avg: Math.round(avgKPA * 100) / 100,
        },
        UA: {
          avg: Math.round(avgUA * 100) / 100,
        },
        PA: {
          avg: Math.round(avgPA * 100) / 100,
        },
      },
      operational: {
        count: totalOperational,
        percentage: totalRecords > 0 ? Math.round((totalOperational / totalRecords) * 10000) / 100 : 0,
      },
      standby: {
        count: totalStandby,
        percentage: totalRecords > 0 ? Math.round((totalStandby / totalRecords) * 10000) / 100 : 0,
      },
      breakdown: {
        count: totalBreakdown,
        percentage: totalRecords > 0 ? Math.round((totalBreakdown / totalRecords) * 10000) / 100 : 0,
      },
      delay: {
        count: totalDelay,
        percentage: totalRecords > 0 ? Math.round((totalDelay / totalRecords) * 10000) / 100 : 0,
      },
      other: {
        count: totalOther,
        percentage: totalRecords > 0 ? Math.round((totalOther / totalRecords) * 10000) / 100 : 0,
      },
      unknown: {
        count: unknownCount,
        percentage: totalVehicles > 0 ? Math.round((unknownCount / totalVehicles) * 100) : 0,
      },
      statusDistribution,
    },
  } as ApiResponse<any>)
}

export const getRevenueDashboard = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, branchId } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  const end = new Date(endDate as string)

  if (start > end) {
    throw new AppError('startDate harus lebih awal dari endDate', 400)
  }

  // Get revenue data
  const revenueBranchFilter = getVehicleCabangOrBranchFilter(req, branchId as string | undefined)
  const revenueData = await prisma.revenueData.findMany({
    where: {
      date: {
        gte: start,
        lte: end,
      },
      ...revenueBranchFilter,
      ...getVehicleRelationTypeFilter(req),
    },
    include: {
      vehicle: true,
    },
    orderBy: { date: 'asc' },
  })

  // Group by date for trend
  const trendMap = new Map<string, { revenue: number; expense: number; profit: number; trips: number }>()
  revenueData.forEach((r) => {
    const dateKey = r.date.toISOString().split('T')[0]
    if (!trendMap.has(dateKey)) {
      trendMap.set(dateKey, { revenue: 0, expense: 0, profit: 0, trips: 0 })
    }
    const day = trendMap.get(dateKey)!
    day.revenue += r.totalRevenue
    day.expense += r.fuelExpense + r.otherExpense
    day.profit += r.profit
    day.trips += r.tripCount
  })

  // Group by vehicle for top performers
  const vehicleMap = new Map<string, { vehicleId: string; nopol: string; vehicleType: string; trips: number; revenue: number; profit: number }>()
  revenueData.forEach((r) => {
    if (!vehicleMap.has(r.vehicleId)) {
      vehicleMap.set(r.vehicleId, {
        vehicleId: r.vehicleId,
        nopol: r.vehicle.nopol,
        vehicleType: r.vehicle.vehicleType || 'Unknown',
        trips: 0,
        revenue: 0,
        profit: 0,
      })
    }
    const vehicle = vehicleMap.get(r.vehicleId)!
    vehicle.trips += r.tripCount
    vehicle.revenue += r.totalRevenue
    vehicle.profit += r.profit
  })

  // Calculate PA/UA/Prod for each vehicle in the date range
  const vehicleBranchFilter2 = getOptionalVehicleBranchFilter(req, branchId as string | undefined)
  const vehicleOperationalStatus = await prisma.actualStatus.findMany({
    where: {
      vehicleId: { in: Array.from(vehicleMap.keys()) },
      date: { gte: start, lte: end },
      ...getVehicleCabangFilter(req),
      ...vehicleBranchFilter2,
      ...getVehicleRelationTypeFilter(req),
    },
    include: { status: true },
  })

  const vehicleStatusMap = new Map<string, { pa: boolean; ua: boolean; productive: boolean }[]>()
  vehicleOperationalStatus.forEach((status) => {
    if (!vehicleStatusMap.has(status.vehicleId)) {
      vehicleStatusMap.set(status.vehicleId, [])
    }
    vehicleStatusMap.get(status.vehicleId)!.push({
      pa: status.status?.isPA ?? false,
      ua: status.status?.isUA ?? false,
      productive: status.status?.isProductivity ?? false,
    })
  })

  const topPerformers = Array.from(vehicleMap.values())
    .map((vehicle) => {
      const statuses = vehicleStatusMap.get(vehicle.vehicleId) || []
      const totalStatuses = Math.max(statuses.length, 1)
      const paCount = statuses.filter((s) => s.pa).length
      const uaCount = statuses.filter((s) => s.ua).length
      const productiveCount = statuses.filter((s) => s.productive).length

      return {
        ...vehicle,
        pa: (paCount / totalStatuses) * 100,
        ua: paCount > 0 ? (uaCount / paCount) * 100 : 0,
        productive: (productiveCount / totalStatuses) * 100,
      }
    })
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10)

  const totals = {
    totalTrips: revenueData.reduce((sum, r) => sum + r.tripCount, 0),
    totalRevenue: revenueData.reduce((sum, r) => sum + r.totalRevenue, 0),
    totalExpense: revenueData.reduce((sum, r) => sum + r.fuelExpense + r.otherExpense, 0),
    totalProfit: revenueData.reduce((sum, r) => sum + r.profit, 0),
  }

  const avgDaily = {
    revenue: totals.totalRevenue / Math.max(trendMap.size, 1),
    expense: totals.totalExpense / Math.max(trendMap.size, 1),
    profit: totals.totalProfit / Math.max(trendMap.size, 1),
  }

  res.json({
    success: true,
    message: 'Revenue dashboard berhasil diambil',
    data: {
      dateRange: { startDate, endDate },
      totals,
      avgDaily: {
        revenue: Math.round(avgDaily.revenue * 100) / 100,
        expense: Math.round(avgDaily.expense * 100) / 100,
        profit: Math.round(avgDaily.profit * 100) / 100,
      },
      trend: Array.from(trendMap.entries()).map(([date, data]) => ({
        date,
        ...data,
      })),
      topPerformers,
    },
  } as ApiResponse<any>)
}

export const getKPIDashboard = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  const end = new Date(endDate as string)

  if (start > end) {
    throw new AppError('startDate harus lebih awal dari endDate', 400)
  }

  // Get daily KPIs from cache
  const cachedDailyKPIs = await prisma.dailyKPI.findMany({
    where: {
      date: {
        gte: start,
        lte: end,
      },
    },
    orderBy: { date: 'asc' },
  })

  const dailyKPIMap = new Map<string, any>()
  cachedDailyKPIs.forEach((kpi) => {
    dailyKPIMap.set(kpi.date.toISOString().split('T')[0], kpi)
  })

  const dailyDates: Date[] = []
  const dayIterator = new Date(start)
  while (dayIterator <= end) {
    dailyDates.push(new Date(dayIterator))
    dayIterator.setDate(dayIterator.getDate() + 1)
  }

  const dailyResults = await Promise.all(
    dailyDates.map(async (date) => {
      const key = date.toISOString().split('T')[0]
      const cached = dailyKPIMap.get(key)
      if (cached) {
        return cached
      }
      return calculateDailyKPI({ date })
    })
  )

  const avgKPA = dailyResults.length > 0 ? dailyResults.reduce((sum, k) => sum + k.KPA, 0) / dailyResults.length : 0
  const avgUA = dailyResults.length > 0 ? dailyResults.reduce((sum, k) => sum + k.UA, 0) / dailyResults.length : 0
  const avgPA = dailyResults.length > 0 ? dailyResults.reduce((sum, k) => sum + k.PA, 0) / dailyResults.length : 0

  const minKPA = dailyResults.length > 0 ? Math.min(...dailyResults.map((k) => k.KPA)) : 0
  const maxKPA = dailyResults.length > 0 ? Math.max(...dailyResults.map((k) => k.KPA)) : 0

  res.json({
    success: true,
    message: 'KPI dashboard berhasil diambil',
    data: {
      dateRange: { startDate, endDate },
      summary: {
        KPA: {
          avg: Math.round(avgKPA * 100) / 100,
          min: Math.round(minKPA * 100) / 100,
          max: Math.round(maxKPA * 100) / 100,
        },
        UA: {
          avg: Math.round(avgUA * 100) / 100,
          min: dailyResults.length > 0 ? Math.round(Math.min(...dailyResults.map((k) => k.UA)) * 100) / 100 : 0,
          max: dailyResults.length > 0 ? Math.round(Math.max(...dailyResults.map((k) => k.UA)) * 100) / 100 : 0,
        },
        PA: {
          avg: Math.round(avgPA * 100) / 100,
          min: dailyResults.length > 0 ? Math.round(Math.min(...dailyResults.map((k) => k.PA)) * 100) / 100 : 0,
          max: dailyResults.length > 0 ? Math.round(Math.max(...dailyResults.map((k) => k.PA)) * 100) / 100 : 0,
        },
      },
      trend: dailyResults.map((k) => ({
        date: k.date.toISOString().split('T')[0],
        KPA: k.KPA,
        UA: k.UA,
        PA: k.PA,
        available: k.availableCount,
        utilized: k.utilizedCount,
        productive: k.productiveCount,
      })),
      recordCount: dailyResults.length,
    },
  } as ApiResponse<any>)
}

export const getForecastAccuracyDashboard = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, branchId } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  const end = new Date(endDate as string)

  if (start > end) {
    throw new AppError('startDate harus lebih awal dari endDate', 400)
  }

  const deviationBranchFilter = getVehicleCabangOrBranchFilter(req, branchId as string | undefined)
  const deviations = await prisma.forecastDeviation.findMany({
    where: {
      date: {
        gte: start,
        lte: end,
      },
      ...deviationBranchFilter,
      ...getVehicleRelationTypeFilter(req),
    },
    include: {
      vehicle: true,
    },
    orderBy: { date: 'asc' },
  })

  // Group by vehicle
  const vehicleAccuracy = new Map<string, { nopol: string; total: number; accurate: number; accuracy: number }>()
  deviations.forEach((d) => {
    if (!vehicleAccuracy.has(d.vehicleId)) {
      vehicleAccuracy.set(d.vehicleId, { nopol: d.vehicle.nopol, total: 0, accurate: 0, accuracy: 0 })
    }
    const v = vehicleAccuracy.get(d.vehicleId)!
    v.total++
    if (!d.isDeviated) v.accurate++
    v.accuracy = Math.round((v.accurate / v.total) * 10000) / 100
  })

  // Trend by date
  const trendMap = new Map<string, { total: number; accurate: number }>()
  deviations.forEach((d) => {
    const dateKey = d.date.toISOString().split('T')[0]
    if (!trendMap.has(dateKey)) {
      trendMap.set(dateKey, { total: 0, accurate: 0 })
    }
    const day = trendMap.get(dateKey)!
    day.total++
    if (!d.isDeviated) day.accurate++
  })

  const totalRecords = deviations.length
  const totalAccurate = deviations.filter((d) => !d.isDeviated).length
  const overallAccuracy = totalRecords > 0 ? (totalAccurate / totalRecords) * 100 : 0

  res.json({
    success: true,
    message: 'Forecast accuracy dashboard berhasil diambil',
    data: {
      dateRange: { startDate, endDate },
      overall: {
        total: totalRecords,
        accurate: totalAccurate,
        deviated: totalRecords - totalAccurate,
        accuracy: Math.round(overallAccuracy * 100) / 100,
      },
      byVehicle: Array.from(vehicleAccuracy.values())
        .sort((a, b) => b.accuracy - a.accuracy)
        .slice(0, 10),
      trend: Array.from(trendMap.entries()).map(([date, data]) => ({
        date,
        total: data.total,
        accurate: data.accurate,
        accuracy: data.total > 0 ? Math.round((data.accurate / data.total) * 10000) / 100 : 0,
      })),
    },
  } as ApiResponse<any>)
}

export const getOperationalMetrics = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, branchId } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  const end = new Date(endDate as string)

  if (start > end) {
    throw new AppError('startDate harus lebih awal dari endDate', 400)
  }

  const opCabangFilter = getVehicleCabangFilter(req)
  const opBranchFilter = getOptionalVehicleBranchFilter(req, branchId as string | undefined)

  const totalRecords = await prisma.actualStatus.count({
    where: { date: { gte: start, lte: end }, ...opCabangFilter, ...opBranchFilter, ...getVehicleRelationTypeFilter(req) },
  })

  const grouped = await prisma.actualStatus.groupBy({
    by: ['statusCode'],
    where: { date: { gte: start, lte: end }, ...opCabangFilter, ...opBranchFilter, ...getVehicleRelationTypeFilter(req) },
    _count: true,
  })

  const statusDistribution = grouped.map((g) => ({
    code: g.statusCode,
    count: g._count,
    percentage: totalRecords > 0 ? Math.round((g._count / totalRecords) * 10000) / 100 : 0,
  })).sort((a, b) => b.count - a.count)

  res.json({
    success: true,
    message: 'Operational metrics berhasil diambil',
    data: {
      dateRange: { startDate, endDate },
      totalRecords,
      statusDistribution,
    },
  } as ApiResponse<any>)
}

export const getPerformanceByBranch = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, branchId } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  const end = new Date(endDate as string)
  if (start > end) {
    throw new AppError('startDate harus lebih awal dari endDate', 400)
  }

  end.setHours(23, 59, 59, 999)

  const branchWhere = branchId ? { id: branchId as string } : {}
  const branches = await prisma.branch.findMany({ where: branchWhere, orderBy: { name: 'asc' } })

  const result = await Promise.all(
    branches.map(async (branch) => {
      const vehicles = await prisma.vehicle.findMany({
        where: { isActive: true, branchId: branch.id, ...getVehicleTypeFilter(req) },
        select: { id: true },
      })

      const vehicleIds = vehicles.map((v) => v.id)
      if (vehicleIds.length === 0) {
        return { branchId: branch.id, branchName: branch.name, branchCode: branch.code, pa: 0, ua: 0, prod: 0, vehicleCount: 0 }
      }

      const statuses = await prisma.actualStatus.findMany({
        where: {
          vehicleId: { in: vehicleIds },
          date: { gte: start, lte: end },
        },
        include: { status: true },
      })

      // Group by day
      const dailyMap = new Map<string, { total: number; available: number; utilized: number; productive: number }>()
      for (const s of statuses) {
        const key = s.date.toISOString().split('T')[0]
        if (!dailyMap.has(key)) dailyMap.set(key, { total: 0, available: 0, utilized: 0, productive: 0 })
        const d = dailyMap.get(key)!
        d.total++
        if (s.status?.isPA) d.available++
        if (s.status?.isUA) d.utilized++
        if (s.status?.isProductivity) d.productive++
      }

      let sumPA = 0, sumUA = 0, sumProd = 0
      const dayCount = dailyMap.size

      for (const [, d] of dailyMap) {
        sumPA += d.total > 0 ? (d.available / d.total) * 100 : 0
        sumUA += d.available > 0 ? (d.utilized / d.available) * 100 : 0
        sumProd += d.total > 0 ? (d.productive / d.total) * 100 : 0
      }

      return {
        branchId: branch.id,
        branchName: branch.name,
        branchCode: branch.code,
        pa: dayCount > 0 ? Math.round((sumPA / dayCount) * 100) / 100 : 0,
        ua: dayCount > 0 ? Math.round((sumUA / dayCount) * 100) / 100 : 0,
        prod: dayCount > 0 ? Math.round((sumProd / dayCount) * 100) / 100 : 0,
        vehicleCount: vehicleIds.length,
      }
    })
  )

  res.json({
    success: true,
    data: result.filter((r) => r.vehicleCount > 0),
  } as ApiResponse<any>)
}

export const getGpsDashboardData = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, branchId } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  start.setHours(0, 0, 0, 0)
  const end = new Date(endDate as string)
  end.setHours(23, 59, 59, 999)

  const cabangFilter = getVehicleCabangOrBranchFilter(req, branchId as string | undefined)

  const records = await prisma.gpsTracking.findMany({
    where: {
      date: { gte: start, lte: end },
      ...cabangFilter,
      ...getVehicleRelationTypeFilter(req),
    },
    include: { vehicle: { select: { nopol: true, vehicleType: true } } },
    orderBy: { date: 'asc' },
  })

  // Summary
  const totalDistance = records.reduce((s, r) => s + r.totalDistance, 0)
  const totalDrivingTime = records.reduce((s, r) => s + r.drivingTime, 0)
  const totalMovingTime = records.reduce((s, r) => s + r.movingTime, 0)
  const totalParkingTime = records.reduce((s, r) => s + r.parkingTime, 0)
  const totalIdleTime = records.reduce((s, r) => s + r.idleTime, 0)
  const maxSpeeds = records.filter((r) => r.maxSpeed != null).map((r) => r.maxSpeed!)
  const avgMaxSpeed = maxSpeeds.length > 0 ? maxSpeeds.reduce((s, v) => s + v, 0) / maxSpeeds.length : 0
  const uniqueVehicleIds = new Set(records.map((r) => r.vehicleId))

  // Daily trend
  const dailyMap = new Map<string, { totalDistance: number; drivingTime: number; movingTime: number; parkingTime: number; idleTime: number; count: number }>()
  for (const r of records) {
    const key = r.date.toISOString().split('T')[0]
    const entry = dailyMap.get(key) || { totalDistance: 0, drivingTime: 0, movingTime: 0, parkingTime: 0, idleTime: 0, count: 0 }
    entry.totalDistance += r.totalDistance
    entry.drivingTime += r.drivingTime
    entry.movingTime += r.movingTime
    entry.parkingTime += r.parkingTime
    entry.idleTime += r.idleTime
    entry.count++
    dailyMap.set(key, entry)
  }

  // Fill missing dates with 0
  const trend: { date: string; totalDistance: number; avgDrivingTime: number; movingTime: number; parkingTime: number; idleTime: number; vehicleCount: number }[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    const key = cursor.toISOString().split('T')[0]
    const entry = dailyMap.get(key)
    trend.push({
      date: key,
      totalDistance: entry?.totalDistance ?? 0,
      avgDrivingTime: entry && entry.count > 0 ? Math.round(entry.drivingTime / entry.count) : 0,
      movingTime: entry?.movingTime ?? 0,
      parkingTime: entry?.parkingTime ?? 0,
      idleTime: entry?.idleTime ?? 0,
      vehicleCount: entry?.count ?? 0,
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  // Top 5 vehicles by total distance
  const vehicleMap = new Map<string, { nopol: string; vehicleType: string; totalDistance: number; totalDrivingTime: number; avgMaxSpeed: number; maxSpeedCount: number }>()
  for (const r of records) {
    const entry = vehicleMap.get(r.vehicleId) || {
      nopol: r.vehicle?.nopol || '',
      vehicleType: r.vehicle?.vehicleType || '',
      totalDistance: 0,
      totalDrivingTime: 0,
      avgMaxSpeed: 0,
      maxSpeedCount: 0,
    }
    entry.totalDistance += r.totalDistance
    entry.totalDrivingTime += r.drivingTime
    if (r.maxSpeed != null) {
      entry.avgMaxSpeed += r.maxSpeed
      entry.maxSpeedCount++
    }
    vehicleMap.set(r.vehicleId, entry)
  }

  const topVehicles = Array.from(vehicleMap.values())
    .map((v) => ({
      ...v,
      avgMaxSpeed: v.maxSpeedCount > 0 ? v.avgMaxSpeed / v.maxSpeedCount : 0,
    }))
    .sort((a, b) => b.totalDistance - a.totalDistance)
    .slice(0, 5)

  res.json({
    success: true,
    data: {
      summary: {
        totalDistance: Math.round(totalDistance * 100) / 100,
        totalDrivingTime,
        totalMovingTime,
        totalParkingTime,
        totalIdleTime,
        avgMaxSpeed: Math.round(avgMaxSpeed * 100) / 100,
        recordCount: records.length,
        vehicleCount: uniqueVehicleIds.size,
      },
      trend,
      topVehicles,
    },
  } as ApiResponse<any>)
}
