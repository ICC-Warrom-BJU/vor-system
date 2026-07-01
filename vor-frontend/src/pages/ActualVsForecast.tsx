import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Calendar, CheckCircle2, Clock, GitCompare, Target, XCircle } from 'lucide-react'

const StatusColors: Record<string, string> = {
  UTI: 'bg-green-100 text-green-800 border-green-200',
  RFU: 'bg-orange-100 text-orange-800 border-orange-200',
  BD: 'bg-red-100 text-red-800 border-red-200',
  C: 'bg-gray-100 text-gray-800 border-gray-200',
  PA: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  UA: 'bg-blue-100 text-blue-800 border-blue-200',
}

type CompareResult = 'MATCH' | 'CHANGED' | 'WAITING_ACTUAL' | 'UNFORECASTED' | 'NO_DATA'

interface Vehicle {
  id: string
  nopol: string
  vehicleType?: string
  customer?: {
    name?: string
  }
  driver?: {
    name?: string
  }
}

interface StatusRecord {
  vehicleId: string
  statusCode?: string
  status?: {
    code?: string
    description?: string
  }
  confidence?: number
  notes?: string
  vehicle?: Vehicle
}

interface ComparisonRow {
  vehicleId: string
  nopol: string
  vehicleType: string
  customer: string
  driver: string
  forecastStatus: string
  actualStatus: string
  confidence: number | null
  result: CompareResult
  notes: string
}

const getStatusCode = (record?: StatusRecord) => record?.status?.code || record?.statusCode || ''

