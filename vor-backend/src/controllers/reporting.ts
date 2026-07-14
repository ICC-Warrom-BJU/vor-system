import { Response } from 'express'
import { AuthRequest, ApiResponse, AppError } from '../utils/types'
import prisma from '../config/prisma'
import { getCabangFilter, getOptionalBranchFilter, getVehicleCabangFilter, getVehicleTypeFilter, getVehicleRelationTypeFilter } from '../utils/cabangFilter'

export const getVehiclePerformanceReport = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, sortBy = 'profit', vehicleType, branchId } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  const end = new Date(endDate as string)

  if (start > end) {
    throw new AppError('startDate harus lebih awal dari endDate', 400)
  }

  const vehicleWhere: any = { isActive: true, ...getCabangFilter(req), ...getVehicleTypeFilter(req) }
  if (vehicleType) vehicleWhere.vehicleType = vehicleType
  if (branchId) vehicleWhere.branchId = branchId

  const vehicles = await prisma.vehicle.findMany({
    where: vehicleWhere,
    include: { driver: true },
  })

  const reportData = await Promise.all(
    vehicles.map(async (vehicle) => {
      // Get revenue data
      const revenue = await prisma.revenueData.findMany({
        where: {
          vehicleId: vehicle.id,
          date: { gte: start, lte: end },
        },
      })

      const actualStatuses = await prisma.actualStatus.findMany({
        where: {
          vehicleId: vehicle.id,
          date: { gte: start, lte: end },
        },
        include: { status: true },
      })

      // Get forecast deviation
      const deviation = await prisma.forecastDeviation.findMany({
        where: {
          vehicleId: vehicle.id,
          date: { gte: start, lte: end },
        },
      })

      const totalTrips = revenue.reduce((sum, r) => sum + r.tripCount, 0)
      const totalRevenue = revenue.reduce((sum, r) => sum + r.totalRevenue, 0)
      const totalBop = revenue.reduce((sum, r) => sum + r.fuelExpense, 0)
      const totalOther = revenue.reduce((sum, r) => sum + r.otherExpense, 0)
      const totalExpense = totalBop + totalOther
      const totalProfit = revenue.reduce((sum, r) => sum + r.profit, 0)
      const paCount = actualStatuses.filter((s) => s.status.isPA).length
      const avgKPA = actualStatuses.length > 0
        ? (paCount / actualStatuses.length) * 100
        : 0
      const avgUA = paCount > 0
        ? (actualStatuses.filter((s) => s.status.isUA).length / paCount) * 100
        : 0
      const avgPA = actualStatuses.length > 0
        ? (actualStatuses.filter((s) => s.status.isProductivity).length / actualStatuses.length) * 100
        : 0
      const forecastAccuracy = deviation.length > 0 
        ? ((deviation.filter(d => !d.isDeviated).length / deviation.length) * 100)
        : 0

      return {
        vehicleId: vehicle.id,
        nopol: vehicle.nopol,
        type: vehicle.vehicleType,
        driver: vehicle.driver?.name || null,
        branch: vehicle.cabang,
        metrics: {
          totalTrips,
          totalRevenue,
          targetRevenue: vehicle.targetRevenue ?? 0,
          revAchievement: vehicle.targetRevenue && vehicle.targetRevenue > 0
            ? Math.round(((totalRevenue / vehicle.targetRevenue) * 100) * 100) / 100
            : 0,
          totalBop,
          totalOther,
          totalExpense,
          totalProfit,
          profitMargin: totalRevenue > 0 ? Math.round(((totalProfit / totalRevenue) * 100) * 100) / 100 : 0,
        },
        kpi: {
          KPA: Math.round(avgKPA * 100) / 100,
          UA: Math.round(avgUA * 100) / 100,
          PA: Math.round(avgPA * 100) / 100,
        },
        forecast: {
          accuracy: Math.round(forecastAccuracy * 100) / 100,
          totalRecords: deviation.length,
        },
      }
    })
  )

  // Sort by requested field
  const sortMap: { [key: string]: (a: any, b: any) => number } = {
    profit: (a, b) => b.metrics.totalProfit - a.metrics.totalProfit,
    trips: (a, b) => b.metrics.totalTrips - a.metrics.totalTrips,
    kpa: (a, b) => b.kpi.KPA - a.kpi.KPA,
    accuracy: (a, b) => b.forecast.accuracy - a.forecast.accuracy,
    revenue: (a, b) => b.metrics.totalRevenue - a.metrics.totalRevenue,
  }

  const sorted = reportData.sort(sortMap[sortBy as string] || sortMap['profit'])

  res.json({
    success: true,
    message: 'Vehicle performance report berhasil diambil',
    data: {
      dateRange: { startDate, endDate },
      sortedBy: sortBy,
      totalVehicles: vehicles.length,
      report: sorted,
    },
  } as ApiResponse<any>)
}

