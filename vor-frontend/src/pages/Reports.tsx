import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Download, TrendingUp, BarChart3, Gauge, AlertTriangle, PieChart } from 'lucide-react'

// Format Rupiah lengkap dengan pemisah ribuan, mis. "Rp. 15.000.000"
const formatRp = (n: number) => 'Rp. ' + Math.round(n || 0).toLocaleString('id-ID')

const REPORT_TABS = [
  { id: 'vehicle-performance', label: 'Performa Kendaraan', icon: TrendingUp },
  { id: 'category-performance', label: 'Performa Kategori Kendaraan', icon: Gauge },
  { id: 'revenue-analysis', label: 'Analisis Revenue', icon: BarChart3 },
  { id: 'customer-analysis', label: 'Analisa Customer', icon: PieChart },
  { id: 'kpi-trend', label: 'Trend KPI', icon: TrendingUp },
  { id: 'unit-performance', label: 'Unit Performance', icon: Gauge },
  { id: 'breakdown-detail', label: 'Breakdown Detail', icon: AlertTriangle },
  { id: 'utilization-analysis', label: 'Utilisasi Analisis', icon: PieChart },
] as const

export default function Reports() {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [activeTab, setActiveTab] = useState('vehicle-performance')
  const [vehicleType, setVehicleType] = useState('')
  const [branchId, setBranchId] = useState('')

  // Indikator tab yang meluncur: ukur posisi/lebar tab aktif.
  const tabsNavRef = useRef<HTMLElement>(null)
  const [indicator, setIndicator] = useState({ left: 0, top: 0, width: 0, height: 0 })
  useEffect(() => {
    const nav = tabsNavRef.current
    if (!nav) return
    const update = () => {
      const btn = nav.querySelector(`[data-tab="${activeTab}"]`) as HTMLElement | null
      if (btn) setIndicator({ left: btn.offsetLeft, top: btn.offsetTop, width: btn.offsetWidth, height: btn.offsetHeight })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [activeTab])

  const filterParams = (extra = '') => {
    let q = `startDate=${startDate}&endDate=${endDate}`
    if (vehicleType) q += `&vehicleType=${vehicleType}`
    if (branchId) q += `&branchId=${branchId}`
    if (extra) q += `&${extra}`
    return q
  }

  const { data: vehicleTypes } = useQuery({
    queryKey: ['vehicleTypes'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/vehicle-types', { headers: { Authorization: `Bearer ${token}` } })
      return res.json()
    },
  })

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/branches', { headers: { Authorization: `Bearer ${token}` } })
      return res.json()
    },
  })

  const handleExport = async (format: 'csv' | 'html') => {
    const token = localStorage.getItem('token')
    let endpoint = ''
    
    switch (activeTab) {
      case 'vehicle-performance':
        endpoint = `/api/export/vehicle-performance?${filterParams('format=' + format)}`
        break
      case 'revenue-analysis':
        endpoint = `/api/export/revenue?${filterParams('format=' + format)}`
        break
      case 'kpi-trend':
        endpoint = `/api/export/kpi?${filterParams('format=' + format)}`
        break
      case 'unit-performance':
        endpoint = `/api/export/unit-performance?${filterParams('format=' + format)}`
        break
      case 'breakdown-detail':
        endpoint = `/api/export/breakdown-detail?${filterParams('format=' + format)}`
        break
    }

    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    })
    
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${activeTab}-${startDate}-${endDate}.${format}`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const queryOpts = (key: string, url: string, tab: string) => ({
    queryKey: [key, startDate, endDate, vehicleType, branchId],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      return response.json()
    },
    enabled: activeTab === tab,
  })

  const { data: vehiclePerformance } = useQuery(queryOpts('vehiclePerformance', `/api/reports/vehicle-performance?${filterParams('sortBy=profit')}`, 'vehicle-performance'))
  const { data: categoryPerformance } = useQuery(queryOpts('categoryPerformance', `/api/reports/category-performance?${filterParams('sortBy=revenue')}`, 'category-performance'))
  const { data: revenueAnalysis } = useQuery(queryOpts('revenueAnalysis', `/api/reports/revenue-analysis?${filterParams('groupBy=day')}`, 'revenue-analysis'))
  const { data: breakdownDetail } = useQuery(queryOpts('breakdownDetail', `/api/reports/breakdown-detail?${filterParams()}`, 'breakdown-detail'))
  const { data: unitPerformance } = useQuery(queryOpts('unitPerformance', `/api/reports/unit-performance?${filterParams()}`, 'unit-performance'))
  const { data: kpiTrend } = useQuery(queryOpts('kpiTrend', `/api/reports/kpi-trend?${filterParams()}`, 'kpi-trend'))
  const { data: customerAnalysis } = useQuery(queryOpts('customerAnalysis', `/api/reports/customer-analysis?${filterParams()}`, 'customer-analysis'))
  const { data: utilizationAnalysis } = useQuery(queryOpts('utilizationAnalysis', `/api/reports/utilization-analysis?${filterParams()}`, 'utilization-analysis'))

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Laporan</h1>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-5 h-5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => handleExport('html')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-5 h-5" />
            <span>Export HTML</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <span className="text-gray-500">s/d</span>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <select
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
          >
            <option value="">Semua Tipe</option>
            {vehicleTypes?.data?.map((vt: any) => (
              <option key={vt.id} value={vt.name}>{vt.name}</option>
            ))}
          </select>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
          >
            <option value="">Semua Cabang</option>
            {branches?.data?.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-100">
          <nav ref={tabsNavRef} className="relative flex gap-3 px-4 py-2 overflow-x-auto">
            {/* Pill glass yang meluncur di belakang tab aktif */}
            <span
              className="pointer-events-none absolute z-0 rounded-xl border border-blue-400/40 bg-blue-500/10 shadow-sm backdrop-blur-sm transition-all duration-300 ease-out motion-reduce:transition-none"
              style={{
                left: indicator.left,
                top: indicator.top + 5,
                width: indicator.width,
                height: Math.max(0, indicator.height - 10),
                opacity: indicator.width ? 1 : 0,
              }}
            />
            {REPORT_TABS.map((t) => {
              const Icon = t.icon
              const active = activeTab === t.id
              return (
                <button
                  key={t.id}
                  data-tab={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`relative z-10 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
                    active ? 'text-blue-700' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span>{t.label}</span>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

        <div key={activeTab} className="p-6 animate-tab-enter">
          {activeTab === 'vehicle-performance' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kendaraan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trip
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      BOP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Biaya Lain
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gross Profit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PA
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      REV. A vs T
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vehiclePerformance?.data?.report?.map((item: any) => (
                    <tr key={item.vehicleId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.nopol}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.metrics?.totalTrips || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatRp(item.metrics?.totalRevenue || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatRp(item.metrics?.targetRevenue || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">
                        {formatRp(item.metrics?.totalBop || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">
                        {formatRp(item.metrics?.totalOther || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatRp(item.metrics?.totalProfit || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.kpi?.KPA?.toFixed(1)}%
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${(item.metrics?.revAchievement || 0) >= 100 ? 'text-emerald-600' : 'text-gray-600'}`}>
                        {(item.metrics?.revAchievement || 0).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'category-performance' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trip</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BOP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Biaya Lain</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Profit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PA</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">REV. A vs T</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categoryPerformance?.data?.report?.length > 0 ? (
                    categoryPerformance.data.report.map((item: any) => (
                      <tr key={item.type} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.unitCount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.metrics?.totalTrips || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatRp(item.metrics?.totalRevenue || 0)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatRp(item.metrics?.targetRevenue || 0)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">{formatRp(item.metrics?.totalBop || 0)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">{formatRp(item.metrics?.totalOther || 0)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatRp(item.metrics?.totalProfit || 0)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.kpi?.KPA?.toFixed(1)}%</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${(item.metrics?.revAchievement || 0) >= 100 ? 'text-emerald-600' : 'text-gray-600'}`}>{(item.metrics?.revAchievement || 0).toFixed(1)}%</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={10} className="px-6 py-12 text-center text-gray-500">Belum ada data pada rentang tanggal ini.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'revenue-analysis' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Periode
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trip
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      BOP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Biaya Lain
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gross Profit
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {revenueAnalysis?.data?.analysis?.map((item: any) => (
                    <tr key={item.period} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.period}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.trips || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatRp(item.revenue || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">
                        {formatRp(item.fuel || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">
                        {formatRp(item.other || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatRp(item.profit || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'customer-analysis' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trip</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BOP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Biaya Lain</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Profit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Share</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customerAnalysis?.data?.report?.length > 0 ? (
                    customerAnalysis.data.report.map((item: any) => (
                      <tr key={item.customerId || 'unassigned'} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.customerName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.unitCount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.trips}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatRp(item.revenue)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">{formatRp(item.bop)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">{formatRp(item.other)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatRp(item.grossProfit)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.margin}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.share}%</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={9} className="px-6 py-12 text-center text-gray-500">Belum ada data revenue pada rentang tanggal ini.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'kpi-trend' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PA
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      UA
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PROD
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {kpiTrend?.data?.daily?.trend?.map((item: any) => (
                    <tr key={item.date} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.KPA?.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.UA?.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.PA?.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'unit-performance' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kendaraan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipe
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bulan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PA %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      UA %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PROD %
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {unitPerformance?.data?.report?.map((vehicle: any) =>
                    vehicle.months?.map((m: any) => (
                      <tr key={`${vehicle.vehicleId}-${m.month}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {vehicle.nopol}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vehicle.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {m.month}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {m.PA.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {m.UA.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {m.Prod.toFixed(1)}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'breakdown-detail' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kendaraan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipe
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bulan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PA %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      BD Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Catatan
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {breakdownDetail?.data?.report?.map((vehicle: any) =>
                    vehicle.months?.map((m: any) => (
                      <tr key={`${vehicle.vehicleId}-${m.month}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {vehicle.nopol}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vehicle.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {m.month}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {m.PA.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {m.bdDays}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate" title={m.notes}>
                          {m.notes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'utilization-analysis' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kendaraan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">PA%</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">UA%</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">BREAKDOWN%</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">DELAY%</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">READY FOR USE%</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">UNR%</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">NWD%</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">DNA%</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {utilizationAnalysis?.data?.report?.map((item: any) => {
                    const pa = item.PA
                    const paColor = pa >= 95 ? 'bg-green-100 text-green-700 font-semibold' : pa >= 80 ? 'bg-yellow-100 text-yellow-700 font-semibold' : pa >= 41 ? 'bg-orange-100 text-orange-700 font-semibold' : 'bg-red-100 text-red-700 font-semibold'
                    const ua = item.UA
                    const uaColor = ua >= 80 ? 'bg-green-100 text-green-700 font-semibold' : ua >= 60 ? 'bg-yellow-100 text-yellow-700 font-semibold' : ua >= 40 ? 'bg-orange-100 text-orange-700 font-semibold' : 'bg-red-100 text-red-700 font-semibold'
                    return (
                    <tr key={item.vehicleId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.nopol}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.vehicleType}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-center ${paColor}`}>{pa.toFixed(1)}%</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-center ${uaColor}`}>{ua.toFixed(1)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{item.breakdownPct.toFixed(1)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{item.delayPct.toFixed(1)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{item.rfuPct.toFixed(1)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{item.unrPct.toFixed(1)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{item.nwdPct.toFixed(1)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{item.dnaPct.toFixed(1)}%</td>
                    </tr>
                  )})}
                </tbody>
                {utilizationAnalysis?.data?.report?.length > 0 && (() => {
                  const items = utilizationAnalysis.data.report
                  const avg = (field: string) => items.length > 0 ? (items.reduce((s: number, i: any) => s + (i[field] || 0), 0) / items.length) : 0
                  return (
                    <tfoot className="bg-gray-50 font-semibold">
                      <tr>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700" colSpan={2}>Rata-rata</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 text-center">{avg('PA').toFixed(1)}%</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 text-center">{avg('UA').toFixed(1)}%</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 text-center">{avg('breakdownPct').toFixed(1)}%</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 text-center">{avg('delayPct').toFixed(1)}%</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 text-center">{avg('rfuPct').toFixed(1)}%</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 text-center">{avg('unrPct').toFixed(1)}%</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 text-center">{avg('nwdPct').toFixed(1)}%</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 text-center">{avg('dnaPct').toFixed(1)}%</td>
                      </tr>
                    </tfoot>
                  )
                })()}
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}