const resultMeta: Record<CompareResult, { label: string; className: string }> = {
  MATCH: {
    label: 'Match',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  CHANGED: {
    label: 'Changed',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  WAITING_ACTUAL: {
    label: 'Belum Actual',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  UNFORECASTED: {
    label: 'Tanpa Forecast',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  NO_DATA: {
    label: 'No Data',
    className: 'bg-slate-50 text-slate-600 border-slate-200',
  },
}

function StatusBadge({ code }: { code: string }) {
  if (!code) {
    return <span className="inline-flex min-w-16 justify-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-500">-</span>
  }

  return (
    <span className={`inline-flex min-w-16 justify-center rounded-md border px-2 py-1 text-xs font-bold ${StatusColors[code] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
      {code}
    </span>
  )
}

export default function ActualVsForecast() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [resultFilter, setResultFilter] = useState<'ALL' | CompareResult>('ALL')
  const [searchNopol, setSearchNopol] = useState('')
  const [searchStatus, setSearchStatus] = useState('')
  const [searchType, setSearchType] = useState('')

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/vehicles', {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
  })

  const { data: actualStatus } = useQuery({
    queryKey: ['actualStatusCompare', selectedDate],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/actual-status/date?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
  })

  const { data: forecastStatus } = useQuery({
    queryKey: ['forecastStatusCompare', selectedDate],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/forecast-status/date?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
  })

  const { data: masterStatuses } = useQuery({
    queryKey: ['masterStatuses'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/master-status', {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
  })

  const comparisonRows = useMemo(() => {
    const vehicleMap = new Map<string, Vehicle>()
    const actualMap = new Map<string, StatusRecord>()
    const forecastMap = new Map<string, StatusRecord>()

    ;(vehicles?.data || []).forEach((vehicle: Vehicle) => vehicleMap.set(vehicle.id, vehicle))
    ;(actualStatus?.data || []).forEach((status: StatusRecord) => {
      actualMap.set(status.vehicleId, status)
      if (status.vehicle && !vehicleMap.has(status.vehicleId)) vehicleMap.set(status.vehicleId, status.vehicle)
    })
    ;(forecastStatus?.data || []).forEach((status: StatusRecord) => {
      forecastMap.set(status.vehicleId, status)
      if (status.vehicle && !vehicleMap.has(status.vehicleId)) vehicleMap.set(status.vehicleId, status.vehicle)
    })

    return Array.from(vehicleMap.values())
      .sort((a, b) => a.nopol.localeCompare(b.nopol))
      .map((vehicle): ComparisonRow => {
        const actual = actualMap.get(vehicle.id)
        const forecast = forecastMap.get(vehicle.id)
        const actualCode = getStatusCode(actual)
        const forecastCode = getStatusCode(forecast)

        let result: CompareResult = 'NO_DATA'
        if (forecastCode && actualCode) {
          result = forecastCode === actualCode ? 'MATCH' : 'CHANGED'
        } else if (forecastCode && !actualCode) {
          result = 'WAITING_ACTUAL'
        } else if (!forecastCode && actualCode) {
          result = 'UNFORECASTED'
        }

        return {
          vehicleId: vehicle.id,
          nopol: vehicle.nopol,
          vehicleType: vehicle.vehicleType || '-',
          customer: vehicle.customer?.name || '-',
          driver: vehicle.driver?.name || '-',
          forecastStatus: forecastCode,
          actualStatus: actualCode,
          confidence: typeof forecast?.confidence === 'number' ? forecast.confidence : null,
          result,
          notes: actual?.notes || forecast?.notes || '',
        }
      })
  }, [actualStatus?.data, forecastStatus?.data, vehicles?.data])

  const summary = useMemo(() => {
    const compared = comparisonRows.filter((row) => row.forecastStatus && row.actualStatus)
    const matches = comparisonRows.filter((row) => row.result === 'MATCH').length
    const changed = comparisonRows.filter((row) => row.result === 'CHANGED').length
    const waitingActual = comparisonRows.filter((row) => row.result === 'WAITING_ACTUAL').length
    const unforecasted = comparisonRows.filter((row) => row.result === 'UNFORECASTED').length
    const accuracy = compared.length ? (matches / compared.length) * 100 : 0

    return {
      total: comparisonRows.length,
      compared: compared.length,
      matches,
      changed,
      waitingActual,
      unforecasted,
      accuracy,
    }
  }, [comparisonRows])

  const filteredRows = useMemo(() => {
    let rows = comparisonRows
    if (resultFilter !== 'ALL') rows = rows.filter((row) => row.result === resultFilter)
    return rows.filter((row) => {
      const matchesNopol = !searchNopol || row.nopol.toLowerCase().includes(searchNopol.toLowerCase())
      const matchesStatus = !searchStatus || row.forecastStatus === searchStatus || row.actualStatus === searchStatus
      const matchesType = !searchType || row.vehicleType.toLowerCase().includes(searchType.toLowerCase())
      return matchesNopol && matchesStatus && matchesType
    })
  }, [comparisonRows, resultFilter, searchNopol, searchStatus, searchType])

  const resultOptions: Array<'ALL' | CompareResult> = ['ALL', 'MATCH', 'CHANGED', 'WAITING_ACTUAL', 'UNFORECASTED', 'NO_DATA']

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Actual vs Forecast</h1>
          <p className="text-sm text-gray-500">Bandingkan rencana forecast dengan status aktual harian.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Akurasi</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{summary.accuracy.toFixed(1)}%</p>
              <p className="text-xs text-gray-500">{summary.compared} unit dibandingkan</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Target className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Match</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{summary.matches}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Changed</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{summary.changed}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Perlu Review</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{summary.waitingActual + summary.unforecasted}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-2 lg:ml-auto">
            {resultOptions.map((option) => {
              const isActive = resultFilter === option
              const label = option === 'ALL' ? 'Semua' : resultMeta[option].label

              return (
                <button
                  key={option}
                  onClick={() => setResultFilter(option)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    isActive ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="Cari nopol..."
            value={searchNopol}
            onChange={(e) => setSearchNopol(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full sm:w-44"
          />
          <select
            value={searchStatus}
            onChange={(e) => setSearchStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full sm:w-44"
          >
            <option value="">Semua Status</option>
            {masterStatuses?.data?.map((ms: any) => (
              <option key={ms.code} value={ms.code}>{ms.code}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Cari tipe unit..."
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full sm:w-44"
          />
          <span className="text-xs text-gray-500 sm:ml-auto">{filteredRows.length} dari {summary.total} unit</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Detail Perbandingan</h2>
            <p className="text-xs text-gray-500">{filteredRows.length} dari {summary.total} unit ditampilkan</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="h-4 w-4" />
            <span>Actual dan forecast menggunakan tanggal yang sama.</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Nopol</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Tipe</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Driver</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Forecast</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Actual</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Confidence</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Hasil</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredRows.length > 0 ? (
                filteredRows.map((row) => (
                  <tr key={row.vehicleId} className="hover:bg-gray-50">
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-bold text-gray-900">{row.nopol}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.vehicleType}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.customer}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.driver}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge code={row.forecastStatus} /></td>
                    <td className="px-4 py-3 text-center"><StatusBadge code={row.actualStatus} /></td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{row.confidence !== null ? `${row.confidence}%` : '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-bold ${resultMeta[row.result].className}`}>
                        {resultMeta[row.result].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{row.notes || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <GitCompare className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                    <p className="text-sm font-medium">Tidak ada data untuk filter ini</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