export const getRevenueAnalysis = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, groupBy = 'day', vehicleType, branchId } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  const end = new Date(endDate as string)

  if (start > end) {
    throw new AppError('startDate harus lebih awal dari endDate', 400)
  }

  const revenueWhere: any = { date: { gte: start, lte: end }, ...getVehicleCabangFilter(req), ...getVehicleRelationTypeFilter(req) }
  if (vehicleType || branchId) {
    revenueWhere.vehicle = revenueWhere.vehicle || {}
    if (vehicleType) revenueWhere.vehicle.vehicleType = vehicleType
    if (branchId) revenueWhere.vehicle.branchId = branchId
  }

  const revenueData = await prisma.revenueData.findMany({
    where: revenueWhere,
    include: { vehicle: true },
    orderBy: { date: 'asc' },
  })

  let groupedData: any = {}

  if (groupBy === 'day') {
    revenueData.forEach((r) => {
      const key = r.date.toISOString().split('T')[0]
      if (!groupedData[key]) {
        groupedData[key] = { trips: 0, revenue: 0, fuel: 0, other: 0, profit: 0 }
      }
      groupedData[key].trips += r.tripCount
      groupedData[key].revenue += r.totalRevenue
      groupedData[key].fuel += r.fuelExpense
      groupedData[key].other += r.otherExpense
      groupedData[key].profit += r.profit
    })
  } else if (groupBy === 'week') {
    revenueData.forEach((r) => {
      const week = Math.ceil(r.date.getDate() / 7)
      const month = r.date.getMonth() + 1
      const year = r.date.getFullYear()
      const key = `${year}-W${week}`
      if (!groupedData[key]) {
        groupedData[key] = { trips: 0, revenue: 0, fuel: 0, other: 0, profit: 0 }
      }
      groupedData[key].trips += r.tripCount
      groupedData[key].revenue += r.totalRevenue
      groupedData[key].fuel += r.fuelExpense
      groupedData[key].other += r.otherExpense
      groupedData[key].profit += r.profit
    })
  } else if (groupBy === 'month') {
    revenueData.forEach((r) => {
      const month = r.date.getMonth() + 1
      const year = r.date.getFullYear()
      const key = `${year}-${String(month).padStart(2, '0')}`
      if (!groupedData[key]) {
        groupedData[key] = { trips: 0, revenue: 0, fuel: 0, other: 0, profit: 0 }
      }
      groupedData[key].trips += r.tripCount
      groupedData[key].revenue += r.totalRevenue
      groupedData[key].fuel += r.fuelExpense
      groupedData[key].other += r.otherExpense
      groupedData[key].profit += r.profit
    })
  }

  // Convert to array and add calculated fields
  const analysis = Object.entries(groupedData).map(([period, data]: any) => ({
    period,
    ...data,
    avgRevenuePerTrip: data.trips > 0 ? Math.round((data.revenue / data.trips) * 100) / 100 : 0,
    profitMargin: data.revenue > 0 ? Math.round(((data.profit / data.revenue) * 100) * 100) / 100 : 0,
  }))

  // Totals
  const totals = {
    totalTrips: revenueData.reduce((sum, r) => sum + r.tripCount, 0),
    totalRevenue: revenueData.reduce((sum, r) => sum + r.totalRevenue, 0),
    totalFuel: revenueData.reduce((sum, r) => sum + r.fuelExpense, 0),
    totalOther: revenueData.reduce((sum, r) => sum + r.otherExpense, 0),
    totalProfit: revenueData.reduce((sum, r) => sum + r.profit, 0),
  }

  res.json({
    success: true,
    message: 'Revenue analysis berhasil diambil',
    data: {
      dateRange: { startDate, endDate },
      groupedBy: groupBy,
      totals: {
        ...totals,
        avgRevenuePerTrip: totals.totalTrips > 0 ? Math.round((totals.totalRevenue / totals.totalTrips) * 100) / 100 : 0,
        profitMargin: totals.totalRevenue > 0 ? Math.round(((totals.totalProfit / totals.totalRevenue) * 100) * 100) / 100 : 0,
      },
      analysis,
    },
  } as ApiResponse<any>)
}

