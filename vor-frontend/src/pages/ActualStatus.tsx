import { useState, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import { ColDef, ColGroupDef } from 'ag-grid-community'
import * as XLSX from 'xlsx'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { Calendar, Save, Download, Activity, Truck, Zap, Copy, ArrowRight } from 'lucide-react'
import { addDays, eachDayOfInterval, endOfMonth, format, getDaysInMonth } from 'date-fns'
import { id } from 'date-fns/locale'

const StatusColors: { [key: string]: string } = {
  UTI: 'bg-green-400 text-white',
  RFU: 'bg-orange-400 text-white',
  BD: 'bg-red-500 text-white',
  C: 'bg-gray-600 text-white',
  PA: 'bg-yellow-400 text-white',
  UA: 'bg-blue-400 text-white',
}

interface StatusData {
  date: string
  status: string
  statusId: string | null
  vehicleId: string
  notes: string
}

interface RowData {
  vehicleId: string
  nopol: string
  vehicleType: string
  tonase: number | null
  kubikasi: number | null
  customer: string
  driver: string
  [key: string]: any
}

const animationStyles = `
  @keyframes cell-pop {
    0%   { transform: scale(0.7); opacity: 0.5; }
    60%  { transform: scale(1.12); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes cell-ripple {
    0%   { opacity: 0.5; transform: scale(0); }
    100% { opacity: 0; transform: scale(2.5); }
  }
  @keyframes dot-bounce {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.6); }
  }
  .animate-cell-pop { 
    animation: cell-pop 0.3s cubic-bezier(.34,1.56,.64,1) forwards; 
  }
  .animate-cell-ripple::after {
    content: ''; position: absolute; inset: 0; border-radius: 4px;
    background: rgba(255,255,255,0.5);
    animation: cell-ripple 0.45s ease-out forwards;
    pointer-events: none;
  }
  .status-color-transition {
    transition: background-color 0.4s ease-in-out, color 0.3s ease-in-out;
  }
  .animate-dot-bounce { animation: dot-bounce 1s infinite ease-in-out; }
`;

export default function ActualStatus() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly')
  const [searchNopol, setSearchNopol] = useState('')
  const [searchStatus, setSearchStatus] = useState('')
  const [searchType, setSearchType] = useState('')
  const [copyFromDate, setCopyFromDate] = useState(new Date().toISOString().split('T')[0])
  const [copyToDate, setCopyToDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [changedRows, setChangedRows] = useState<Map<string, any>>(new Map())
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem('actualStatusNotes')
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })
  const [cellEditor, setCellEditor] = useState({
    open: false,
    vehicleId: '',
    nopol: '',
    date: '',
    field: '',
    statusCode: '',
    noteText: '',
  })
  const queryClient = useQueryClient()

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

  const daysArray = useMemo(() => {
    const selected = new Date(selectedDate)

    if (viewMode === 'monthly') {
      const start = new Date(selected.getFullYear(), selected.getMonth(), 1)
      const end = endOfMonth(selected)
      return eachDayOfInterval({ start, end })
    }

    const days = []
    for (let i = 0; i < 7; i++) {
      days.push(addDays(selected, i))
    }
    return days
  }, [selectedDate, viewMode])

  const { data: allActualStatuses } = useQuery({
    queryKey: ['allActualStatus', selectedDate, viewMode],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const dates = daysArray.map((day) => format(day, 'yyyy-MM-dd'))

      const responses = await Promise.all(
        dates.map(async (date) => {
          const response = await fetch(`/api/actual-status/date?date=${date}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          const data = await response.json()
          return data.data || []
        })
      )

      return { data: responses.flat() }
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

  const statusMetaByCode = useMemo(() => {
    const map = new Map<string, any>()
    masterStatuses?.data?.forEach((status: any) => {
      map.set(status.code, status)
    })
    return map
  }, [masterStatuses?.data])

  const statusGroups = useMemo(() => {
    const groups = new Set<string>()
    masterStatuses?.data?.forEach((status: any) => {
      groups.add(status.groupStatus?.trim() || 'LAINNYA')
    })

    const ordering = ['UTILISASI', 'BREAKDOWN']
    return Array.from(groups).sort((a, b) => {
      const ai = ordering.indexOf(a.toUpperCase())
      const bi = ordering.indexOf(b.toUpperCase())
      if (ai !== -1 || bi !== -1) {
        return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi)
      }
      return a.localeCompare(b)
    })
  }, [masterStatuses?.data])

  const recalculateSummaryFields = useCallback(
    (row: RowData) => {
      const summary: Record<string, number> = {}
      let paCount = 0
      let uaCount = 0
      let productiveCount = 0
      let filledDays = 0

      statusGroups.forEach((group) => {
        summary[`group_${group}`] = 0
      })

      daysArray.forEach((_, index) => {
        const dayData = row[`day${index + 1}`] as StatusData | undefined
        if (!dayData?.status) return
        filledDays += 1

        const meta = statusMetaByCode.get(dayData.status)
        const group = meta?.groupStatus?.trim() || 'LAINNYA'
        const field = `group_${group}`
        summary[field] = (summary[field] || 0) + 1

        const isPA = meta?.isPA ?? ['UTI', 'RFU', 'PA'].includes(dayData.status)
        const isUA = meta?.isUA ?? ['UTI', 'UA'].includes(dayData.status)
        const isProductivity = meta?.isProductivity ?? dayData.status === 'UTI'

        if (isPA) paCount += 1
        if (isUA) uaCount += 1
        if (isProductivity) productiveCount += 1
      })

      const totalDays = filledDays || 1
      return {
        ...row,
        ...summary,
        paPercent: (paCount / totalDays) * 100,
        uaPercent: (uaCount / totalDays) * 100,
        productivityPercent: (productiveCount / totalDays) * 100,
      }
    },
    [daysArray, statusGroups, statusMetaByCode]
  )

  const getStatusColor = useCallback(
    (statusCode: string) => {
      const masterColor = statusMetaByCode.get(statusCode)?.color
      return typeof masterColor === 'string' && masterColor.startsWith('#') ? masterColor : null
    },
    [statusMetaByCode]
  )

  const getStatusClassName = useCallback((statusCode: string) => {
    return StatusColors[statusCode] || 'bg-slate-100 text-slate-700'
  }, [])

  const noteStorageKey = 'actualStatusNotes'

  const getNoteKey = useCallback((nopol: string, date: string) => `${nopol}_${date}`, [])

  const saveNotes = useCallback((nextNotes: Record<string, string>) => {
    setNotes(nextNotes)
    localStorage.setItem(noteStorageKey, JSON.stringify(nextNotes))
  }, [])

  const closeCellEditor = useCallback(() => {
    setCellEditor({ open: false, vehicleId: '', nopol: '', date: '', field: '', statusCode: '', noteText: '' })
  }, [])

  const openCellEditor = useCallback(
    (params: { vehicleId: string; nopol: string; date: string; field: string; statusCode: string; noteText: string }) => {
      setCellEditor({ open: true, ...params })
    },
    []
  )

  const handleSaveCellEditor = () => {
    const { vehicleId, nopol, date, field, statusCode, noteText } = cellEditor
    
    // Update local notes storage
    const noteKey = getNoteKey(nopol, date)
    const nextNotes = { ...notes, [noteKey]: noteText.trim() }
    if (!noteText.trim()) delete nextNotes[noteKey]
    saveNotes(nextNotes)

    // Find existing row data (either from changedRows or rowData)
    const currentRow = changedRows.get(vehicleId) || rowData.find((r: RowData) => r.vehicleId === vehicleId)
    if (!currentRow) return

    const updatedRow = recalculateSummaryFields({
      ...currentRow,
      [field]: {
        ...currentRow[field],
        status: statusCode,
        notes: noteText.trim(),
      },
    })

    setChangedRows((prev) => {
      const next = new Map(prev)
      next.set(vehicleId, updatedRow)
      return next
    })

    closeCellEditor()
  }

  // Transform data for AG-Grid
  const baseRowData = useMemo(() => {
    if (!vehicles?.data) return []

    const statusMap = new Map<string, any>()

    // Build map of vehicle -> date -> status
    if (allActualStatuses?.data) {
      allActualStatuses.data.forEach((status: any) => {
        const date = status.date.split('T')[0]
        const key = `${status.vehicleId}-${date}`
        statusMap.set(key, status)
      })
    }

    return vehicles.data.map((vehicle: any) => {
      const row: RowData = {
        vehicleId: vehicle.id,
        nopol: vehicle.nopol,
        vehicleType: vehicle.vehicleType,
        tonase: vehicle.tonase,
        kubikasi: vehicle.kubikasi,
        customer: vehicle.customer?.name || '-',
        driver: vehicle.driver?.name || '-',
      }

      statusGroups.forEach((group) => {
        row[`group_${group}`] = 0
      })

      daysArray.forEach((day, index) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const status = statusMap.get(`${vehicle.id}-${dateStr}`)
        const statusCode = status?.status?.code || ''
        const noteKey = getNoteKey(vehicle.nopol, dateStr)
        const noteText = notes[noteKey] ?? status?.notes ?? ''
        row[`day${index + 1}`] = {
          date: dateStr,
          status: statusCode,
          statusId: status?.id || null,
          vehicleId: vehicle.id,
          notes: noteText,
        } as StatusData

        if (statusCode) {
          const meta = statusMetaByCode.get(statusCode)
          const group = meta?.groupStatus?.trim() || 'LAINNYA'
          const field = `group_${group}`
          row[field] = (row[field] || 0) + 1
        }
      })

      return recalculateSummaryFields(row)
    })
  }, [vehicles?.data, allActualStatuses?.data, daysArray, statusGroups, statusMetaByCode, recalculateSummaryFields, notes])

  const rowData = useMemo(() => {
    if (changedRows.size === 0) return baseRowData
    return baseRowData.map((row: RowData) => changedRows.get(row.vehicleId) || row)
  }, [baseRowData, changedRows])

  const filteredRowData = useMemo(() => {
    return rowData.filter((row: RowData) => {
      const matchesNopol = !searchNopol || row.nopol.toLowerCase().includes(searchNopol.toLowerCase())
      const matchesType = !searchType || (row.vehicleType || '').toLowerCase().includes(searchType.toLowerCase())
      let matchesStatus = !searchStatus
      if (!matchesStatus) {
        for (let i = 1; i <= daysArray.length; i++) {
          const dayData = row[`day${i}`] as StatusData | undefined
          if (dayData?.status === searchStatus) { matchesStatus = true; break }
        }
      }
      return matchesNopol && matchesType && matchesStatus
    })
  }, [rowData, searchNopol, searchStatus, searchType, daysArray])

  const kpiData = useMemo(() => {
    const monthDays = getDaysInMonth(new Date(selectedDate))
    const visibleDays = daysArray.length
    const denominatorDays = viewMode === 'monthly' ? monthDays : visibleDays
    const totalPossible = rowData.length * denominatorDays

    const totals = {
      cells: 0,
      uti: 0,
      breakdown: 0,
      bdjNextDay: 0,
      dna: 0,
      readyForUse: 0,
      productive: 0,
    }

    rowData.forEach((row: RowData) => {
      daysArray.forEach((_, index) => {
        const dayData = row[`day${index + 1}`] as StatusData | undefined
        if (!dayData) return

        totals.cells += 1
        if (!dayData.status) return

        const statusCode = dayData.status
        const meta = statusMetaByCode.get(statusCode)
        const group = meta?.groupStatus?.trim().toUpperCase() || ''

        const isBreakdown = statusCode === 'BD' || group === 'BREAKDOWN'
        if (isBreakdown) totals.breakdown += 1
        if (statusCode === 'BDJ+1') totals.bdjNextDay += 1
        if (group === 'DNA') totals.dna += 1
        if (group === 'READY FOR USE') totals.readyForUse += 1

        const isProductivity = meta?.isProductivity ?? statusCode === 'UTI'
        if (isProductivity) totals.productive += 1
        if (statusCode === 'UTI') totals.uti += 1
      })
    })

    const pa = totalPossible
      ? ((totalPossible - totals.breakdown - totals.bdjNextDay) / totalPossible) * 100
      : 0
    const ua = totalPossible
      ? ((totalPossible - totals.breakdown - totals.dna - totals.readyForUse) / totalPossible) * 100
      : 0
    const productivity = totalPossible
      ? (totals.productive / totalPossible) * 100
      : 0

    return {
      pa,
      ua,
      productivity,
      uti: totals.uti,
      totalCells: totals.cells,
    }
  }, [daysArray, rowData, selectedDate, statusMetaByCode, viewMode])

  // Custom cell renderer for status columns
  const StatusCellRenderer = useCallback((props: any) => {
    const { value, data, colDef } = props
    if (!value || !value.date) return null

    const hexColor = value.status ? getStatusColor(value.status) : null
    const noteText = value.notes || ''
    const tooltipText = noteText
      ? `${noteText}`
      : `${data.nopol} - ${format(new Date(value.date), 'dd MMM yyyy', { locale: id })}`

    // Tentukan class animasi berdasarkan isi status
    const animationClass = value.status ? 'animate-cell-ripple' : 'animate-cell-pop';

    return (
      <div 
        className={`relative h-full w-full flex items-center justify-center cursor-pointer hover:brightness-95 group overflow-hidden status-color-transition ${animationClass}`}
        title={tooltipText}
        style={hexColor ? { backgroundColor: hexColor, color: '#ffffff' } : { backgroundColor: '#f8fafc' }}
        onClick={() => openCellEditor({
          vehicleId: data.vehicleId,
          nopol: data.nopol,
          date: value.date,
          field: colDef.field,
          statusCode: value.status || '',
          noteText: noteText
        })}
      >
        {noteText ? (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-white/80 shadow-sm animate-dot-bounce" />
        ) : null}
        <span className="text-xs font-bold uppercase">{value.status || '-'}</span>
      </div>
    )
  }, [getStatusColor, openCellEditor])

  // Column definitions
  const columnDefs = useMemo((): Array<ColDef | ColGroupDef> => {
    const baseCols: ColDef[] = [
      {
        field: 'nopol',
        headerName: 'NOPOL',
        width: 118,
        pinned: 'left',
        lockPinned: true,
        cellClass: 'actual-status-identity-cell actual-status-nopol-cell',
      },
      {
        field: 'vehicleType',
        headerName: 'TIPE',
        width: 110,
        pinned: 'left',
        lockPinned: true,
        cellClass: 'actual-status-identity-cell',
      },
      {
        field: 'tonase',
        headerName: 'TONASE',
        hide: true,
        valueFormatter: (params) => params.value || '-',
      },
      {
        field: 'kubikasi',
        headerName: 'KUBIKASI',
        hide: true,
        valueFormatter: (params) => params.value || '-',
      },
      {
        field: 'customer',
        headerName: 'CUSTOMER',
        width: 160,
        pinned: 'left',
        lockPinned: true,
        cellClass: 'actual-status-identity-cell',
      },
      {
        field: 'driver',
        headerName: 'DRIVER',
        width: 150,
        pinned: 'left',
        lockPinned: true,
        cellClass: 'actual-status-identity-cell',
      },
    ]

    const dayCols: ColGroupDef[] = [
      {
        headerName: 'TANGGAL',
        marryChildren: true,
        children: daysArray.map((day, index) => ({
          field: `day${index + 1}`,
          headerName: `${format(day, 'd', { locale: id })}\n${format(day, 'EEE', { locale: id })}`,
          headerTooltip: format(day, 'dd MMMM yyyy', { locale: id }),
          width: 86,
          minWidth: 78,
          cellRenderer: StatusCellRenderer,
          cellClass: 'actual-status-cell',
          suppressMovable: true,
        })),
      },
    ]

    const summaryCols: ColDef[] = [
      ...statusGroups.map((group) => ({
        field: `group_${group}`,
        headerName: group,
        width: 110,
        suppressMovable: true,
        valueFormatter: (params: any) => params.value ?? 0,
        cellClass: 'actual-status-summary-cell',
      })),
      {
        field: 'paPercent',
        headerName: 'PA %',
        width: 90,
        suppressMovable: true,
        valueFormatter: (params: any) => `${Number(params.value ?? 0).toFixed(1)}%`,
        cellClass: 'actual-status-summary-cell',
      },
      {
        field: 'uaPercent',
        headerName: 'UA %',
        width: 90,
        suppressMovable: true,
        valueFormatter: (params: any) => `${Number(params.value ?? 0).toFixed(1)}%`,
        cellClass: 'actual-status-summary-cell',
      },

    ]

    return [...baseCols, ...dayCols, ...summaryCols]
  }, [StatusCellRenderer, daysArray, statusGroups])

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage('')

    try {
      const token = localStorage.getItem('token')
      const updates: any[] = []

      // Collect all status changes from changed rows
      changedRows.forEach((rowData) => {
        for (let i = 1; i <= daysArray.length; i++) {
          const dayData = rowData[`day${i}`]
          if (dayData?.status) {
            updates.push({
              vehicleId: dayData.vehicleId,
              date: dayData.date,
              statusCode: dayData.status,
              notes: dayData.notes || '',
            })
          }
        }
      })

      if (updates.length === 0) {
        setSaveMessage('Tidak ada perubahan data untuk disimpan')
        setSaving(false)
        return
      }

      const response = await fetch('/api/actual-status/bulk/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ updates }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        const failedCount = data?.data?.failed ?? updates.length
        setSaveMessage(`Gagal menyimpan ${failedCount} dari ${updates.length} data: ${data.message || response.statusText}`)
        return
      }

      setSaveMessage(
        `Berhasil menyimpan ${data.data.successful} dari ${updates.length} data`
      )
      setChangedRows(new Map())
      await queryClient.invalidateQueries({ queryKey: ['allActualStatus'] })
    } catch (error) {
      setSaveMessage('Terjadi kesalahan saat menyimpan')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const handleExportExcel = () => {
    const headers = [
      'NOPOL',
      'TIPE',
      'CUSTOMER',
      'DRIVER',
      ...daysArray.map((day) => format(day, 'dd MMM yyyy', { locale: id })),
    ]

    const workbook = XLSX.utils.book_new()
    const rows = rowData.map((row: any) => {
      const dayValues = daysArray.map((_, index) => row[`day${index + 1}`]?.status || '')
      return [row.nopol, row.vehicleType || '', row.customer || '', row.driver || '', ...dayValues]
    })

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])

    rowData.forEach((row: any, rowIndex: number) => {
      daysArray.forEach((day, colIndex) => {
        const noteKey = getNoteKey(row.nopol, format(day, 'yyyy-MM-dd'))
        const noteText = notes[noteKey]
        if (noteText) {
          const cellAddress = XLSX.utils.encode_cell({ r: rowIndex + 1, c: 4 + colIndex })
          const cell = worksheet[cellAddress]
          if (cell) {
            cell.c = [{ t: noteText, a: 'Note' }]
          }
        }
      })
    })

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Matrix Status Armada')
    XLSX.writeFile(workbook, `matrix-status-armada-${selectedDate}.xlsx`)
  }

  const copyActualStatus = async (fromDate: string, toDate: string) => {
    if (!fromDate || !toDate) {
      setSaveMessage('Tanggal sumber dan tanggal tujuan harus diisi')
      return
    }

    if (fromDate === toDate) {
      setSaveMessage('Tanggal sumber dan tanggal tujuan tidak boleh sama')
      return
    }

    setGenerating(true)
    setSaveMessage('')

    try {
      const token = localStorage.getItem('token')
      const sourceResponse = await fetch(`/api/actual-status/date?date=${fromDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const sourceData = await sourceResponse.json()
      const sourceStatuses = sourceData?.data || []

      const updates = sourceStatuses
        .map((status: any) => {
          const statusCode = status.status?.code || status.statusCode

          if (!status.vehicleId || !statusCode) return null

          return {
            vehicleId: status.vehicleId,
            date: toDate,
            statusCode,
            notes: status.notes || '',
          }
        })
        .filter(Boolean)

      if (updates.length === 0) {
        setSaveMessage(`Tidak ada data VOR pada ${format(new Date(fromDate), 'dd MMM yyyy', { locale: id })} untuk di-copy`)
        return
      }

      const response = await fetch('/api/actual-status/bulk/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ updates }),
      })

      const data = await response.json()

      if (data.success) {
        setChangedRows(new Map())
        setSaveMessage(
          `Berhasil generate ${data.data.successful || updates.length} data VOR dari ${format(new Date(fromDate), 'dd MMM yyyy', { locale: id })} ke ${format(new Date(toDate), 'dd MMM yyyy', { locale: id })}`
        )

        const visibleDates = daysArray.map((day) => format(day, 'yyyy-MM-dd'))
        if (!visibleDates.includes(toDate)) {
          setSelectedDate(toDate)
        } else {
          queryClient.invalidateQueries({ queryKey: ['allActualStatus', selectedDate, viewMode] })
        }
      } else {
        setSaveMessage(`Gagal generate data VOR: ${data.message || 'Kesalahan tidak diketahui'}`)
      }
    } catch (error) {
      setSaveMessage('Terjadi kesalahan saat generate data VOR')
      console.error(error)
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateNextDay = () => {
    // Generate H+1: copy yesterday -> today
    const toDate = format(new Date(), 'yyyy-MM-dd')
    const fromDate = format(addDays(new Date(), -1), 'yyyy-MM-dd')

    setCopyFromDate(fromDate)
    setCopyToDate(toDate)
    setSelectedDate(toDate)
    copyActualStatus(fromDate, toDate)
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <style>{animationStyles}</style>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Actual Operation</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-5 h-5" />
            <span>Export</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving || changedRows.size === 0}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Menyimpan...' : `Simpan${changedRows.size > 0 ? ` (${changedRows.size})` : ''}`}</span>
          </button>
        </div>
      </div>

      {saveMessage && (
        <div
          className={`px-4 py-3 rounded-lg ${
            saveMessage.includes('Berhasil')
              ? 'bg-green-50 border border-green-200 text-green-600'
              : 'bg-red-50 border border-red-200 text-red-600'
          }`}
        >
          {saveMessage}
        </div>
      )}

      {cellEditor.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[400px] rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <p className="text-sm font-bold text-slate-900">Update Status & Catatan</p>
                <p className="text-xs text-slate-500">{cellEditor.nopol} • {format(new Date(cellEditor.date), 'dd MMM yyyy', { locale: id })}</p>
              </div>
              <button type="button" onClick={closeCellEditor} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>
            
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Status Armada</label>
                <select
                  value={cellEditor.statusCode}
                  onChange={(e) => setCellEditor(prev => ({ ...prev, statusCode: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-slate-50 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value="">Pilih Status</option>
                  {masterStatuses?.data?.map((ms: any) => (
                    <option key={ms.code} value={ms.code}>{ms.code} - {ms.description}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Catatan (Optional)</label>
                <textarea
                  value={cellEditor.noteText}
                  onChange={(e) => setCellEditor((prev) => ({ ...prev, noteText: e.target.value }))}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Masukkan alasan breakdown atau catatan lainnya..."
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeCellEditor}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveCellEditor}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm"
              >
                Update Grid
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">PA</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{kpiData.pa.toFixed(1)}%</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Truck className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">UA</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{kpiData.ua.toFixed(1)}%</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Total UTI</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{kpiData.uti}</p>
              <p className="text-xs text-gray-500">dari {kpiData.totalCells} cell</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  setCopyFromDate(e.target.value)
                  setCopyToDate(format(addDays(new Date(e.target.value), 1), 'yyyy-MM-dd'))
                  setChangedRows(new Map())
                  setSaveMessage('')
                }}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-600">View</span>
              <button
                type="button"
                onClick={() => {
                  setViewMode('weekly')
                  setChangedRows(new Map())
                  setSaveMessage('')
                }}
                className={`px-3 py-2 rounded-lg border text-sm transition ${
                  viewMode === 'weekly'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Weekly (7 hari)
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('monthly')
                  setChangedRows(new Map())
                  setSaveMessage('')
                }}
                className={`px-3 py-2 rounded-lg border text-sm transition ${
                  viewMode === 'monthly'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Bulan berjalan
              </button>
            </div>
          </div>
          <div className="flex gap-2 lg:ml-auto flex-wrap">
            {Array.from(
              (masterStatuses?.data || []).reduce((groups: Map<string, any>, status: any) => {
                if (status.groupStatus && !groups.has(status.groupStatus)) groups.set(status.groupStatus, status)
                return groups
              }, new Map<string, any>()).values()
            ).map((status: any) => {
              const hexColor = getStatusColor(status.code) || status.color

              return (
                <div key={status.groupStatus} className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5">
                  <div
                    className={`w-3 h-3 rounded-full ${hexColor ? '' : getStatusClassName(status.code)}`}
                    style={hexColor ? { backgroundColor: hexColor } : undefined}
                  />
                  <span className="text-xs font-medium text-gray-700">{status.groupStatus}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col xl:flex-row xl:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Copy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Generate Data VOR</h2>
              <p className="text-xs text-gray-500">Copy status armada dari satu tanggal ke tanggal lain.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 xl:ml-auto xl:min-w-[520px]">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-gray-500">Copy dari</span>
              <input
                type="date"
                value={copyFromDate}
                onChange={(e) => setCopyFromDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </label>
            <div className="hidden sm:flex items-end justify-center pb-2 text-gray-400">
              <ArrowRight className="h-5 w-5" />
            </div>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-gray-500">Copy ke</span>
              <input
                type="date"
                value={copyToDate}
                onChange={(e) => setCopyToDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 xl:ml-auto">
            <button
              onClick={handleGenerateNextDay}
              disabled={generating}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              <span>{generating ? 'Generate...' : 'Generate H+1'}</span>
            </button>
            <button
              onClick={() => copyActualStatus(copyFromDate, copyToDate)}
              disabled={generating}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <Copy className="w-4 h-4" />
              <span>{generating ? 'Memproses...' : 'Generate Custom'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Matrix Status Armada</h2>
            <p className="text-xs text-gray-500">Kolom Nopol, Tipe, Customer, dan Driver tetap terlihat saat scroll horizontal.</p>
          </div>
          <div className="text-xs text-gray-500">
            {filteredRowData.length} dari {rowData.length} unit x {daysArray.length} hari
          </div>
        </div>
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
        </div>
        <div className="ag-theme-quartz actual-status-grid" style={{ height: '640px', width: '100%' }}>
          <AgGridReact
            theme="legacy"
            rowData={filteredRowData}
            columnDefs={columnDefs}
            defaultColDef={{
              resizable: true,
              sortable: false,
              filter: false,
              wrapHeaderText: true,
              autoHeaderHeight: true,
            }}
            getRowId={(params) => params.data.vehicleId}
            suppressMovableColumns
            suppressColumnVirtualisation={false}
            enableBrowserTooltips
            rowHeight={44}
            headerHeight={54}
            groupHeaderHeight={38}
            domLayout="normal"
          />
        </div>
      </div>
    </div>
  )
}
