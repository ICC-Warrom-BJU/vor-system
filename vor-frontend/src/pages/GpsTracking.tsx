import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Calendar, Pencil, Trash2, Upload, Download, RefreshCw } from 'lucide-react'

function formatTime(seconds: number) {
  if (!seconds && seconds !== 0) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function parseTimeToSeconds(val: string) {
  if (!val) return 0
  const parts = val.split(':')
  if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2])
  if (parts.length === 2) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60
  return parseInt(val) || 0
}

function formatDistance(km: number) {
  if (km == null) return '-'
  return `${km.toFixed(1)} km`
}

export default function GpsTracking() {
  const today = new Date().toISOString().split('T')[0]
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [branchId, setBranchId] = useState('')
  const [filterNopol, setFilterNopol] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    vehicleId: '',
    date: today,
    totalDistance: '',
    drivingTime: '',
    movingTime: '',
    parkingTime: '',
    idleTime: '',
    maxSpeed: '',
    ratioSpeed: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [editItem, setEditItem] = useState<any | null>(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importMessage, setImportMessage] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const importFileRef = useRef<HTMLInputElement>(null)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncResult, setSyncResult] = useState<{ total: number; success: number; failed: number; errors: string[] } | null>(null)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [syncNopol, setSyncNopol] = useState('')
  const [syncBulan, setSyncBulan] = useState(new Date().getMonth() + 1)
  const [syncTahun, setSyncTahun] = useState(new Date().getFullYear())
  const queryClient = useQueryClient()
  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } })()
  const isAdmin = user.role === 'ADMIN'
  const isPlannerOrAbove = ['ADMIN', 'PLANNER'].includes(user.role || '')

  const queryParams = `startDate=${startDate}&endDate=${endDate}${branchId ? `&branchId=${branchId}` : ''}${filterNopol ? `&nopol=${encodeURIComponent(filterNopol)}` : ''}`

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/vehicles', { headers: { Authorization: `Bearer ${token}` } })
      return response.json()
    },
  })

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/branches', { headers: { Authorization: `Bearer ${token}` } })
      return response.json()
    },
  })

  const { data: gpsData } = useQuery({
    queryKey: ['gpsData', startDate, endDate, branchId, filterNopol],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/gps/date?${queryParams}`, { headers: { Authorization: `Bearer ${token}` } })
      return response.json()
    },
  })

  const records = gpsData?.data?.records || []
  const totals = gpsData?.data?.totals || null
  const totalPages = Math.ceil(records.length / pageSize)
  const paginatedRecords = records.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!formData.vehicleId) { setError('Kendaraan harus dipilih'); return }
    if (!formData.totalDistance || isNaN(parseFloat(formData.totalDistance))) { setError('Total distance harus berupa angka'); return }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/gps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          vehicleId: formData.vehicleId,
          date: formData.date,
          totalDistance: parseFloat(formData.totalDistance),
          drivingTime: parseTimeToSeconds(formData.drivingTime),
          movingTime: parseTimeToSeconds(formData.movingTime),
          parkingTime: parseTimeToSeconds(formData.parkingTime),
          idleTime: parseTimeToSeconds(formData.idleTime),
          maxSpeed: formData.maxSpeed ? parseFloat(formData.maxSpeed) : null,
          ratioSpeed: formData.ratioSpeed ? parseFloat(formData.ratioSpeed) : null,
        }),
      })
      const data = await response.json()
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['gpsData', startDate, endDate, branchId, filterNopol] })
        setIsModalOpen(false)
        setFormData({ vehicleId: '', date: today, totalDistance: '', drivingTime: '', movingTime: '', parkingTime: '', idleTime: '', maxSpeed: '', ratioSpeed: '' })
      } else {
        setError(data.message || 'Gagal menambah data GPS')
      }
    } catch { setError('Terjadi kesalahan saat menambah data GPS') }
    finally { setLoading(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/gps/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['gpsData', startDate, endDate, branchId, filterNopol] })
      } else {
        alert(data.message || 'Gagal menghapus data')
      }
    } catch { alert('Terjadi kesalahan saat menghapus data') }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editItem) return
    setError('')
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/gps/${editItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          totalDistance: parseFloat(editItem.totalDistance),
          drivingTime: parseTimeToSeconds(editItem.drivingTime),
          movingTime: parseTimeToSeconds(editItem.movingTime),
          parkingTime: parseTimeToSeconds(editItem.parkingTime),
          idleTime: parseTimeToSeconds(editItem.idleTime),
          maxSpeed: editItem.maxSpeed ? parseFloat(editItem.maxSpeed) : null,
          ratioSpeed: editItem.ratioSpeed ? parseFloat(editItem.ratioSpeed) : null,
        }),
      })
      const data = await response.json()
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['gpsData', startDate, endDate, branchId, filterNopol] })
        setEditItem(null)
      } else {
        setError(data.message || 'Gagal mengubah data')
      }
    } catch { setError('Terjadi kesalahan saat mengubah data') }
    finally { setLoading(false) }
  }

  const gpsTemplateHeaders = ['nopol', 'date', 'totalDistance', 'drivingTime', 'movingTime', 'parkingTime', 'idleTime', 'maxSpeed', 'ratioSpeed']

  const parseCSV = (csvText: string) => {
    const text = csvText.replace(/\uFEFF/g, '').trim()
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
    if (lines.length === 0) return []
    const headers = lines[0].split(',').map((h) => h.trim())
    return lines.slice(1).map((line) => {
      const values: string[] = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i += 1) {
        const char = line[i]
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') { current += '"'; i += 1 }
          else inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) { values.push(current); current = '' }
        else current += char
      }
      values.push(current)
      return headers.reduce((record, header, index) => {
        record[header] = (values[index] || '').trim()
        return record
      }, {} as Record<string, string>)
    })
  }

  const downloadTemplate = () => {
    const csv = `${gpsTemplateHeaders.join(',')}\n`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.href = url
    link.setAttribute('download', 'gps-template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const importGpsCSV = async (file: File | null) => {
    setImportMessage('')
    if (!file) return
    setIsImporting(true)
    try {
      const text = await file.text()
      const rows = parseCSV(text)
      if (rows.length === 0) { setImportMessage('File CSV kosong atau tidak valid.'); return }

      const token = localStorage.getItem('token')
      const vehicleMap = new Map<string, string>()
      if (vehicles?.data) {
        for (const v of vehicles.data) vehicleMap.set(v.nopol, v.id)
      }

      const updates = rows.map((row) => ({
        vehicleId: vehicleMap.get(row.nopol) || '',
        date: row.date || '',
        totalDistance: parseFloat(row.totalDistance || '0'),
        drivingTime: parseTimeToSeconds(row.drivingTime),
        movingTime: parseTimeToSeconds(row.movingTime),
        parkingTime: parseTimeToSeconds(row.parkingTime),
        idleTime: parseTimeToSeconds(row.idleTime),
        maxSpeed: row.maxSpeed ? parseFloat(row.maxSpeed) : null,
        ratioSpeed: row.ratioSpeed ? parseFloat(row.ratioSpeed) : null,
      }))

      const invalid = updates.filter((u) => !u.vehicleId || !u.date || isNaN(u.totalDistance))
      if (invalid.length > 0) {
        setImportMessage(`Validasi gagal: ${invalid.length} baris memiliki nopol tidak dikenal atau data tidak lengkap.`)
        return
      }

      const response = await fetch('/api/gps/bulk/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ updates }),
      })
      const data = await response.json()
      if (data.success) {
        const { successful, failed } = data.data
        setImportMessage(`${successful} baris berhasil diimpor${failed > 0 ? `, ${failed} baris gagal.` : '.'}`)
        queryClient.invalidateQueries({ queryKey: ['gpsData', startDate, endDate, branchId] })
      } else {
        setImportMessage(data.message || 'Gagal mengimpor data')
      }
    } catch { setImportMessage('Terjadi kesalahan saat membaca file CSV') }
    finally { setIsImporting(false) }
  }

  const handleImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    importGpsCSV(file)
    event.target.value = ''
  }

  const openSyncModal = () => {
    setSyncResult(null)
    setSyncNopol('')
    setSyncBulan(new Date().getMonth() + 1)
    setSyncTahun(new Date().getFullYear())
    setShowSyncModal(true)
  }

  const handleSync = async () => {
    setSyncLoading(true)
    setSyncResult(null)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/gps/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tahun: syncTahun,
          bulan: syncBulan,
          lstNoPOL: syncNopol ? [syncNopol] : [],
        }),
      })
      const data = await response.json()
      if (data.success) {
        setSyncResult(data.data)
        queryClient.invalidateQueries({ queryKey: ['gpsData'] })
      } else {
        setSyncResult({ total: 0, success: 0, failed: 1, errors: [data.message || 'Sync gagal'] })
      }
    } catch {
      setSyncResult({ total: 0, success: 0, failed: 1, errors: ['Terjadi kesalahan jaringan'] })
    } finally {
      setSyncLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">GPS Tracking</h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={openSyncModal}
              disabled={syncLoading}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${syncLoading ? 'animate-spin' : ''}`} />
              <span>{syncLoading ? 'Sync...' : 'Sync GPS'}</span>
            </button>
          )}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Upload className="w-5 h-5" />
            <span>Import Data</span>
          </button>
          {isPlannerOrAbove && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-4 py-2 rounded-lg hover:from-emerald-400 hover:to-cyan-400 transition-all shadow-lg shadow-emerald-500/25"
            >
              <Plus className="w-5 h-5" />
              <span>Tambah Data</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-600">Tanggal Mulai</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-600">Tanggal Selesai</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
          </div>
          {!['SUPERVISOR', 'PLANNER'].includes(user.role || '') && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Cabang</span>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                <option value="">Semua Cabang</option>
                {(branches?.data || []).map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Kendaraan</span>
            <input type="text" value={filterNopol} onChange={(e) => { setFilterNopol(e.target.value); setCurrentPage(1) }}
              placeholder="Cari nopol..."
              className="border border-gray-300 rounded-lg px-4 py-2 w-48 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
          </div>
        </div>
      </div>

      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500 mb-1">Total Jarak</p>
            <p className="text-2xl font-bold text-gray-800">{totals.totalDistance.toFixed(1)} km</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500 mb-1">Total Drive Time</p>
            <p className="text-2xl font-bold text-blue-600">{formatTime(totals.drivingTime)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500 mb-1">Total Moving</p>
            <p className="text-2xl font-bold text-emerald-600">{formatTime(totals.movingTime)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500 mb-1">Total Parking</p>
            <p className="text-2xl font-bold text-orange-600">{formatTime(totals.parkingTime)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500 mb-1">Total Idle</p>
            <p className="text-2xl font-bold text-purple-600">{formatTime(totals.idleTime)}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Data GPS Tracking</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kendaraan</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Distance</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Drive</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Moving</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Parking</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Idle</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Max Speed</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ratio</th>
                {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.date ? new Date(item.date).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.vehicle?.nopol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {formatDistance(item.totalDistance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right font-mono">
                      {formatTime(item.drivingTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right font-mono">
                      {formatTime(item.movingTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right font-mono">
                      {formatTime(item.parkingTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right font-mono">
                      {formatTime(item.idleTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {item.maxSpeed != null ? `${item.maxSpeed} km/h` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {item.ratioSpeed != null ? item.ratioSpeed.toFixed(2) : '-'}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditItem({
                              id: item.id,
                              totalDistance: item.totalDistance.toString(),
                              drivingTime: formatTime(item.drivingTime),
                              movingTime: formatTime(item.movingTime),
                              parkingTime: formatTime(item.parkingTime),
                              idleTime: formatTime(item.idleTime),
                              maxSpeed: item.maxSpeed?.toString() || '',
                              ratioSpeed: item.ratioSpeed?.toString() || '',
                              vehicleNopol: item.vehicle?.nopol,
                              date: item.date,
                            })}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 10 : 9} className="px-6 py-12 text-center text-gray-500">
                    Tidak ada data GPS untuk periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Tampilkan</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
              className="border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>dari {records.length} data</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Prev</button>
            <span className="text-sm text-gray-600">{currentPage} / {totalPages || 1}</span>
            <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
          </div>
        </div>
      </div>

      {/* Modal Tambah */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Tambah Data GPS</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kendaraan</label>
                <select value={formData.vehicleId} onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">Pilih kendaraan</option>
                  {(vehicles?.data || []).map((v: any) => (
                    <option key={v.id} value={v.id}>{v.nopol} - {v.vehicleType}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Distance (KM)</label>
                  <input type="number" step="0.1" min="0" value={formData.totalDistance} onChange={(e) => setFormData({ ...formData, totalDistance: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Speed (km/h)</label>
                  <input type="number" step="0.1" min="0" value={formData.maxSpeed} onChange={(e) => setFormData({ ...formData, maxSpeed: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Driving Time (HH:mm)</label>
                  <input type="time" value={formData.drivingTime} onChange={(e) => setFormData({ ...formData, drivingTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Moving Time (HH:mm)</label>
                  <input type="time" value={formData.movingTime} onChange={(e) => setFormData({ ...formData, movingTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parking Time (HH:mm)</label>
                  <input type="time" value={formData.parkingTime} onChange={(e) => setFormData({ ...formData, parkingTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Idle Time (HH:mm)</label>
                  <input type="time" value={formData.idleTime} onChange={(e) => setFormData({ ...formData, idleTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ratio Speed</label>
                <input type="number" step="0.01" min="0" value={formData.ratioSpeed} onChange={(e) => setFormData({ ...formData, ratioSpeed: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Batal</button>
                <button type="submit" disabled={loading}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg hover:from-emerald-400 hover:to-cyan-400 transition-all disabled:opacity-50">
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit */}
      {editItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditItem(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Edit Data GPS — {editItem.vehicleNopol}</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Distance (KM)</label>
                  <input type="number" step="0.1" min="0" value={editItem.totalDistance} onChange={(e) => setEditItem({ ...editItem, totalDistance: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Speed (km/h)</label>
                  <input type="number" step="0.1" min="0" value={editItem.maxSpeed} onChange={(e) => setEditItem({ ...editItem, maxSpeed: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Driving Time</label>
                  <input type="time" value={editItem.drivingTime} onChange={(e) => setEditItem({ ...editItem, drivingTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Moving Time</label>
                  <input type="time" value={editItem.movingTime} onChange={(e) => setEditItem({ ...editItem, movingTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parking Time</label>
                  <input type="time" value={editItem.parkingTime} onChange={(e) => setEditItem({ ...editItem, parkingTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Idle Time</label>
                  <input type="time" value={editItem.idleTime} onChange={(e) => setEditItem({ ...editItem, idleTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ratio Speed</label>
                <input type="number" step="0.01" min="0" value={editItem.ratioSpeed} onChange={(e) => setEditItem({ ...editItem, ratioSpeed: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditItem(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Batal</button>
                <button type="submit" disabled={loading}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg hover:from-emerald-400 hover:to-cyan-400 transition-all disabled:opacity-50">
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sync Result */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { if (!syncLoading) setShowSyncModal(false) }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Sync GPS — EasyGo</h2>
            {!syncLoading && !syncResult && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit yang di-sync</label>
                  <select
                    value={syncNopol}
                    onChange={(e) => setSyncNopol(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="">Semua Unit</option>
                    {(vehicles?.data || []).map((v: any) => (
                      <option key={v.id} value={v.nopol}>{v.nopol} - {v.vehicleType}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bulan</label>
                    <select
                      value={syncBulan}
                      onChange={(e) => setSyncBulan(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((nama, i) => (
                        <option key={i + 1} value={i + 1}>{nama}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
                    <input
                      type="number"
                      value={syncTahun}
                      min={2020}
                      max={new Date().getFullYear() + 1}
                      onChange={(e) => setSyncTahun(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Pilih 1 unit untuk sync terarah, atau "Semua Unit". Data ditarik sesuai bulan & tahun di atas.
                </p>
                <button
                  onClick={handleSync}
                  className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                  Mulai Sync{syncNopol ? ` — ${syncNopol}` : ''}
                </button>
              </div>
            )}
            {syncLoading && !syncResult ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
                <span className="ml-3 text-gray-600">Menyinkronkan data...</span>
              </div>
            ) : syncResult ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${syncResult.failed === 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="text-sm text-gray-700">
                    {syncResult.failed === 0 ? 'Sinkronisasi berhasil' : 'Sinkronisasi selesai dengan error'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-lg font-bold text-gray-800">{syncResult.total}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Berhasil</p>
                    <p className="text-lg font-bold text-emerald-600">{syncResult.success}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Gagal</p>
                    <p className="text-lg font-bold text-red-600">{syncResult.failed}</p>
                  </div>
                </div>
                {syncResult.errors.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Error ({syncResult.errors.length}):</p>
                    <div className="max-h-32 overflow-y-auto text-xs text-red-600 bg-red-50 rounded-lg p-2 space-y-1">
                      {syncResult.errors.slice(0, 20).map((e, i) => (
                        <p key={i}>{e}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowSyncModal(false)}
                disabled={syncLoading}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setIsImportModalOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Import Data GPS</h2>
            <p className="text-sm text-gray-500 mb-4">Upload file CSV dengan format kolom: nopol, date, totalDistance, drivingTime, movingTime, parkingTime, idleTime, maxSpeed, ratioSpeed</p>
            <div className="flex flex-col gap-3">
              <button onClick={downloadTemplate}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                <Download className="w-5 h-5" />
                Download Template CSV
              </button>
              <button onClick={() => importFileRef.current?.click()}
                disabled={isImporting}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                <Upload className="w-5 h-5" />
                {isImporting ? 'Memproses...' : 'Upload & Import'}
              </button>
              <input type="file" hidden accept=".csv" ref={importFileRef} onChange={handleImportFileChange} />
              {importMessage && (
                <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">{importMessage}</p>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