export const getKPITrendReport = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  const end = new Date(endDate as string)

  if (start > end) {
    throw new AppError('startDate harus lebih awal dari endDate', 400)
  }

  const dailyKPIs = await prisma.dailyKPI.findMany({
    where: {
      date: {
        gte: start,
        lte: end,
      },
    },
    orderBy: { date: 'asc' },
  })

  const weeklyKPIs = await prisma.weeklyKPI.findMany({
    where: {
      startDate: {
        gte: start,
        lte: end,
      },
    },
    orderBy: { startDate: 'asc' },
  })

  const startYearMonth = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`
  const endYearMonth = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`

  const monthlyKPIs = await prisma.monthlyKPI.findMany({
    where: {
      yearMonth: {
        gte: startYearMonth,
        lte: endYearMonth,
      },
    },
    orderBy: { yearMonth: 'asc' },
  })

  const dailyTrend = dailyKPIs.map((k) => ({
    date: k.date.toISOString().split('T')[0],
    KPA: Math.round(k.KPA * 100) / 100,
    UA: Math.round(k.UA * 100) / 100,
    PA: Math.round(k.PA * 100) / 100,
  }))

  const weeklyTrend = weeklyKPIs.map((k) => ({
    weekStart: k.startDate.toISOString().split('T')[0],
    KPA: Math.round(k.KPA * 100) / 100,
    UA: Math.round(k.UA * 100) / 100,
    PA: Math.round(k.PA * 100) / 100,
  }))

  const monthlyTrend = monthlyKPIs.map((k) => ({
    month: k.yearMonth,
    KPA: Math.round(k.KPA * 100) / 100,
    UA: Math.round(k.UA * 100) / 100,
    PA: Math.round(k.PA * 100) / 100,
  }))

  res.json({
    success: true,
    message: 'KPI trend report berhasil diambil',
    data: {
      dateRange: { startDate, endDate },
      daily: {
        count: dailyTrend.length,
        trend: dailyTrend,
      },
      weekly: {
        count: weeklyTrend.length,
        trend: weeklyTrend,
      },
      monthly: {
        count: monthlyTrend.length,
        trend: monthlyTrend,
      },
    },
  } as ApiResponse<any>)
}

