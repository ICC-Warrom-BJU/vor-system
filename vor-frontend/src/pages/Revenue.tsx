import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Calendar, Pencil, Trash2, Upload, Download } from 'lucide-react'

function formatRp(value: number) {
  return `Rp ${(value / 1000000).toFixed(2)}M`
}

export default function Revenue() {
  const today = new Date().toISOString().split('T')[0]
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    vehicleId: '',
    revenue: '',
    expense: '',
    tripCount: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [budgetPageSize, setBudgetPageSize] = useState(10)
  const [budgetPage, setBudgetPage] = useState(1)
  const [editItem, setEditItem] = useState<any | null>(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importMessage, setImportMessage] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const importFileRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}')
    } catch { return {} }
  })()
  const isAdmin = user.role === 'ADMIN'

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

  const { data: revenueData } = useQuery({
    queryKey: ['revenueData', startDate, endDate],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/revenue/date?startDate=${startDate}&endDate=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
  })

  const records = revenueData?.data?.records || []
  const totals = revenueData?.data?.totals || null
  const budgetComparison = revenueData?.data?.budgetComparison || []
  const totalPages = Math.ceil(records.length / pageSize)
  const paginatedRecords = records.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const budgetTotalPages = Math.ceil(budgetComparison.length / budgetPageSize)
  const paginatedBudget = budgetComparison.slice((budgetPage - 1) * budgetPageSize, budgetPage * budgetPageSize)

  useEffect(() => { setCurrentPage(1) }, [records, pageSize])
  useEffect(() => { setBudgetPage(1) }, [budgetComparison, budgetPageSize])

  function getPercentageColor(pct: number) {
    if (pct >= 100) return 'text-green-600'
    if (pct >= 80) return 'text-blue-600'
    if (pct > 0) return 'text-yellow-600'
    return 'text-red-600'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.vehicleId) {
      setError('Kendaraan harus dipilih')
      return
    }
    if (!formData.revenue || isNaN(parseFloat(formData.revenue)) || parseFloat(formData.revenue) < 0) {
      setError('Pendapatan harus berupa angka positif')
      return
    }
    if (formData.expense && (isNaN(parseFloat(formData.expense)) || parseFloat(formData.expense) < 0)) {
      setError('Pengeluaran harus berupa angka positif')
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/revenue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vehicleId: formData.vehicleId,
          date: startDate,
          totalRevenue: parseFloat(formData.revenue),
          fuelExpense: formData.expense ? parseFloat(formData.expense) : 0,
          tripCount: formData.tripCount ? parseInt(formData.tripCount || '0') : 0,
          notes: formData.notes,
        }),
      })

      const data = await response.json()

      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['revenueData', startDate, endDate] })
        setIsModalOpen(false)
        setFormData({
          vehicleId: '',
          revenue: '',
          expense: '',
          tripCount: '',
          notes: '',
        })
      } else {
        setError(data.message || 'Gagal menambah data pendapatan')
      }
    } catch (err) {
      setError('Terjadi kesalahan saat menambah data pendapatan')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/revenue/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['revenueData', startDate, endDate] })
      } else {
        alert(data.message || 'Gagal menghapus data')
      }
    } catch {
      alert('Terjadi kesalahan saat menghapus data')
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editItem) return
    setError('')
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const body = {
        totalRevenue: parseFloat(editItem.totalRevenue),
        fuelExpense: parseFloat(editItem.fuelExpense || '0'),
        otherExpense: parseFloat(editItem.otherExpense || '0'),
        tripCount: editItem.tripCount ? parseInt(editItem.tripCount || '0') : 0,
        notes: editItem.notes || '',
      }
      const response = await fetch(`/api/revenue/${editItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['revenueData', startDate, endDate] })
        setEditItem(null)
      } else {
        setError(data.message || 'Gagal mengubah data')
      }
    } catch {
      setError('Terjadi kesalahan saat mengubah data')
    } finally {
      setLoading(false)
    }
  }

  const revenueTemplateHeaders = ['nopol', 'date', 'totalRevenue', 'fuelExpense', 'otherExpense', 'tripCount', 'notes']

  const parseCSV = (csvText: string) => {
    const text = csvText.replace(/\uFEFF/g, '').trim()
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
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
    const csv = `${revenueTemplateHeaders.join(',')}\n`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.href = url
    link.setAttribute('download', 'revenue-template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const importRevenueCSV = async (file: File | null) => {
    setImportMessage('')
    if (!file) return
    setIsImporting(true)
    try {
      const text = await file.text()
      const rows = parseCSV(text)
      if (rows.length === 0) {
        setImportMessage('File CSV kosong atau tidak valid.')
        return
      }

      const token = localStorage.getItem('token')

      const vehicleMap = new Map<string, string>()
      if (vehicles?.data) {
        for (const v of vehicles.data) {
          vehicleMap.set(v.nopol, v.id)
        }
      }

      const updates = rows.map((row) => ({
        vehicleId: vehicleMap.get(row.nopol) || '',
        date: row.date || '',
        totalRevenue: parseFloat(row.totalRevenue || '0'),
        fuelExpense: parseFloat(row.fuelExpense || '0'),
        otherExpense: parseFloat(row.otherExpense || '0'),
        tripCount: parseInt(row.tripCount || '0', 10),
        notes: row.notes || '',
      }))

      const invalid = updates.filter((u) => !u.vehicleId || !u.date || isNaN(u.totalRevenue))
      if (invalid.length > 0) {
        setImportMessage(`Validasi gagal: ${invalid.length} baris memiliki nopol tidak dikenal atau data tidak lengkap.`)
        return
      }

      const response = await fetch('/api/revenue/bulk/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ updates }),
      })

      const data = await response.json()
      if (data.success) {
        const { successful, failed } = data.data
        setImportMessage(`${successful} baris berhasil diimpor${failed > 0 ? `, ${failed} baris gagal.` : '.'}`)
        queryClient.invalidateQueries({ queryKey: ['revenueData', startDate, endDate] })
      } else {
        setImportMessage(data.message || 'Gagal mengimpor data')
      }
    } catch {
      setImportMessage('Terjadi kesalahan saat membaca file CSV')
    } finally {
      setIsImporting(false)
    }
  }

  const handleImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    importRevenueCSV(file)
    event.target.value = ''
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Data Pendapatan</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Upload className="w-5 h-5" />
            <span>Import Data</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-4 py-2 rounded-lg hover:from-emerald-400 hover:to-cyan-400 transition-all shadow-lg shadow-emerald-500/25"
          >
            <Plus className="w-5 h-5" />
            <span>Tambah Data</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-600">Tanggal Mulai</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-600">Tanggal Selesai</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
      </div>

      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500 mb-1">Total Trip</p>
            <p className="text-2xl font-bold text-gray-800">{totals.totalTrips}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500 mb-1">Total Pendapatan</p>
            <p className="text-2xl font-bold text-emerald-600">{formatRp(totals.totalRevenue)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500 mb-1">Total BOP</p>
            <p className="text-2xl font-bold text-orange-600">{formatRp(totals.totalFuelExpense)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500 mb-1">Biaya Lain</p>
            <p className="text-2xl font-bold text-orange-600">{formatRp(totals.totalOtherExpense)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500 mb-1">Profit</p>
            <p className="text-2xl font-bold text-cyan-600">{formatRp(totals.totalProfit)}</p>
          </div>
        </div>
      )}

      {budgetComparison.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Target vs Pendapatan per Unit</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kendaraan</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Target / Bulan</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pendapatan</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">%</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedBudget.map((item: any) => {
                  const colorClass = getPercentageColor(item.percentage)
                  return (
                    <tr key={item.vehicleId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.nopol}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatRp(item.monthlyTarget)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatRp(item.actualRevenue)}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${colorClass}`}>
                        {item.percentage.toFixed(2)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Tampilkan</span>
              <select
                value={budgetPageSize}
                onChange={(e) => setBudgetPageSize(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>dari {budgetComparison.length} data</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBudgetPage(Math.max(1, budgetPage - 1))}
                disabled={budgetPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="text-sm text-gray-600">{budgetPage} / {budgetTotalPages || 1}</span>
              <button
                onClick={() => setBudgetPage(Math.min(budgetTotalPages, budgetPage + 1))}
                disabled={budgetPage === budgetTotalPages || budgetTotalPages === 0}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Detail Pendapatan</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kendaraan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pendapatan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BOP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Biaya Lain</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trip</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catatan</th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatRp(item.totalRevenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatRp(item.fuelExpense)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatRp(item.otherExpense)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatRp(item.profit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.tripCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.notes || '-'}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditItem({
                              id: item.id,
                              totalRevenue: item.totalRevenue.toString(),
                              fuelExpense: item.fuelExpense.toString(),
                              otherExpense: item.otherExpense.toString(),
                              tripCount: item.tripCount?.toString() || '',
                              notes: item.notes || '',
                              vehicleNopol: item.vehicle?.nopol,
                              date: item.date,
                            })}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus"
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
                  <td colSpan={isAdmin ? 9 : 8} className="px-6 py-12 text-center text-gray-500">
                    <p className="text-lg font-medium mb-2">Tidak ada data pendapatan</p>
                    <p className="text-sm">Silakan tambah data pendapatan untuk rentang tanggal ini</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {records.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Tampilkan</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>dari {records.length} data</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="text-sm text-gray-600">
                {currentPage} / {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Tambah Data Pendapatan</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal</label>
                <input
                  type="date"
                  value={startDate}
                  disabled
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kendaraan *
                </label>
                <select
                  value={formData.vehicleId}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">Pilih kendaraan</option>
                  {vehicles?.data?.map((vehicle: any) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.nopol} - {vehicle.vehicleType}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pendapatan (Rp) *
                </label>
                <input
                  type="number"
                  value={formData.revenue}
                  onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="5000000"
                  required
                  min="0"
                  step="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pengeluaran (Rp)
                </label>
                <input
                  type="number"
                  value={formData.expense}
                  onChange={(e) => setFormData({ ...formData, expense: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="2000000"
                  min="0"
                  step="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah Trip
                </label>
                <input
                  type="number"
                  value={formData.tripCount}
                  onChange={(e) => setFormData({ ...formData, tripCount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="3"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catatan
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  rows={3}
                  placeholder="Catatan tambahan..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg hover:from-emerald-600 hover:to-cyan-600 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Edit Data Pendapatan</h2>
              <button onClick={() => { setEditItem(null); setError('') }} className="text-gray-400 hover:text-gray-600">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal</label>
                  <input
                    type="date"
                    value={editItem.date ? new Date(editItem.date).toISOString().split('T')[0] : ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kendaraan</label>
                  <input
                    value={editItem.vehicleNopol || '-'}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pendapatan (Rp) *
                </label>
                <input
                  type="number"
                  value={editItem.totalRevenue}
                  onChange={(e) => setEditItem({ ...editItem, totalRevenue: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="5000000"
                  required
                  min="0"
                  step="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  BOP (Rp)
                </label>
                <input
                  type="number"
                  value={editItem.fuelExpense}
                  onChange={(e) => setEditItem({ ...editItem, fuelExpense: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="2000000"
                  min="0"
                  step="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Biaya Lain (Rp)
                </label>
                <input
                  type="number"
                  value={editItem.otherExpense}
                  onChange={(e) => setEditItem({ ...editItem, otherExpense: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="500000"
                  min="0"
                  step="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah Trip
                </label>
                <input
                  type="number"
                  value={editItem.tripCount}
                  onChange={(e) => setEditItem({ ...editItem, tripCount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="3"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catatan
                </label>
                <textarea
                  value={editItem.notes}
                  onChange={(e) => setEditItem({ ...editItem, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  rows={3}
                  placeholder="Catatan tambahan..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => { setEditItem(null); setError('') }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg hover:from-emerald-600 hover:to-cyan-600 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Import Data Pendapatan</h2>
              <button onClick={() => { setIsImportModalOpen(false); setImportMessage('') }} className="text-gray-400 hover:text-gray-600">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
                Format CSV dengan kolom: <strong>nopol, date, totalRevenue, fuelExpense, otherExpense, tripCount, notes</strong>.
                Data yang sudah ada (nopol + tanggal sama) akan diperbarui.
              </div>

              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-600 hover:text-blue-600"
              >
                <Download className="w-5 h-5" />
                <span className="font-medium">Download Template CSV</span>
              </button>

              <div className="border-t border-gray-200 pt-4">
                <button
                  onClick={() => importFileRef.current?.click()}
                  disabled={isImporting}
                  className="flex items-center gap-2 w-full justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Upload className="w-5 h-5" />
                  <span>{isImporting ? 'Memproses...' : 'Upload & Import CSV'}</span>
                </button>
                <input type="file" hidden accept=".csv" ref={importFileRef} onChange={handleImportFileChange} />
              </div>

              {importMessage && (
                <div className={`px-4 py-3 rounded-lg text-sm ${
                  importMessage.includes('berhasil') && !importMessage.includes('gagal')
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-600'
                }`}>
                  {importMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}