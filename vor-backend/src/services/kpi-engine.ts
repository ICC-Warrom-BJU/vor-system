import prisma from '../config/prisma'

export interface KPICalculationInput {
  date: Date
  vehicleIds?: string[]
}

export interface KPIResult {
  date: Date
  KPA: number // Equipment Productivity Availability
  UA: number // Equipment Utilization Availability
  PA: number // Overall Productivity Availability
  availableCount: number
  utilizedCount: number
  productiveCount: number
  totalVehicles: number
  details?: {
    vehicleId: string
    status: string
    group: string
  }[]
}

// KPA = Available / Total × 100
// UA = Utilized / Available × 100
// PA = Productive / Total × 100

export const calculateDailyKPI = async (input: KPICalculationInput): Promise<KPIResult> => {
  const { date, vehicleIds } = input

  // Get all vehicles or specific vehicles
  const vehicles = await prisma.vehicle.findMany({
    where: vehicleIds ? { id: { in: vehicleIds } } : undefined,
    select: { id: true, nopol: true },
  })

  if (vehicles.length === 0) {
    return {
      date,
      KPA: 0,
      UA: 0,
      PA: 0,
      availableCount: 0,
      utilizedCount: 0,
      productiveCount: 0,
      totalVehicles: 0,
    }
  }

  // Get actual statuses for the date
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const actualStatuses = await prisma.actualStatus.findMany({
    where: {
      vehicleId: { in: vehicles.map((v) => v.id) },
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      status: true,
    },
  })

  // Build status map
  const statusMap = new Map<string, any>()
  actualStatuses.forEach((status) => {
    statusMap.set(status.vehicleId, status)
  })

  // Calculate counts
  let availableCount = 0
  let utilizedCount = 0
  let productiveCount = 0
  const details = []

  vehicles.forEach((vehicle) => {
    const status = statusMap.get(vehicle.id)
    const statusCode = status?.status?.code || 'UNKNOWN'
    const statusGroup = status?.status?.groupStatus || 'UNKNOWN'

    if (status?.status?.isPA) {
      availableCount++
    }

    if (status?.status?.isUA) {
      utilizedCount++
    }

    if (status?.status?.isProductivity) {
      productiveCount++
    }

    details.push({
      vehicleId: vehicle.id,
      status: statusCode,
      group: statusGroup,
    })
  })

  const totalVehicles = vehicles.length

  // Calculate KPI
  const KPA = totalVehicles > 0 ? (availableCount / totalVehicles) * 100 : 0
  const UA = availableCount > 0 ? (utilizedCount / availableCount) * 100 : 0
  const PA = totalVehicles > 0 ? (productiveCount / totalVehicles) * 100 : 0

  return {
    date,
    KPA: Math.round(KPA * 100) / 100,
    UA: Math.round(UA * 100) / 100,
    PA: Math.round(PA * 100) / 100,
    availableCount,
    utilizedCount,
    productiveCount,
    totalVehicles,
    details,
  }
}

export const calculateWeeklyKPI = async (startDate: Date): Promise<KPIResult> => {
  const dates = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    dates.push(date)
  }

  const dailyKPIs = await Promise.all(
    dates.map((date) => calculateDailyKPI({ date }))
  )

  const totalKPA = dailyKPIs.reduce((sum, kpi) => sum + kpi.KPA, 0)
  const totalUA = dailyKPIs.reduce((sum, kpi) => sum + kpi.UA, 0)
  const totalPA = dailyKPIs.reduce((sum, kpi) => sum + kpi.PA, 0)
  const totalVehicles = dailyKPIs[0]?.totalVehicles || 0

  return {
    date: startDate,
    KPA: Math.round((totalKPA / dailyKPIs.length) * 100) / 100,
    UA: Math.round((totalUA / dailyKPIs.length) * 100) / 100,
    PA: Math.round((totalPA / dailyKPIs.length) * 100) / 100,
    availableCount: Math.round(
      dailyKPIs.reduce((sum, kpi) => sum + kpi.availableCount, 0) / 7
    ),
    utilizedCount: Math.round(
      dailyKPIs.reduce((sum, kpi) => sum + kpi.utilizedCount, 0) / 7
    ),
    productiveCount: Math.round(
      dailyKPIs.reduce((sum, kpi) => sum + kpi.productiveCount, 0) / 7
    ),
    totalVehicles,
  }
}