export const getUnitPerformanceReport = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, branchId, vehicleType } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  const end = new Date(endDate as string)

  if (start > end) {
    throw new AppError('startDate harus lebih awal dari endDate', 400)
  }

  const unitBranchFilter = getOptionalBranchFilter(req, branchId as string | undefined)
  const vehicles = await prisma.vehicle.findMany({
    where: { isActive: true, ...getCabangFilter(req), ...unitBranchFilter, ...getVehicleTypeFilter(req), ...(vehicleType ? { vehicleType: vehicleType as string } : {}) },
  })

  const reportData = await Promise.all(
    vehicles.map(async (vehicle) => {
      const statuses = await prisma.actualStatus.findMany({
        where: {
          vehicleId: vehicle.id,
          date: { gte: start, lte: end },
        },
        include: { status: true },
        orderBy: { date: 'asc' },
      })

      const monthlyMap: Record<string, { total: number; pa: number; ua: number; prod: number }> = {}

      for (const s of statuses) {
        const month = `${s.date.getFullYear()}-${String(s.date.getMonth() + 1).padStart(2, '0')}`
        if (!monthlyMap[month]) {
          monthlyMap[month] = { total: 0, pa: 0, ua: 0, prod: 0 }
        }
        monthlyMap[month].total++
        if (s.status.isPA) monthlyMap[month].pa++
        if (s.status.isUA) monthlyMap[month].ua++
        if (s.status.isProductivity) monthlyMap[month].prod++
      }

      const months = Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, m]) => ({
          month,
          PA: m.total > 0 ? Math.round((m.pa / m.total) * 10000) / 100 : 0,
          UA: m.pa > 0 ? Math.round((m.ua / m.pa) * 10000) / 100 : 0,
          Prod: m.total > 0 ? Math.round((m.prod / m.total) * 10000) / 100 : 0,
        }))

      return {
        vehicleId: vehicle.id,
        nopol: vehicle.nopol,
        type: vehicle.vehicleType,
        cabang: vehicle.cabang,
        months,
      }
    })
  )

  res.json({
    success: true,
    message: 'Unit performance report berhasil diambil',
    data: {
      dateRange: { startDate, endDate },
      totalVehicles: vehicles.length,
      report: reportData,
    },
  } as ApiResponse<any>)
}

export const getBreakdownDetailReport = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, branchId, vehicleType } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  const end = new Date(endDate as string)

  if (start > end) {
    throw new AppError('startDate harus lebih awal dari endDate', 400)
  }

  const bdBranchFilter = getOptionalBranchFilter(req, branchId as string | undefined)
  const vehicles = await prisma.vehicle.findMany({
    where: { isActive: true, ...getCabangFilter(req), ...bdBranchFilter, ...getVehicleTypeFilter(req), ...(vehicleType ? { vehicleType: vehicleType as string } : {}) },
  })

  const reportData = await Promise.all(
    vehicles.map(async (vehicle) => {
      const statuses = await prisma.actualStatus.findMany({
        where: {
          vehicleId: vehicle.id,
          date: { gte: start, lte: end },
        },
        include: { status: true },
        orderBy: { date: 'asc' },
      })

      const monthlyMap: Record<string, { total: number; pa: number; bdDays: number; notes: string[] }> = {}

      for (const s of statuses) {
        const month = `${s.date.getFullYear()}-${String(s.date.getMonth() + 1).padStart(2, '0')}`
        if (!monthlyMap[month]) {
          monthlyMap[month] = { total: 0, pa: 0, bdDays: 0, notes: [] }
        }
        monthlyMap[month].total++
        if (s.status.isPA) monthlyMap[month].pa++
        if (s.statusCode === 'BD') {
          monthlyMap[month].bdDays++
          const day = s.date.toISOString().split('T')[0]
          const note = s.notes ? `${day}: ${s.notes}` : day
          monthlyMap[month].notes.push(note)
        }
      }

      const months = Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, m]) => ({
          month,
          PA: m.total > 0 ? Math.round((m.pa / m.total) * 10000) / 100 : 0,
          bdDays: m.bdDays,
          notes: m.notes.join('; '),
        }))

      return {
        vehicleId: vehicle.id,
        nopol: vehicle.nopol,
        type: vehicle.vehicleType,
        cabang: vehicle.cabang,
        months,
      }
    })
  )

  res.json({
    success: true,
    message: 'Breakdown detail report berhasil diambil',
    data: {
      dateRange: { startDate, endDate },
      totalVehicles: vehicles.length,
      report: reportData,
    },
  } as ApiResponse<any>)
}

