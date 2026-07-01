import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Sparkles, CheckCircle, ArrowUpRight, Calendar, Filter, MapPin } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function formatShortDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  })
}

function formatMoney(value: number) {
  return `Rp ${(value / 1000000).toFixed(1)}M`
}

// Helper untuk handle NaN/Infinity values
function safeToFixed(value: number | undefined | null, digits: number = 1): string {
  if (value === undefined || value === null) return '0'
  if (!Number.isFinite(value)) return '0'
  return value.toFixed(digits)
}

function normalizeSeries(values: number[]) {
  const max = Math.max(...values, 1)
  return values.map((value) => (value / max) * 100)
}

// FIX #5 — helper fetch dengan error handling
async function apiFetch(url: string) {
  const token = localStorage.getItem('token')
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${url}`)
  }
  return response.json()
}

// Label deskriptif untuk kode status dari DB
const STATUS_LABEL: Record<string, string> = {
  OP: 'Operasional',
  ST: 'Standby',
  HM: 'Hangar / Maintenance',
  BR: 'Breakdown',
  RD: 'Ready',
  WO: 'Work Order',
  SB: 'Standby',
  PM: 'Preventive Maintenance',
  CM: 'Corrective Maintenance',
  UNKNOWN: 'Tidak Diketahui',
}

// Warna bar per kategori status
const STATUS_COLOR: Record<string, string> = {
  OP: 'bg-emerald-500',
  RD: 'bg-emerald-400',
  ST: 'bg-sky-400',
  SB: 'bg-sky-500',
  WO: 'bg-amber-400',
  HM: 'bg-orange-500',
  PM: 'bg-orange-400',
  CM: 'bg-orange-600',
  BR: 'bg-red-500',
  UNKNOWN: 'bg-slate-400',
}

function lerpColor(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16)
  const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16)
  const clamp = (v: number) => Math.round(Math.min(255, Math.max(0, v)))
  const r = clamp(r1 + (r2 - r1) * t)
  const g = clamp(g1 + (g2 - g1) * t)
  const b = clamp(b1 + (b2 - b1) * t)
  return `rgb(${r},${g},${b})`
}

// PA: nilai tinggi = hijau pekat, nilai rendah = hijau pucat
const PA_FULL = '#059669'   // emerald-600
const PA_PALE = '#d1fae5'   // emerald-100
function getPAColor(value: number): string {
  return lerpColor(PA_PALE, PA_FULL, Math.min(1, Math.max(0, value / 100)))
}
function getPAClass(value: number): string {
  if (value >= 95) return 'bg-emerald-600'
  if (value >= 80) return 'bg-emerald-500'
  if (value >= 60) return 'bg-emerald-400'
  if (value >= 40) return 'bg-emerald-300'
  return 'bg-emerald-200'
}
const PA_LEGEND_CLASS = 'inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700'

// UA: nilai tinggi = biru pekat, nilai rendah = biru pucat
const UA_FULL = '#2563eb'   // blue-600
const UA_PALE = '#dbeafe'   // blue-100
function getUAColor(value: number): string {
  return lerpColor(UA_PALE, UA_FULL, Math.min(1, Math.max(0, value / 100)))
}
function getUAClass(value: number): string {
  if (value >= 95) return 'bg-blue-600'
  if (value >= 80) return 'bg-blue-500'
  if (value >= 60) return 'bg-blue-400'
  if (value >= 40) return 'bg-blue-300'
  return 'bg-blue-200'
}
const UA_LEGEND_CLASS = 'inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-300 text-blue-700'

export default function Dashboard() {
  const [selectedUnitType, _setSelectedUnitType] = useState('All')
  const [selectedBranchId, setSelectedBranchId] = useState('')

  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  const [startDate, setStartDate] = useState(firstOfMonth.toLocaleDateString('en-CA'))
  const [endDate, setEndDate] = useState(lastOfMonth.toLocaleDateString('en-CA'))
  const [selectedMonth, setSelectedMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  )

  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}') }
    catch { return {} }
  })()
  const isAdmin = user.role === 'ADMIN' || user.role === 'MANAGEMENT'

  useEffect(() => {
    if (!selectedMonth) return
    const [year, month] = selectedMonth.split('-').map(Number)
    const first = new Date(year, month - 1, 1)
    const last = new Date(year, month, 0)
    setStartDate(first.toLocaleDateString('en-CA'))
    setEndDate(last.toLocaleDateString('en-CA'))
  }, [selectedMonth])

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => apiFetch('/api/branches'),
    enabled: isAdmin,
  })

  const branchesList: { id: string; name: string }[] = branches?.data ?? []

  const branchQuery = selectedBranchId ? `&branchId=${selectedBranchId}` : ''

  const { data: fleetOverview, isLoading: isLoadingFleet } = useQuery({
    queryKey: ['fleetOverview', startDate, endDate, selectedBranchId],
    queryFn: () =>
      apiFetch(`/api/dashboard/fleet-overview?startDate=${startDate}&endDate=${endDate}${branchQuery}`),
  })

  const { data: kpiDashboard, isLoading: isLoadingKPI } = useQuery({
    queryKey: ['kpiDashboard', startDate, endDate],
    queryFn: () =>
      apiFetch(`/api/dashboard/kpi?startDate=${startDate}&endDate=${endDate}`),
  })

  const { data: revenueDashboard, isLoading: isLoadingRevenue } = useQuery({
    queryKey: ['revenueDashboard', startDate, endDate, selectedBranchId],
    queryFn: () =>
      apiFetch(`/api/dashboard/revenue?startDate=${startDate}&endDate=${endDate}${branchQuery}`),
  })

  const { data: forecastAccuracy, isLoading: isLoadingForecast } = useQuery({
    queryKey: ['forecastAccuracy', startDate, endDate, selectedBranchId],
    queryFn: () =>
      apiFetch(
        `/api/dashboard/forecast-accuracy?startDate=${startDate}&endDate=${endDate}${branchQuery}`
      ),
  })

  const { data: operationalMetrics, isLoading: isLoadingOperational } = useQuery({
    queryKey: ['operationalMetrics', startDate, endDate, selectedBranchId],
    queryFn: () =>
      apiFetch(
        `/api/dashboard/operational-metrics?startDate=${startDate}&endDate=${endDate}${branchQuery}`
      ),
  })

  const { data: unitPerformance } = useQuery({
    queryKey: ['unitPerformanceRanking', startDate, endDate, selectedBranchId],
    queryFn: () =>
      apiFetch(
        `/api/reports/unit-performance?startDate=${startDate}&endDate=${endDate}${branchQuery}`
      ),
  })

  const { data: breakdownDetail } = useQuery({
    queryKey: ['breakdownDetailDash', startDate, endDate, selectedBranchId],
    queryFn: () =>
      apiFetch(
        `/api/reports/breakdown-detail?startDate=${startDate}&endDate=${endDate}${branchQuery}`
      ),
  })

  const { data: branchPerformance } = useQuery({
    queryKey: ['branchPerformance', startDate, endDate, selectedBranchId],
    queryFn: () =>
      apiFetch(`/api/dashboard/performance-by-branch?startDate=${startDate}&endDate=${endDate}${branchQuery}`),
  })

  const { data: gpsDashboard } = useQuery({
    queryKey: ['gpsDashboard', startDate, endDate, selectedBranchId],
    queryFn: () =>
      apiFetch(`/api/dashboard/gps?startDate=${startDate}&endDate=${endDate}${branchQuery}`),
  })

  const branchPerfList: { branchId: string; branchName: string; pa: number; ua: number; prod: number; vehicleCount: number }[]
    = branchPerformance?.data ?? []

  const isLoading =
    isLoadingFleet || isLoadingKPI || isLoadingRevenue || isLoadingForecast || isLoadingOperational

  // PA = Physical Availability (isPA) → KPA di response
  // UA = Utilization Availability (isUA) → UA
  // Prod = Productivity (isProductivity) → PA
  const paValue =
    fleetOverview?.data?.summary?.KPA?.avg ??
    kpiDashboard?.data?.summary?.KPA?.avg ??
    0

  const uaValue =
    fleetOverview?.data?.summary?.UA?.avg ??
    kpiDashboard?.data?.summary?.UA?.avg ??
    0

  const totalArmada = fleetOverview?.data?.totalVehicles ?? 0

  const rankingUnits = revenueDashboard?.data?.topPerformers ?? []

  // Aggregate PA/UA/Prod dari unit performance report per kendaraan
  const unitRankings = (unitPerformance?.data?.report ?? []).map((v: any) => {
    const months = v.months ?? []
    const n = months.length || 1
    const avgPA = months.reduce((s: number, m: any) => s + m.PA, 0) / n
    const avgUA = months.reduce((s: number, m: any) => s + m.UA, 0) / n
    const avgProd = months.reduce((s: number, m: any) => s + m.Prod, 0) / n
    return { vehicleId: v.vehicleId, nopol: v.nopol, type: v.type, cabang: v.cabang, pa: avgPA, ua: avgUA, prod: avgProd }
  }).sort((a: any, b: any) => b.prod - a.prod)

  // Group by tipe unit untuk Ranking by Tipe Unit
  const typeRankings = [...unitRankings.reduce((map: Map<string, { type: string; count: number; sumPA: number; sumUA: number }>, u: any) => {
      const t = u.type || 'Unknown'
      if (!map.has(t)) map.set(t, { type: t, count: 0, sumPA: 0, sumUA: 0 })
      const entry = map.get(t)!
      entry.count++
      entry.sumPA += u.pa
      entry.sumUA += u.ua
      return map
    }, new Map<string, { type: string; count: number; sumPA: number; sumUA: number }>()).entries()
  ].map(([, entry]) => ({
    type: entry.type,
    pa: entry.sumPA / entry.count,
    ua: entry.sumUA / entry.count,
  })).sort((a: any, b: any) => b.pa - a.pa)

  const filteredRankings =
    selectedUnitType === 'All'
      ? unitRankings
      : unitRankings.filter((u: any) => u.type === selectedUnitType)

  // Aggregate breakdown data per kendaraan
  const breakdownRankings = (breakdownDetail?.data?.report ?? []).map((v: any) => {
    const months = v.months ?? []
    const n = months.length || 1
    const avgPA = months.reduce((s: number, m: any) => s + m.PA, 0) / n
    const totalBD = months.reduce((s: number, m: any) => s + (m.bdDays || 0), 0)
    return { vehicleId: v.vehicleId, nopol: v.nopol, type: v.type, pa: avgPA, bdDays: totalBD }
  }).sort((a: any, b: any) => b.bdDays - a.bdDays)

  const rawTrend = revenueDashboard?.data?.trend ?? []
  const forecastStats = forecastAccuracy?.data?.overall
  const statusDistribution = operationalMetrics?.data?.statusDistribution ?? []
  const accuracyVehicles = forecastAccuracy?.data?.byVehicle ?? []

  // Fill missing dates with zero so chart shows continuous timeline
  const trend = (() => {
    const trendMap = new Map<string, any>()
    rawTrend.forEach((item: any) => trendMap.set(item.date, item))
    const filled: any[] = []
    const s = new Date(startDate)
    const e = new Date(endDate)
    const iter = new Date(s)
    while (iter <= e) {
      const key = iter.toLocaleDateString('en-CA')
      const existing = trendMap.get(key)
      filled.push(existing || { date: key, revenue: 0, expense: 0, profit: 0, trips: 0 })
      iter.setDate(iter.getDate() + 1)
    }
    return filled
  })()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const trendRevenue = trend.map((item: any) => item.revenue || 0)
  const trendExpense = trend.map((item: any) => item.expense || 0)
  const globalMax = Math.max(...trend.flatMap((d: any) => [d.revenue || 0, d.expense || 0, d.profit || 0]), 1)
  const trendChartData = trend.map((d: any) => ({
    date: d.date,
    revenue: d.revenue != null && d.revenue > 0 ? (d.revenue / globalMax) * 100 : null,
    expense: d.expense != null && d.expense > 0 ? (d.expense / globalMax) * 100 : null,
    profit: d.profit != null && d.profit > 0 ? (d.profit / globalMax) * 100 : null,
  }))

  const allPA = [...unitRankings.map((u: any) => u.pa || 0), ...typeRankings.map((t: any) => t.pa || 0)]
  const allUA = [...unitRankings.map((u: any) => u.ua || 0), ...typeRankings.map((t: any) => t.ua || 0)]
  const maxPA = Math.max(...allPA, 1)
  const maxUA = Math.max(...allUA, 1)

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Dashboard Overview</h1>
            <p className="text-sm text-gray-500 mt-1">
              Ringkasan operasional dan revenue untuk periode yang dipilih.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <div className="flex items-center gap-2 bg-white rounded-full border border-slate-200 px-4 py-2 shadow-sm">
                <Filter className="w-4 h-4 text-slate-500" />
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="text-sm text-slate-700 bg-transparent outline-none cursor-pointer"
                >
                  <option value="">All Branches</option>
                  {branchesList.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm outline-none cursor-pointer"
            />
            <div className="flex items-center gap-2 bg-white rounded-full border border-slate-200 px-4 py-2 shadow-sm">
              <Calendar className="w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-sm text-slate-700 bg-transparent outline-none w-[130px]"
              />
              <span className="text-slate-400">—</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-sm text-slate-700 bg-transparent outline-none w-[130px]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 1 — Status Armada */}
      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Status Armada</h2>
            <p className="text-sm text-gray-500">
              Actual operation status, ranking fleet, dan breakdown status per kendaraan.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
            <p className="text-sm text-gray-500">PA %</p>
            <p className="text-3xl font-semibold text-slate-900">{safeToFixed(paValue, 1)}%</p>
            <p className="text-sm text-slate-500 mt-2">Physical availability rata-rata armada.</p>
          </div>

          <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
            <p className="text-sm text-gray-500">UA %</p>
            <p className="text-3xl font-semibold text-slate-900">{safeToFixed(uaValue, 1)}%</p>
            <p className="text-sm text-slate-500 mt-2">
              Utilization availability rata-rata armada.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
            <p className="text-sm text-gray-500">Total Armada</p>
            <p className="text-3xl font-semibold text-slate-900">{totalArmada}</p>
            <p className="text-sm text-slate-500 mt-2">Jumlah kendaraan aktif saat ini.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Ranking Unit</h3>
                <p className="text-sm text-gray-500">Top unit berdasarkan PA & UA.</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className={PA_LEGEND_CLASS}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>PA
                </span>
                <span className={UA_LEGEND_CLASS}>
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>UA
                </span>
              </div>
            </div>

            <div className="space-y-4 max-h-[360px] overflow-y-auto">
              {filteredRankings.map((unit: any, index: number) => {
                const pa = unit.pa ?? 0
                const ua = unit.ua ?? 0

                const widthPA = Math.max(5, (pa / maxPA) * 100)
                const widthUA = Math.max(5, (ua / maxUA) * 100)
                const paClass = getPAClass(pa)
                const uaClass = getUAClass(ua)

                return (
                  <div key={unit.nopol || index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">{unit.nopol}</span>
                      <span className="text-slate-500 text-xs">
                        PA {safeToFixed(pa, 1)}% · UA {safeToFixed(ua, 1)}%
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-2 rounded-full bg-gray-100">
                        <div
                          className={`h-2 rounded-full ${paClass}`}
                          style={{ width: `${widthPA}%` }}
                        />
                      </div>
                      <div className="h-2 rounded-full bg-gray-100">
                        <div
                          className={`h-2 rounded-full ${uaClass}`}
                          style={{ width: `${widthUA}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Ranking by Tipe Unit</h3>
                <p className="text-sm text-gray-500">Rata-rata PA & UA per tipe unit.</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className={PA_LEGEND_CLASS}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>PA
                </span>
                <span className={UA_LEGEND_CLASS}>
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>UA
                </span>
              </div>
            </div>
            <div className="h-80 overflow-x-auto">
              <div className="min-w-[800px] h-full">
                <svg viewBox={`0 0 ${Math.max(800, typeRankings.length * 80 + 80)} 280`} className="w-full h-full">
                  {/* Y-axis gridlines & labels */}
                  {[0, 25, 50, 75, 100].map((pct) => {
                    const y = 240 - (pct / 100) * 200
                    return (
                      <g key={pct}>
                        <line x1="60" y1={y} x2={Math.max(780, typeRankings.length * 80 + 80)} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                        <text x="55" y={y + 4} textAnchor="end" className="text-xs" fill="#9ca3af" fontSize="11">
                          {pct}%
                        </text>
                      </g>
                    )
                  })}
                  {/* Bars */}
                  {typeRankings.map((item: any, i: number) => {
                    const barWidth = 22
                    const gap = 4
                    const groupWidth = barWidth * 2 + gap
                    const spacing = 80
                    const startX = 80 + i * spacing + (spacing - groupWidth) / 2
                    const yBase = 240
                    const hPA = (item.pa / 100) * 200
                    const hUA = (item.ua / 100) * 200
                    const paFill = getPAColor(item.pa)
                    const uaFill = getUAColor(item.ua)
                    return (
                      <g key={item.type}>
                        <rect x={startX} y={yBase - hPA} width={barWidth} height={Math.max(hPA, 1)} rx="3" fill={paFill} />
                        <rect x={startX + barWidth + gap} y={yBase - hUA} width={barWidth} height={Math.max(hUA, 1)} rx="3" fill={uaFill} />
                        <text x={startX + barWidth / 2} y={yBase - hPA - 5} textAnchor="middle" fontSize="10" fill={paFill} fontWeight="600">
                          {safeToFixed(item.pa, 0)}%
                        </text>
                        <text x={startX + barWidth * 1.5 + gap} y={yBase - hUA - 5} textAnchor="middle" fontSize="10" fill={uaFill} fontWeight="600">
                          {safeToFixed(item.ua, 0)}%
                        </text>
                        <text x={startX + barWidth + gap / 2} y={yBase + 16} textAnchor="middle" fontSize="10" fill="#6b7280">
                          {item.type}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Breakdown Status per Kendaraan</h3>
              <p className="text-sm text-gray-500">PA% dan total BD Days per unit dari data aktual.</p>
            </div>
            <div className="inline-flex items-center gap-2 text-sm text-slate-500">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>PA
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>BD Days
              </span>
            </div>
          </div>
          <div className="h-80 overflow-x-auto">
            <div className="min-w-[700px] h-full">
              <svg viewBox={`0 0 ${Math.max(700, breakdownRankings.length * 75 + 80)} 280`} className="w-full h-full">
                {[0, 25, 50, 75, 100].map((pct) => {
                  const y = 240 - (pct / 100) * 200
                  return (
                    <g key={pct}>
                      <line x1="60" y1={y} x2={Math.max(680, breakdownRankings.length * 75 + 80)} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                      <text x="55" y={y + 4} textAnchor="end" fontSize="11" fill="#9ca3af">{pct}%</text>
                    </g>
                  )
                })}
                {breakdownRankings.map((item: any, i: number) => {
                  const barW = 20
                  const gap = 4
                  const spacing = 75
                  const x = 75 + i * spacing + (spacing - barW * 2 - gap) / 2
                  const yBase = 240
                  const maxBD = Math.max(...breakdownRankings.map((r: any) => r.bdDays || 0), 1)
                  const hPA = (item.pa / 100) * 200
                  const hBD = (item.bdDays / maxBD) * 200
                  const paFill = getPAColor(item.pa)
                  return (
                    <g key={item.nopol}>
                      <rect x={x} y={yBase - hPA} width={barW} height={Math.max(hPA, 1)} rx="3" fill={paFill} />
                      <rect x={x + barW + gap} y={yBase - hBD} width={barW} height={Math.max(hBD, 1)} rx="3" fill="#ef4444" />
                      <text x={x + barW / 2} y={yBase - hPA - 4} textAnchor="middle" fontSize="10" fill={paFill} fontWeight="600">
                        {safeToFixed(item.pa, 0)}%
                      </text>
                      <text x={x + barW * 1.5 + gap} y={yBase - hBD - 4} textAnchor="middle" fontSize="10" fill="#ef4444" fontWeight="600">
                        {item.bdDays}
                      </text>
                      <text x={x + barW + gap / 2} y={yBase + 16} textAnchor="middle" fontSize="10" fill="#6b7280">
                        {item.nopol}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Section — PA/UA/Prod per Branch */}
      {branchPerfList.length > 0 && (
        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Kinerja per Cabang</h2>
            <p className="text-sm text-gray-500 mt-1">Bar chart PA dan UA per cabang.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {branchPerfList.map((branch) => {
              const maxVal = Math.max(branch.pa, branch.ua, 1)
              const hPA = (branch.pa / (maxVal * 1.3)) * 160
              const hUA = (branch.ua / (maxVal * 1.3)) * 160
              return (
                <div key={branch.branchId} className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
                  <div className="mb-2">
                    <h3 className="font-semibold text-gray-800">{branch.branchName}</h3>
                    <p className="text-xs text-gray-400">{branch.vehicleCount} unit</p>
                  </div>
                  <div className="flex items-end justify-center gap-3" style={{ height: '180px' }}>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold text-emerald-600">{safeToFixed(branch.pa, 1)}%</span>
                      <div className="w-8 rounded-t-md" style={{ height: `${Math.max(hPA, 2)}px`, backgroundColor: getPAColor(branch.pa) }} />
                      <span className="text-[10px] text-gray-400">PA</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold" style={{ color: getUAColor(branch.ua) }}>{safeToFixed(branch.ua, 1)}%</span>
                      <div className="w-8 rounded-t-md" style={{ height: `${Math.max(hUA, 2)}px`, backgroundColor: getUAColor(branch.ua) }} />
                      <span className="text-[10px] text-gray-400">UA</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Section 2 — Revenue */}
      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Revenue</h2>
            <p className="text-sm text-gray-500">
              Tren profit harian, revenue vs expense, dan performa unit.
            </p>
          </div>
        </div>

        {/* Trend Profit Harian — full width, modern area chart */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Trend Profit Harian</h3>
              <p className="text-sm text-gray-500">Multi-series area chart — Revenue, Expense & Profit.</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>Revenue
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-blue-500"></span>Expense
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-orange-500"></span>Profit
              </span>
            </div>
          </div>
          <div className="h-80 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="revGradChart" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="expGradChart" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="prfGradChart" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickFormatter={(val) => formatShortDate(val)}
                  interval={4}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}%`}
                  ticks={[0, 25, 50, 75, 100]}
                />
                <Tooltip
                  formatter={(value: any, name: any) => {
                    const labels: Record<string, string> = { revenue: 'Revenue', expense: 'Expense', profit: 'Profit' }
                    const actual = value != null ? Math.round((value / 100) * globalMax) : 0
                    return [`Rp ${actual.toLocaleString('id-ID')} (${value != null ? Number(value).toFixed(1) : '-'}%)`, labels[name] || name] as any
                  }}
                  labelFormatter={(label) => formatShortDate(label)}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: 12,
                  }}
                  cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#revGradChart)" fillOpacity={1} strokeWidth={2} dot={false} connectNulls={false} />
                <Area type="monotone" dataKey="expense" stroke="#3b82f6" fill="url(#expGradChart)" fillOpacity={1} strokeWidth={2} dot={false} connectNulls={false} />
                <Area type="monotone" dataKey="profit" stroke="#f97316" fill="url(#prfGradChart)" fillOpacity={1} strokeWidth={2} dot={false} connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 2 — dua container sisanya */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Trend Pendapatan vs Pengeluaran
            </h3>
            <div className="h-72 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <svg viewBox="0 0 300 120" className="w-full h-full" preserveAspectRatio="none">
                <path
                  d={`M20 100 ${trendExpense
                    .map((_: number, index: number) => {
                      const x = 20 + (index * 260) / Math.max(trendExpense.length - 1, 1)
                      const y = 100 - normalizeSeries(trendExpense)[index] * 0.7
                      return `L${x} ${y}`
                    })
                    .join(' ')} L280 100 Z`}
                  fill="rgba(37, 99, 235, 0.15)"
                />
                <path
                  d={`M20 100 ${trendRevenue
                    .map((_: number, index: number) => {
                      const x = 20 + (index * 260) / Math.max(trendRevenue.length - 1, 1)
                      const y = 100 - normalizeSeries(trendRevenue)[index] * 0.7
                      return `L${x} ${y}`
                    })
                    .join(' ')} L280 100 Z`}
                  fill="rgba(16, 118, 110, 0.18)"
                />
              </svg>
              <div className="mt-4 flex items-center gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-600"></span>Pendapatan
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>Pengeluaran
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Trend Profit Harian per Unit</h3>
            <div className="space-y-4 max-h-[340px] overflow-y-auto">
              <div className="flex items-center justify-between text-sm text-slate-500 mb-3">
                <span>Unit</span>
                <span>Revenue</span>
              </div>
              {rankingUnits.map((unit: any, index: number) => {
                const actual = unit.revenue || 0
                const budget = unit.budget || Math.max(actual * 1.1, 1)
                return (
                  <div key={unit.nopol || index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-slate-700">
                      <span>{unit.nopol}</span>
                      <span>{formatMoney(actual)}</span>
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Revenue</span>
                        <span>{Math.round((actual / budget) * 100)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-2 bg-emerald-500"
                          style={{ width: `${Math.min((actual / budget) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Budget</span>
                        <span>{formatMoney(budget)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-2 bg-slate-400" style={{ width: '100%' }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Section 2B — GPS Tracking Dashboard */}
      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-semibold text-gray-800">GPS Tracking</h2>
            <p className="text-sm text-gray-500">
              Ringkasan data GPS tracking — jarak tempuh, waktu operasional, dan kecepatan.
            </p>
          </div>
        </div>

        {gpsDashboard?.data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
              <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-500">Total Jarak Tempuh</p>
                  <MapPin className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-3xl font-semibold text-slate-900">
                  {(gpsDashboard.data.summary.totalDistance || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })} km
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  {gpsDashboard.data.summary.vehicleCount} kendaraan dalam {gpsDashboard.data.trend.length} hari.
                </p>
              </div>
              <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-500">Total Drive Time</p>
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-3xl font-semibold text-slate-900 font-mono">
                  {(() => {
                    const sec = gpsDashboard.data.summary.totalDrivingTime || 0
                    return `${Math.floor(sec / 3600)}j ${Math.floor((sec % 3600) / 60)}m`
                  })()}
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  Moving: {(() => { const s = gpsDashboard.data.summary.totalMovingTime || 0; return `${Math.floor(s / 3600)}j ${Math.floor((s % 3600) / 60)}m` })()} &bull;
                  Park: {(() => { const s = gpsDashboard.data.summary.totalParkingTime || 0; return `${Math.floor(s / 3600)}j ${Math.floor((s % 3600) / 60)}m` })()}
                </p>
              </div>
              <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-500">Rata-rata Max Speed</p>
                  <ArrowUpRight className="w-4 h-4 text-orange-500" />
                </div>
                <p className="text-3xl font-semibold text-slate-900">
                  {gpsDashboard.data.summary.avgMaxSpeed > 0 ? `${gpsDashboard.data.summary.avgMaxSpeed.toFixed(1)} km/h` : '-'}
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  Total idle: {(() => { const s = gpsDashboard.data.summary.totalIdleTime || 0; return `${Math.floor(s / 60)}m` })()}
                </p>
              </div>
              <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-500">Rata-rata per Hari</p>
                  <Calendar className="w-4 h-4 text-purple-500" />
                </div>
                <p className="text-3xl font-semibold text-slate-900">
                  {gpsDashboard.data.trend.length > 0
                    ? `${((gpsDashboard.data.summary.totalDistance || 0) / gpsDashboard.data.trend.length).toFixed(1)} km`
                    : '-'}
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  {gpsDashboard.data.summary.recordCount} record GPS tercatat.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Trend Jarak Tempuh Harian</h3>
                    <p className="text-sm text-gray-500">Total distance per hari selama periode terpilih.</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>Distance (km)
                  </span>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={gpsDashboard.data.trend} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                      <defs>
                        <linearGradient id="gpsDistGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickFormatter={(val) => formatShortDate(val)}
                        interval={Math.max(1, Math.floor(gpsDashboard.data.trend.length / 8))}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `${val.toLocaleString()}`}
                      />
                      <Tooltip
                        formatter={(value: any) => [`${Number(value).toLocaleString('id-ID', { maximumFractionDigits: 1 })} km`, 'Distance']}
                        labelFormatter={(label) => formatShortDate(label)}
                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
                        cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }}
                      />
                      <Area type="monotone" dataKey="totalDistance" stroke="#10b981" fill="url(#gpsDistGrad)" fillOpacity={1} strokeWidth={2} dot={{ r: 3, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} connectNulls={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Top 5 Jarak Tempuh</h3>
                </div>
                {gpsDashboard.data.topVehicles.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">Tidak ada data untuk periode ini.</p>
                ) : (
                  <div className="space-y-4">
                    {gpsDashboard.data.topVehicles.map((v: any, i: number) => {
                      const maxDist = gpsDashboard.data.topVehicles[0]?.totalDistance || 1
                      const pct = (v.totalDistance / maxDist) * 100
                      return (
                        <div key={v.nopol} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-blue-500' : i === 2 ? 'bg-orange-500' : 'bg-slate-400'
                              }`}>{i + 1}</span>
                              <span className="font-medium text-slate-800">{v.nopol}</span>
                              <span className="text-xs text-slate-400">{v.vehicleType}</span>
                            </div>
                            <span className="font-semibold text-slate-900">{v.totalDistance.toFixed(1)} km</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>Drive: {Math.floor(v.totalDrivingTime / 3600)}j</span>
                            <span>Rata-rata: {(v.totalDistance / (gpsDashboard.data.trend.length || 1)).toFixed(1)} km/hari</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mt-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Moving Time Analytic</h3>
                  <p className="text-sm text-gray-500">Distribusi waktu Moving, Parking, dan Idle per hari.</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>Moving
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-orange-500"></span>Parkir
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-purple-500"></span>Idle
                  </span>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={gpsDashboard.data.trend} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <defs>
                      <linearGradient id="gpsMovingGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gpsParkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gpsIdleGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickFormatter={(val) => formatShortDate(val)}
                      interval={Math.max(1, Math.floor(gpsDashboard.data.trend.length / 8))}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${Math.round(val / 3600)}j`}
                    />
                    <Tooltip
                      formatter={(value: any, name: any) => {
                        const labels: Record<string, string> = { movingTime: 'Moving', parkingTime: 'Parkir', idleTime: 'Idle' }
                        const sec = Number(value) || 0
                        const h = Math.floor(sec / 3600)
                        const m = Math.floor((sec % 3600) / 60)
                        return [`${h}j ${String(m).padStart(2, '0')}m`, labels[name] || name]
                      }}
                      labelFormatter={(label) => formatShortDate(label)}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
                      cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }}
                    />
                    <Area type="monotone" dataKey="movingTime" stroke="#10b981" fill="url(#gpsMovingGrad)" fillOpacity={1} strokeWidth={2} dot={false} connectNulls={false} />
                    <Area type="monotone" dataKey="parkingTime" stroke="#f97316" fill="url(#gpsParkGrad)" fillOpacity={1} strokeWidth={2} dot={false} connectNulls={false} />
                    <Area type="monotone" dataKey="idleTime" stroke="#a855f7" fill="url(#gpsIdleGrad)" fillOpacity={1} strokeWidth={2} dot={false} connectNulls={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Section 3 — Trend Analytic */}
      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Trend Analytic</h2>
            <p className="text-sm text-gray-500">
              Analisa unit berdasarkan status breakdown, accuracy, dan group status.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-800">Forecast Accuracy</h3>
            </div>
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Akurasi keseluruhan</span>
                <span>{forecastStats?.accuracy?.toFixed(1) ?? 0}%</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Total akurat</span>
                <span>{forecastStats?.accurate ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Total deviasi</span>
                <span>{forecastStats ? forecastStats.total - forecastStats.accurate : 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-sky-600" />
              <h3 className="text-lg font-semibold text-gray-800">Top Accuracy per Unit</h3>
            </div>
            <div className="mt-6 space-y-3">
              {accuracyVehicles.slice(0, 5).map((vehicle: any, index: number) => (
                <div key={`${vehicle.nopol}-${index}`} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800">{vehicle.nopol}</p>
                    <p className="text-xs text-slate-500">
                      Accuracy {vehicle.accuracy.toFixed(1)}%
                    </p>
                  </div>
                  <span className="text-sm text-slate-600">{vehicle.accuracy.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-3">
              <ArrowUpRight className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-800">Group Status Breakdown</h3>
            </div>
            <div className="mt-6 space-y-3">
              {statusDistribution.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Tidak ada data untuk periode ini.</p>
              ) : (
                statusDistribution.slice(0, 7).map((item: any, index: number) => {
                  const label = STATUS_LABEL[item.code] ?? item.code
                  const barColor = STATUS_COLOR[item.code] ?? 'bg-slate-500'
                  return (
                    <div key={`${item.code}-${index}`} className="space-y-1">
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${barColor}`} />
                          <span>{label}</span>
                          <span className="text-xs text-slate-400">({item.code})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">{item.count} records</span>
                          <span className="font-medium">{item.percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${barColor}`}
                          style={{ width: `${Math.min(item.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}