export const calculateMonthlyKPI = async (year: number, month: number): Promise<KPIResult> => {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)

  const dates = []
  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }

  const dailyKPIs = await Promise.all(
    dates.map((date) => calculateDailyKPI({ date }))
  )

  const totalKPA = dailyKPIs.reduce((sum, kpi) => sum + kpi.KPA, 0)
  const totalUA = dailyKPIs.reduce((sum, kpi) => sum + kpi.UA, 0)
  const totalPA = dailyKPIs.reduce((sum, kpi) => sum + kpi.PA, 0)
  const totalVehicles = dailyKPIs[0]?.totalVehicles || 0

  return {
    date: startDate,
    KPA: Math.round((totalKPA / dailyKPIs.length) * 100) / 100,
    UA: Math.round((totalUA / dailyKPIs.length) * 100) / 100,
    PA: Math.round((totalPA / dailyKPIs.length) * 100) / 100,
    availableCount: Math.round(
      dailyKPIs.reduce((sum, kpi) => sum + kpi.availableCount, 0) /
        dailyKPIs.length
    ),
    utilizedCount: Math.round(
      dailyKPIs.reduce((sum, kpi) => sum + kpi.utilizedCount, 0) /
        dailyKPIs.length
    ),
    productiveCount: Math.round(
      dailyKPIs.reduce((sum, kpi) => sum + kpi.productiveCount, 0) /
        dailyKPIs.length
    ),
    totalVehicles,
  }
}

export const saveKPI = async (
  kpiType: 'daily' | 'weekly' | 'monthly',
  kpiData: KPIResult,
  userId: string
) => {
  if (kpiType === 'daily') {
    return await prisma.dailyKPI.upsert({
      where: {
        date: kpiData.date,
      },
      create: {
        date: kpiData.date,
        KPA: kpiData.KPA,
        UA: kpiData.UA,
        PA: kpiData.PA,
        availableCount: kpiData.availableCount,
        utilizedCount: kpiData.utilizedCount,
        productiveCount: kpiData.productiveCount,
        totalVehicles: kpiData.totalVehicles,
        calculatedBy: userId,
      },
      update: {
        KPA: kpiData.KPA,
        UA: kpiData.UA,
        PA: kpiData.PA,
        availableCount: kpiData.availableCount,
        utilizedCount: kpiData.utilizedCount,
        productiveCount: kpiData.productiveCount,
        totalVehicles: kpiData.totalVehicles,
        updatedAt: new Date(),
      },
    })
  } else if (kpiType === 'weekly') {
    return await prisma.weeklyKPI.upsert({
      where: {
        startDate: kpiData.date,
      },
      create: {
        startDate: kpiData.date,
        KPA: kpiData.KPA,
        UA: kpiData.UA,
        PA: kpiData.PA,
        availableCount: kpiData.availableCount,
        utilizedCount: kpiData.utilizedCount,
        productiveCount: kpiData.productiveCount,
        totalVehicles: kpiData.totalVehicles,
        calculatedBy: userId,
      },
      update: {
        KPA: kpiData.KPA,
        UA: kpiData.UA,
        PA: kpiData.PA,
        availableCount: kpiData.availableCount,
        utilizedCount: kpiData.utilizedCount,
        productiveCount: kpiData.productiveCount,
        totalVehicles: kpiData.totalVehicles,
        updatedAt: new Date(),
      },
    })
  } else {
    return await prisma.monthlyKPI.upsert({
      where: {
        yearMonth: `${kpiData.date.getFullYear()}-${String(
          kpiData.date.getMonth() + 1
        ).padStart(2, '0')}`,
      },
      create: {
        yearMonth: `${kpiData.date.getFullYear()}-${String(
          kpiData.date.getMonth() + 1
        ).padStart(2, '0')}`,
        KPA: kpiData.KPA,
        UA: kpiData.UA,
        PA: kpiData.PA,
        availableCount: kpiData.availableCount,
        utilizedCount: kpiData.utilizedCount,
        productiveCount: kpiData.productiveCount,
        totalVehicles: kpiData.totalVehicles,
        calculatedBy: userId,
      },
      update: {
        KPA: kpiData.KPA,
        UA: kpiData.UA,
        PA: kpiData.PA,
        availableCount: kpiData.availableCount,
        utilizedCount: kpiData.utilizedCount,
        productiveCount: kpiData.productiveCount,
        totalVehicles: kpiData.totalVehicles,
        updatedAt: new Date(),
      },
    })
  }
}