export const getComplianceReport = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  const end = new Date(endDate as string)

  if (start > end) {
    throw new AppError('startDate harus lebih awal dari endDate', 400)
  }

  // Get all vehicles
  const vehicles = await prisma.vehicle.findMany({
    where: { ...getCabangFilter(req), ...getVehicleTypeFilter(req) },
  })

  // For each vehicle, check coverage (days with actual status)
  const complianceData = await Promise.all(
    vehicles.map(async (vehicle) => {
      const statuses = await prisma.actualStatus.findMany({
        where: {
          vehicleId: vehicle.id,
          date: { gte: start, lte: end },
        },
      })

      const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const reportedDays = statuses.length
      const compliance = Math.round((reportedDays / totalDays) * 10000) / 100

      return {
        vehicleId: vehicle.id,
        nopol: vehicle.nopol,
        totalDays,
        reportedDays,
        compliance,
        missingDays: totalDays - reportedDays,
      }
    })
  )

  const compliant = complianceData.filter((c) => c.compliance === 100).length
  const partialCompliance = complianceData.filter((c) => c.compliance > 0 && c.compliance < 100).length
  const nonCompliant = complianceData.filter((c) => c.compliance === 0).length

  res.json({
    success: true,
    message: 'Compliance report berhasil diambil',
    data: {
      dateRange: { startDate, endDate },
      summary: {
        totalVehicles: vehicles.length,
        compliant,
        partialCompliance,
        nonCompliant,
      },
      details: complianceData.sort((a, b) => a.compliance - b.compliance),
    },
  } as ApiResponse<any>)
}

export const getUtilizationAnalysis = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, branchId, vehicleType } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  const end = new Date(endDate as string)

  if (start > end) {
    throw new AppError('startDate harus lebih awal dari endDate', 400)
  }

  const uaBranchFilter = getOptionalBranchFilter(req, branchId as string | undefined)
  const vehicles = await prisma.vehicle.findMany({
    where: { isActive: true, ...getCabangFilter(req), ...uaBranchFilter, ...getVehicleTypeFilter(req), ...(vehicleType ? { vehicleType: vehicleType as string } : {}) },
  })

  const reportData = await Promise.all(
    vehicles.map(async (vehicle) => {
      const statuses = await prisma.actualStatus.findMany({
        where: {
          vehicleId: vehicle.id,
          date: { gte: start, lte: end },
        },
        include: { status: true },
      })

      const total = statuses.length
      if (total === 0) {
        return {
          vehicleId: vehicle.id,
          nopol: vehicle.nopol,
          vehicleType: vehicle.vehicleType,
          cabang: vehicle.cabang,
          PA: 0, UA: 0,
          breakdownPct: 0, delayPct: 0, rfuPct: 0, unrPct: 0, nwdPct: 0, dnaPct: 0,
        }
      }

      const breakdownCount = statuses.filter((s) => s.status?.groupStatus === 'BREAKDOWN').length

      const utilPct = statuses.filter((s) => s.status?.groupStatus === 'UTILISASI').length / total * 100
      const breakdownPct = breakdownCount / total * 100
      const delayPct = statuses.filter((s) => s.status?.groupStatus === 'DELAY').length / total * 100
      const rfuPct = statuses.filter((s) => s.status?.groupStatus === 'READY FOR USE').length / total * 100
      const unrPct = statuses.filter((s) => s.status?.groupStatus === 'UNR').length / total * 100
      const nwdPct = statuses.filter((s) => s.status?.groupStatus === 'NWD').length / total * 100
      const dnaPct = statuses.filter((s) => s.status?.groupStatus === 'DNA').length / total * 100

      return {
        vehicleId: vehicle.id,
        nopol: vehicle.nopol,
        vehicleType: vehicle.vehicleType,
        cabang: vehicle.cabang,
        PA: Math.round(((total - breakdownCount) / total) * 10000) / 100,
        UA: Math.round(utilPct * 100) / 100,
        breakdownPct: Math.round(breakdownPct * 100) / 100,
        delayPct: Math.round(delayPct * 100) / 100,
        rfuPct: Math.round(rfuPct * 100) / 100,
        unrPct: Math.round(unrPct * 100) / 100,
        nwdPct: Math.round(nwdPct * 100) / 100,
        dnaPct: Math.round(dnaPct * 100) / 100,
      }
    })
  )

  res.json({
    success: true,
    message: 'Utilization analysis report berhasil diambil',
    data: {
      dateRange: { startDate, endDate },
      totalVehicles: vehicles.length,
      report: reportData,
    },
  } as ApiResponse<any>)
}

