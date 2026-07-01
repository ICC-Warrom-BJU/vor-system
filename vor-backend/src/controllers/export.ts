import { Response } from 'express'
import { AuthRequest, ApiResponse, AppError } from '../utils/types'
import prisma from '../config/prisma'
import { getCabangFilter, getVehicleCabangFilter } from '../utils/cabangFilter'

// Helper function to generate CSV from data
const generateCSV = (data: any[], headers: string[]): string => {
  const csv = [headers.join(',')]
  for (const row of data) {
    csv.push(headers.map((h) => {
      const value = h.split('.').reduce((obj: any, key) => obj?.[key], row)
      if (value === null || value === undefined) return ''
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`
      }
      return value
    }).join(','))
  }
  return csv.join('\n')
}

// Helper function to generate simple HTML table (can be converted to PDF)
const generateHTMLReport = (title: string, data: any[], columns: any[]): string => {
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #4CAF50; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .summary { margin-bottom: 20px; }
            .summary p { margin: 5px 0; }
        </style>
    </head>
    <body>
        <h1>${title}</h1>
        <div class="summary">
            <p><strong>Generated:</strong> ${new Date().toLocaleString('id-ID')}</p>
        </div>
        <table>
            <thead>
                <tr>
                    ${columns.map((col: any) => `<th>${col.label}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${data.map((row: any) => `
                    <tr>
                        ${columns.map((col: any) => {
                          const value = col.key.split('.').reduce((obj: any, key: string) => obj?.[key], row)
                          return `<td>${value ?? ''}</td>`
                        }).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </body>
    </html>
  `
  return html
}

export const exportRevenueReport = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, format = 'csv' } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  const end = new Date(endDate as string)

  const cabangFilter = getVehicleCabangFilter(req)

  const revenueData = await prisma.revenueData.findMany({
    where: {
      date: {
        gte: start,
        lte: end,
      },
      ...cabangFilter,
    },
    include: { vehicle: true },
    orderBy: { date: 'asc' },
  })

  const exportData = revenueData.map((r) => ({
    date: r.date.toISOString().split('T')[0],
    nopol: r.vehicle.nopol,
    trips: r.tripCount,
    revenue: r.totalRevenue,
    fuel: r.fuelExpense,
    other: r.otherExpense,
    profit: r.profit,
    margin: r.totalRevenue > 0 ? Math.round(((r.profit / r.totalRevenue) * 100) * 100) / 100 : 0,
  }))

  if (format === 'csv') {
    const csv = generateCSV(exportData, ['date', 'nopol', 'trips', 'revenue', 'fuel', 'other', 'profit', 'margin'])
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="revenue-report-${startDate}-${endDate}.csv"`)
    res.send(csv)
  } else if (format === 'html') {
    const html = generateHTMLReport('Revenue Report', exportData, [
      { label: 'Date', key: 'date' },
      { label: 'Nopol', key: 'nopol' },
      { label: 'Trips', key: 'trips' },
      { label: 'Revenue', key: 'revenue' },
      { label: 'Fuel Expense', key: 'fuel' },
      { label: 'Other Expense', key: 'other' },
      { label: 'Profit', key: 'profit' },
      { label: 'Margin %', key: 'margin' },
    ])
    res.setHeader('Content-Type', 'text/html')
    res.setHeader('Content-Disposition', `attachment; filename="revenue-report-${startDate}-${endDate}.html"`)
    res.send(html)
  } else {
    throw new AppError('Format harus csv atau html', 400)
  }
}

export const exportKPIReport = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, format = 'csv' } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  const end = new Date(endDate as string)

  const dailyKPIs = await prisma.dailyKPI.findMany({
    where: {
      date: {
        gte: start,
        lte: end,
      },
    },
    orderBy: { date: 'asc' },
  })

  const exportData = dailyKPIs.map((k) => ({
    date: k.date.toISOString().split('T')[0],
    KPA: Math.round(k.KPA * 100) / 100,
    UA: Math.round(k.UA * 100) / 100,
    PA: Math.round(k.PA * 100) / 100,
    available: k.availableCount,
    utilized: k.utilizedCount,
    productive: k.productiveCount,
  }))

  if (format === 'csv') {
    const csv = generateCSV(exportData, ['date', 'KPA', 'UA', 'PA', 'available', 'utilized', 'productive'])
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="kpi-report-${startDate}-${endDate}.csv"`)
    res.send(csv)
  } else if (format === 'html') {
    const html = generateHTMLReport('KPI Report', exportData, [
      { label: 'Date', key: 'date' },
      { label: 'KPA %', key: 'KPA' },
      { label: 'UA %', key: 'UA' },
      { label: 'PA %', key: 'PA' },
      { label: 'Available', key: 'available' },
      { label: 'Utilized', key: 'utilized' },
      { label: 'Productive', key: 'productive' },
    ])
    res.setHeader('Content-Type', 'text/html')
    res.setHeader('Content-Disposition', `attachment; filename="kpi-report-${startDate}-${endDate}.html"`)
    res.send(html)
  } else {
    throw new AppError('Format harus csv atau html', 400)
  }
}

export const exportVehiclePerformanceReport = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, format = 'csv' } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  const end = new Date(endDate as string)

  // Get all vehicles
  const vehicles = await prisma.vehicle.findMany({
    where: { isActive: true, ...getCabangFilter(req) },
    include: { driver: true },
  })

  const exportData = await Promise.all(
    vehicles.map(async (vehicle) => {
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

      const totalTrips = revenue.reduce((sum, r) => sum + r.tripCount, 0)
      const totalRevenue = revenue.reduce((sum, r) => sum + r.totalRevenue, 0)
      const totalProfit = revenue.reduce((sum, r) => sum + r.profit, 0)
      const avgKPA = actualStatuses.length > 0
        ? (actualStatuses.filter((s) => s.status.isPA).length / actualStatuses.length) * 100
        : 0

      return {
        nopol: vehicle.nopol,
        type: vehicle.vehicleType,
        driver: vehicle.driver?.name || '',
        trips: totalTrips,
        revenue: totalRevenue,
        profit: totalProfit,
        margin: totalRevenue > 0 ? Math.round(((totalProfit / totalRevenue) * 100) * 100) / 100 : 0,
        KPA: Math.round(avgKPA * 100) / 100,
      }
    })
  )

  if (format === 'csv') {
    const csv = generateCSV(exportData, ['nopol', 'type', 'driver', 'trips', 'revenue', 'profit', 'margin', 'KPA'])
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="vehicle-performance-${startDate}-${endDate}.csv"`)
    res.send(csv)
  } else if (format === 'html') {
    const html = generateHTMLReport('Vehicle Performance Report', exportData, [
      { label: 'Nopol', key: 'nopol' },
      { label: 'Type', key: 'type' },
      { label: 'Driver', key: 'driver' },
      { label: 'Trips', key: 'trips' },
      { label: 'Revenue', key: 'revenue' },
      { label: 'Profit', key: 'profit' },
      { label: 'Margin %', key: 'margin' },
      { label: 'KPA %', key: 'KPA' },
    ])
    res.setHeader('Content-Type', 'text/html')
    res.setHeader('Content-Disposition', `attachment; filename="vehicle-performance-${startDate}-${endDate}.html"`)
    res.send(html)
  } else {
    throw new AppError('Format harus csv atau html', 400)
  }
}

export const exportUnitPerformanceReport = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, format = 'csv' } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  const end = new Date(endDate as string)

  const vehicles = await prisma.vehicle.findMany({
    where: { isActive: true, ...getCabangFilter(req) },
  })

  const exportData = await Promise.all(
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

      return Object.entries(monthlyMap).map(([month, m]) => ({
        nopol: vehicle.nopol,
        type: vehicle.vehicleType,
        month,
        PA: m.total > 0 ? Math.round((m.pa / m.total) * 10000) / 100 : 0,
        UA: m.total > 0 ? Math.round((m.ua / m.total) * 10000) / 100 : 0,
        Prod: m.total > 0 ? Math.round((m.prod / m.total) * 10000) / 100 : 0,
      }))
    })
  )

  const flatData = exportData.flat()

  if (format === 'csv') {
    const csv = generateCSV(flatData, ['nopol', 'type', 'month', 'PA', 'UA', 'Prod'])
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="unit-performance-${startDate}-${endDate}.csv"`)
    res.send(csv)
  } else if (format === 'html') {
    const html = generateHTMLReport('Unit Performance Report', flatData, [
      { label: 'Nopol', key: 'nopol' },
      { label: 'Type', key: 'type' },
      { label: 'Month', key: 'month' },
      { label: 'PA %', key: 'PA' },
      { label: 'UA %', key: 'UA' },
      { label: 'Prod %', key: 'Prod' },
    ])
    res.setHeader('Content-Type', 'text/html')
    res.setHeader('Content-Disposition', `attachment; filename="unit-performance-${startDate}-${endDate}.html"`)
    res.send(html)
  } else {
    throw new AppError('Format harus csv atau html', 400)
  }
}

