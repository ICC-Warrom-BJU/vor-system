import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Save, Download, CalendarRange } from 'lucide-react'

export default function ForecastStatus() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [searchNopol, setSearchNopol] = useState('')
  const [searchStatus, setSearchStatus] = useState('')
  const [searchType, setSearchType] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generateMessage, setGenerateMessage] = useState('')
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copySourceDate, setCopySourceDate] = useState(new Date().toISOString().split('T')[0])
  const [copyTargetDate, setCopyTargetDate] = useState(new Date().toISOString().split('T')[0])
  const [copyGenerating, setCopyGenerating] = useState(false)
  const [copyResult, setCopyResult] = useState<{ total: number; success: number; failed: number; errors: string[] } | null>(null)
  const queryClient = useQueryClient()

  const { data: forecastStatus } = useQuery({
    queryKey: ['forecastStatus', selectedDate],
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

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage('')
    setGenerateMessage('')

    try {
      const token = localStorage.getItem('token')
      const updates: Array<{
        vehicleId: string
        date: string
        statusCode: string
        confidence: number
        notes: string
      }> = []

      const tableRows = document.querySelectorAll('tbody tr')
      tableRows.forEach((row) => {
        const vehicleId = row.getAttribute('data-vehicle-id')
        const statusSelect = row.querySelector('select') as HTMLSelectElement
        const confidenceSelect = row.querySelectorAll('select')[1] as HTMLSelectElement
        const notesInput = row.querySelector('input') as HTMLInputElement

        if (vehicleId && statusSelect && statusSelect.value) {
          updates.push({
            vehicleId,
            date: selectedDate,
            statusCode: statusSelect.value,
            confidence: confidenceSelect?.value === 'HIGH' ? 100 : confidenceSelect?.value === 'MEDIUM' ? 50 : 25,
            notes: notesInput?.value || '',
          })
        }
      })

      if (updates.length === 0) {
        setSaveMessage('Tidak ada data untuk disimpan')
        setSaving(false)
        return
      }

      const response = await fetch('/api/forecast-status/bulk/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ updates }),
      })

      const data = await response.json()

      if (data.success) {
        setSaveMessage(`Berhasil menyimpan ${data.data.successful} dari ${data.data.total} data`)
        queryClient.invalidateQueries({ queryKey: ['forecastStatus', selectedDate] })
      } else {
        setSaveMessage('Gagal menyimpan data')
      }
    } catch (error) {
      setSaveMessage('Terjadi kesalahan saat menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateActual = async () => {
    setGenerating(true)
    setGenerateMessage('')
    setSaveMessage('')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/actual-status/date?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setGenerateMessage(data.message || 'Gagal mengambil data actual status')
        return
      }

      const actualByVehicle = new Map<string, any>()
      data.data.forEach((record: any) => {
        if (record.vehicleId) {
          actualByVehicle.set(record.vehicleId, record)
        }
      })

      const tableRows = document.querySelectorAll('tbody tr')
      let filled = 0

      tableRows.forEach((row) => {
        const vehicleId = row.getAttribute('data-vehicle-id')
        const actualStatus = vehicleId ? actualByVehicle.get(vehicleId) : null
        if (!vehicleId || !actualStatus) {
          return
        }

        const statusSelect = row.querySelector('select') as HTMLSelectElement
        const confidenceSelect = row.querySelectorAll('select')[1] as HTMLSelectElement
        const notesInput = row.querySelector('input') as HTMLInputElement

        if (statusSelect) {
          statusSelect.value = actualStatus.status?.code || actualStatus.statusCode || statusSelect.value
        }
        if (confidenceSelect) {
          confidenceSelect.value = 'HIGH'
        }
        if (notesInput) {
          notesInput.value = actualStatus.notes || ''
        }

        filled += 1
      })

      if (filled === 0) {
        setGenerateMessage('Tidak ditemukan actual status untuk kendaraan pada tanggal ini.')
      } else {
        setGenerateMessage(`Berhasil mengisi ${filled} baris dari actual status hari ini.`)
      }
    } catch (error) {
      setGenerateMessage('Terjadi kesalahan saat mengambil actual status')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopyForecast = async () => {
    setCopyGenerating(true)
    setCopyResult(null)

    try {
      const token = localStorage.getItem('token')
      const source = copySourceDate
      const target = copyTargetDate

      // 1. Fetch forecast data for source date
      const fetchRes = await fetch(`/api/forecast-status/date?date=${source}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const fetchData = await fetchRes.json()
      if (!fetchRes.ok || !fetchData.success) {
        setCopyResult({ total: 1, success: 0, failed: 1, errors: [fetchData.message || 'Gagal mengambil data forecast sumber'] })
        return
      }

      const sourceRecords = fetchData.data || []
      if (sourceRecords.length === 0) {
        setCopyResult({ total: 1, success: 0, failed: 1, errors: [`Tidak ada data forecast untuk tanggal ${source}`] })
        return
      }

      // 2. Map to target date
      const targetDateObj = new Date(`${target}T00:00:00.000Z`)
      const updates = sourceRecords.map((record: any) => ({
        vehicleId: record.vehicleId,
        date: targetDateObj.toISOString(),
        statusCode: record.status?.code || record.statusCode,
        confidence: record.confidence ?? 50,
        notes: record.notes || '',
      }))

      // 3. Bulk upsert to target date
      const saveRes = await fetch('/api/forecast-status/bulk/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ updates }),
      })
      const saveData = await saveRes.json()

      if (saveData.success) {
        const failed = saveData.data?.failed || 0
        const errors = failed > 0 ? (saveData.data?.results?.filter((r: any) => !r.success).map((r: any) => r.message) || []) : []
        setCopyResult({ total: updates.length, success: saveData.data?.successful || updates.length, failed, errors })
        setSelectedDate(target)
      } else {
        setCopyResult({ total: updates.length, success: 0, failed: updates.length, errors: [saveData.message || 'Gagal menyimpan forecast'] })
      }
    } catch {
      setCopyResult({ total: 0, success: 0, failed: 1, errors: ['Terjadi kesalahan jaringan'] })
    } finally {
      setCopyGenerating(false)
    }
  }

  const filteredVehicles = useMemo(() => {
    if (!vehicles?.data) return []
    return vehicles.data.filter((vehicle: any) => {
      const status = forecastStatus?.data?.find((s: any) => s.vehicleId === vehicle.id)
      const statusCode = status?.status?.code || status?.statusCode || ''
      const vehicleType = vehicle.vehicleType || ''
      const nopol = vehicle.nopol || ''
      const matchesNopol = !searchNopol || nopol.toLowerCase().includes(searchNopol.toLowerCase())
      const matchesStatus = !searchStatus || statusCode === searchStatus
      const matchesType = !searchType || vehicleType.toLowerCase().includes(searchType.toLowerCase())
      return matchesNopol && matchesStatus && matchesType
    })
  }, [vehicles?.data, forecastStatus?.data, searchNopol, searchStatus, searchType])

  const statusGroupSummary = useMemo(() => {
    const counts = new Map<string, number>()

    masterStatuses?.data?.forEach((group: any) => {
      if (group.groupStatus) {
        counts.set(group.groupStatus, 0)
      }
    })

    forecastStatus?.data?.forEach((status: any) => {
      const group = status.status?.groupStatus || 'Unknown'
      counts.set(group, (counts.get(group) || 0) + 1)
    })

    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [forecastStatus?.data, masterStatuses?.data])

  const getConfidenceClass = (value: string) => {
    if (value === 'HIGH') return 'bg-emerald-100 text-emerald-800'
    if (value === 'MEDIUM') return 'bg-orange-100 text-orange-800'
    if (value === 'LOW') return 'bg-yellow-100 text-yellow-800'
    return 'bg-white text-gray-700'
  }

  const getStatusBackgroundStyle = (color?: string) => {
    if (!color) return undefined
    return { backgroundColor: `${color}33` }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Status Forecast</h1>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-5 h-5" />
            <span>Export</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Menyimpan...' : 'Simpan'}</span>
          </button>
        </div>
      </div>

      {(saveMessage || generateMessage) && (
        <div className={`px-4 py-3 rounded-lg ${
          (saveMessage || generateMessage).includes('Berhasil')
            ? 'bg-green-50 border border-green-200 text-green-600'
            : 'bg-red-50 border border-red-200 text-red-600'
        }`}>
          {saveMessage || generateMessage}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            onClick={handleGenerateActual}
            disabled={generating}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <span>{generating ? 'Menghasilkan...' : 'Generate Actual hari ini'}</span>
          </button>
          <button
            onClick={() => {
              setCopySourceDate(selectedDate)
              setCopyTargetDate(selectedDate)
              setCopyResult(null)
              setShowCopyModal(true)
            }}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <CalendarRange className="w-5 h-5" />
            <span>Copy Forecast</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Total Forecast</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{forecastStatus?.data?.length ?? 0}</p>
          <p className="text-sm text-gray-500">Jumlah unit dengan forecast pada tanggal ini</p>
        </div>
        {statusGroupSummary.map(([group, count]) => (
          <div key={group} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-500">{group}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{count}</p>
            <p className="text-sm text-gray-500">Quantity unit berdasarkan status group</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-100 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <input
            type="text"
            placeholder="Cari nopol..."
            value={searchNopol}
            onChange={(e) => setSearchNopol(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full sm:w-48"
          />
          <select
            value={searchStatus}
            onChange={(e) => setSearchStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full sm:w-48"
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
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full sm:w-48"
          />
          <span className="text-xs text-gray-500 sm:ml-auto">{filteredVehicles.length} dari {vehicles?.data?.length || 0} unit</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kendaraan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipe Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status Forecast
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Catatan
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVehicles.length > 0 ? (
                filteredVehicles.map((vehicle: any) => {
                  const status = forecastStatus?.data?.find((s: any) => s.vehicleId === vehicle.id)
                  return (
                    <tr key={vehicle.id} data-vehicle-id={vehicle.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {vehicle.nopol}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {vehicle.vehicleType || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="rounded-lg p-1" style={getStatusBackgroundStyle(status?.status?.color)}>
                          <select
                            className="w-full border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                            defaultValue={status?.status?.code || ''}
                          >
                            <option value="">Pilih status</option>
                            {masterStatuses?.data?.map((ms: any) => (
                              <option key={ms.code} value={ms.code}>
                                {ms.code}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <select
                          className={`border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${getConfidenceClass(
                            status ? (status.confidence >= 75 ? 'HIGH' : status.confidence >= 50 ? 'MEDIUM' : 'LOW') : 'HIGH'
                          )}`}
                          defaultValue={status ? (status.confidence >= 75 ? 'HIGH' : status.confidence >= 50 ? 'MEDIUM' : 'LOW') : 'HIGH'}
                        >
                          <option value="HIGH">High</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="LOW">Low</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <input
                          type="text"
                          className="border border-gray-300 rounded-lg px-3 py-1 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="Catatan..."
                          defaultValue={status?.notes || ''}
                        />
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <p className="text-lg font-medium mb-2">Tidak ada data kendaraan</p>
                    <p className="text-sm">Silakan tambah kendaraan terlebih dahulu</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Copy Forecast */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { if (!copyGenerating) setShowCopyModal(false) }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Copy Forecast</h2>
            <p className="text-sm text-gray-500 mb-4">
              Duplikat data forecast dari tanggal sumber ke tanggal tujuan.
            </p>

            {!copyResult && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Copy</label>
                  <input type="date" value={copySourceDate} onChange={(e) => setCopySourceDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Tujuan</label>
                  <input type="date" value={copyTargetDate} onChange={(e) => setCopyTargetDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowCopyModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Batal</button>
                  <button onClick={handleCopyForecast} disabled={copyGenerating}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50">
                    {copyGenerating ? 'Memproses...' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            {copyGenerating && (
              <div className="flex items-center justify-center py-6">
                <CalendarRange className="w-6 h-6 animate-pulse text-purple-600 mr-3" />
                <span className="text-gray-600 text-sm">Menyalin data...</span>
              </div>
            )}

            {copyResult && !copyGenerating && (
              <div className="space-y-3">
                <div className={`flex items-center gap-2 ${copyResult.failed === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  <div className={`w-3 h-3 rounded-full ${copyResult.failed === 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="text-sm font-medium">
                    {copyResult.failed === 0 ? 'Berhasil' : 'Selesai dengan error'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Data</p>
                    <p className="text-lg font-bold text-gray-800">{copyResult.total}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Berhasil</p>
                    <p className="text-lg font-bold text-emerald-600">{copyResult.success}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Gagal</p>
                    <p className="text-lg font-bold text-red-600">{copyResult.failed}</p>
                  </div>
                </div>
                {copyResult.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto text-xs text-red-600 bg-red-50 rounded-lg p-2 space-y-1">
                    {copyResult.errors.slice(0, 20).map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                )}
                <div className="flex justify-end">
                  <button onClick={() => setShowCopyModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Tutup</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