// Analisa Customer: agregasi revenue per customer (snapshot customerId di RevenueData).
export const getCustomerAnalysis = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, vehicleType, branchId } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  start.setHours(0, 0, 0, 0)
  const end = new Date(endDate as string)
  end.setHours(23, 59, 59, 999)
  if (start > end) throw new AppError('startDate harus lebih awal dari endDate', 400)

  const revenueWhere: any = {
    date: { gte: start, lte: end },
    ...getVehicleCabangFilter(req),
    ...getVehicleRelationTypeFilter(req),
  }
  if (vehicleType || branchId) {
    revenueWhere.vehicle = revenueWhere.vehicle || {}
    if (vehicleType) revenueWhere.vehicle.vehicleType = vehicleType
    if (branchId) revenueWhere.vehicle.branchId = branchId
  }

  const revenues = await prisma.revenueData.findMany({
    where: revenueWhere,
    include: { customer: { select: { id: true, name: true } } },
  })

  const totalRevenueAll = revenues.reduce((s, r) => s + r.totalRevenue, 0)

  type Agg = { customerId: string | null; customerName: string; revenue: number; bop: number; other: number; grossProfit: number; trips: number; units: Set<string> }
  const map = new Map<string, Agg>()
  for (const r of revenues) {
    const key = r.customerId || 'UNASSIGNED'
    const g = map.get(key) || {
      customerId: r.customerId,
      customerName: (r as any).customer?.name || '(Tanpa Customer)',
      revenue: 0, bop: 0, other: 0, grossProfit: 0, trips: 0, units: new Set<string>(),
    }
    g.revenue += r.totalRevenue
    g.bop += r.fuelExpense
    g.other += r.otherExpense
    g.grossProfit += r.profit
    g.trips += r.tripCount
    g.units.add(r.vehicleId)
    map.set(key, g)
  }

  const report = Array.from(map.values())
    .map((g) => ({
      customerId: g.customerId,
      customerName: g.customerName,
      revenue: g.revenue,
      bop: g.bop,
      other: g.other,
      grossProfit: g.grossProfit,
      trips: g.trips,
      unitCount: g.units.size,
      margin: g.revenue > 0 ? Math.round((g.grossProfit / g.revenue) * 100 * 100) / 100 : 0,
      share: totalRevenueAll > 0 ? Math.round((g.revenue / totalRevenueAll) * 100 * 100) / 100 : 0,
      avgRevenuePerTrip: g.trips > 0 ? Math.round(g.revenue / g.trips) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  const totals = {
    revenue: totalRevenueAll,
    bop: revenues.reduce((s, r) => s + r.fuelExpense, 0),
    other: revenues.reduce((s, r) => s + r.otherExpense, 0),
    grossProfit: revenues.reduce((s, r) => s + r.profit, 0),
    trips: revenues.reduce((s, r) => s + r.tripCount, 0),
    customerCount: report.length,
  }

  res.json({
    success: true,
    message: 'Analisa customer berhasil diambil',
    data: { dateRange: { startDate, endDate }, report, totals },
  } as ApiResponse<any>)
}