export const exportBreakdownDetailReport = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, format = 'csv' } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  const end = new Date(endDate as string)

  const vehicles = await prisma.vehicle.findMany({
    where: { isActive: true, ...getCabangFilter(req) },
  })

  const exportData = await Promise.all(
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

      return Object.entries(monthlyMap).map(([month, m]) => ({
        nopol: vehicle.nopol,
        type: vehicle.vehicleType,
        month,
        PA: m.total > 0 ? Math.round((m.pa / m.total) * 10000) / 100 : 0,
        bdDays: m.bdDays,
        notes: m.notes.join('; '),
      }))
    })
  )

  const flatData = exportData.flat()

  if (format === 'csv') {
    const csv = generateCSV(flatData, ['nopol', 'type', 'month', 'PA', 'bdDays', 'notes'])
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="breakdown-detail-${startDate}-${endDate}.csv"`)
    res.send(csv)
  } else if (format === 'html') {
    const html = generateHTMLReport('Breakdown Detail Report', flatData, [
      { label: 'Nopol', key: 'nopol' },
      { label: 'Type', key: 'type' },
      { label: 'Month', key: 'month' },
      { label: 'PA %', key: 'PA' },
      { label: 'BD Days', key: 'bdDays' },
      { label: 'Notes', key: 'notes' },
    ])
    res.setHeader('Content-Type', 'text/html')
    res.setHeader('Content-Disposition', `attachment; filename="breakdown-detail-${startDate}-${endDate}.html"`)
    res.send(html)
  } else {
    throw new AppError('Format harus csv atau html', 400)
  }
}

export const exportForecastAccuracyReport = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, format = 'csv' } = req.query

  if (!startDate || !endDate) {
    throw new AppError('Parameter startDate dan endDate harus diberikan', 400)
  }

  const start = new Date(startDate as string)
  const end = new Date(endDate as string)

  const cabangFilter = getVehicleCabangFilter(req)

  const deviations = await prisma.forecastDeviation.findMany({
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
    orderBy: { date: 'asc' },
  })

  const exportData = deviations.map((d) => ({
    date: d.date.toISOString().split('T')[0],
    nopol: d.vehicle.nopol,
    forecastStatus: d.forecastStatusCode,
    actualStatus: d.actualStatusCode,
    deviated: d.isDeviated ? 'Yes' : 'No',
    accuracy: d.accuracy,
  }))

  if (format === 'csv') {
    const csv = generateCSV(exportData, ['date', 'nopol', 'forecastStatus', 'actualStatus', 'deviated', 'accuracy'])
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="forecast-accuracy-${startDate}-${endDate}.csv"`)
    res.send(csv)
  } else if (format === 'html') {
    const html = generateHTMLReport('Forecast Accuracy Report', exportData, [
      { label: 'Date', key: 'date' },
      { label: 'Nopol', key: 'nopol' },
      { label: 'Forecast', key: 'forecastStatus' },
      { label: 'Actual', key: 'actualStatus' },
      { label: 'Deviated', key: 'deviated' },
      { label: 'Accuracy %', key: 'accuracy' },
    ])
    res.setHeader('Content-Type', 'text/html')
    res.setHeader('Content-Disposition', `attachment; filename="forecast-accuracy-${startDate}-${endDate}.html"`)
    res.send(html)
  } else {
    throw new AppError('Format harus csv atau html', 400)
  }
}
