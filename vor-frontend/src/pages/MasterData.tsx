import { useState, useRef, useMemo } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { 
  Plus, Search, Edit2, Trash2, AlertCircle, LayoutGrid, List, Filter,
  Truck, CheckCircle2, XCircle, Weight, Package, User, Archive
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import AddVehicleModal from '@/components/AddVehicleModal'
import EditVehicleModal from '@/components/EditVehicleModal'
import AddDriverModal from '@/components/AddDriverModal'
import EditDriverModal from '@/components/EditDriverModal'
import AddCustomerModal from '@/components/AddCustomerModal'
import EditCustomerModal from '@/components/EditCustomerModal'
import AddMasterStatusModal from '@/components/AddMasterStatusModal'
import EditMasterStatusModal from '@/components/EditMasterStatusModal'

const staggerStyles = `
  .stagger-1 { animation-delay: 0.1s; }
  .stagger-2 { animation-delay: 0.2s; }
  .stagger-3 { animation-delay: 0.3s; }
  .stagger-4 { animation-delay: 0.4s; }
`;

interface TabContent {
  id: 'vehicles' | 'unitTypes' | 'drivers' | 'customers' | 'status' | 'roles' | 'branches'
  label: string
  icon: string
}

const allTabs: TabContent[] = [
  { id: 'vehicles', label: 'Armada', icon: '🚚' },
  { id: 'unitTypes', label: 'Type Unit', icon: '🚛' },
  { id: 'drivers', label: 'Driver', icon: '👨‍💼' },
  { id: 'customers', label: 'Customer', icon: '🏢' },
  { id: 'branches', label: 'Cabang', icon: '🏬' },
  { id: 'status', label: 'Status', icon: '📋' },
  { id: 'roles', label: 'Role & Permission', icon: '🔐' },
]

const vehicleTemplateHeaders = [
  'nopol',
  'vehicleType',
  'tonase',
  'kubikasi',
  'nomorRangka',
  'detailUnit',
  'targetRevenue',
  'nomorLambung',
  'vhcId',
  'isActive',
  'cabang',
  'customerId',
  'driverId',
]

const driverTemplateHeaders = ['name']

// Role definitions with permissions
const roles = [
  {
    name: 'ADMIN',
    description: 'Administrator dengan akses penuh ke semua fitur',
    color: 'bg-red-100 text-red-800',
    permissions: {
      'User Management': true,
      'Create Master Data': true,
      'Actual Status Write': true,
      'Forecast Write': true,
      'Revenue Write': true,
      'Record Deviation': true,
      'Calculate KPI': true,
      'View Everything': true,
    }
  },
  {
    name: 'PLANNER',
    description: 'Planner yang bertanggung jawab atas perencanaan operasional',
    color: 'bg-blue-100 text-blue-800',
    permissions: {
      'User Management': false,
      'Create Master Data': false,
      'Actual Status Write': true,
      'Forecast Write': true,
      'Revenue Write': true,
      'Record Deviation': false,
      'Calculate KPI': false,
      'View Everything': true,
    }
  },
  {
    name: 'SUPERVISOR',
    description: 'Supervisor yang mengawasi operasional dan KPI',
    color: 'bg-green-100 text-green-800',
    permissions: {
      'User Management': false,
      'Create Master Data': false,
      'Actual Status Write': false,
      'Forecast Write': false,
      'Revenue Write': false,
      'Record Deviation': true,
      'Calculate KPI': true,
      'View Everything': true,
    }
  },
  {
    name: 'MANAGEMENT',
    description: 'Management yang hanya dapat melihat laporan dan analisis',
    color: 'bg-purple-100 text-purple-800',
    permissions: {
      'User Management': false,
      'Create Master Data': false,
      'Actual Status Write': false,
      'Forecast Write': false,
      'Revenue Write': false,
      'Record Deviation': false,
      'Calculate KPI': false,
      'View Everything': true,
    }
  },
]

const permissionList = [
  'User Management',
  'Create Master Data',
  'Actual Status Write',
  'Forecast Write',
  'Revenue Write',
  'Record Deviation',
  'Calculate KPI',
  'View Everything',
]

// Pilih warna teks kontras (hitam/putih) berdasarkan kecerahan warna latar hex
function readableTextColor(hex?: string): string {
  if (!hex) return '#1f2937'
  const c = hex.replace('#', '')
  const full = c.length === 3 ? c.split('').map((x) => x + x).join('') : c
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return '#1f2937'
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#1f2937' : '#ffffff'
}

const restrictedRoles = ['SUPERVISOR', 'PLANNER']

const adminOnlyTabs: TabContent['id'][] = ['branches', 'roles']

export default function MasterData() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const isRestricted = restrictedRoles.includes(user?.role || '')
  const tabs = isRestricted
    ? allTabs.filter((tab) => !adminOnlyTabs.includes(tab.id))
    : allTabs

  const [activeTab, setActiveTab] = useState<'vehicles' | 'unitTypes' | 'drivers' | 'customers' | 'status' | 'roles' | 'branches'>('vehicles')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [vehicleTypeForm, setVehicleTypeForm] = useState({ id: '', name: '', description: '' })
  const [vehicleTypeMessage, setVehicleTypeMessage] = useState('')
  const [branchForm, setBranchForm] = useState({ id: '', name: '', code: '', description: '' })
  const [branchMessage, setBranchMessage] = useState('')
  const [vehicleImportMessage, setVehicleImportMessage] = useState('')
  const [driverImportMessage, setDriverImportMessage] = useState('')
  const [isImportingVehicles, setIsImportingVehicles] = useState(false)
  const [isImportingDrivers, setIsImportingDrivers] = useState(false)
  const vehicleFileInputRef = useRef<HTMLInputElement>(null)
  const driverFileInputRef = useRef<HTMLInputElement>(null)
  const itemsPerPage = 10
  const queryClient = useQueryClient()

  // Vehicle modals
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false)
  const [isEditVehicleOpen, setIsEditVehicleOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null)

  // Driver modals
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false)
  const [isEditDriverOpen, setIsEditDriverOpen] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState<any>(null)

  // Customer modals
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false)
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)

  // Master Status modals
  const [isEditMasterStatusOpen, setIsEditMasterStatusOpen] = useState(false)
  const [isAddMasterStatusOpen, setIsAddMasterStatusOpen] = useState(false)
  const [selectedMasterStatus, setSelectedMasterStatus] = useState<any>(null)

  // Queries
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

  const { data: drivers } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/drivers', {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
  })

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/customers', {
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

  const { data: vehicleTypes } = useQuery({
    queryKey: ['vehicleTypes'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/vehicle-types', {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
  })

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/branches', {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
  })

  // Delete mutations
  const deleteVehicle = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/vehicles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    },
  })

  const deleteDriver = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/drivers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
    },
  })

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })

  const deleteMasterStatus = useMutation({
    mutationFn: async (code: string) => {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/master-status/code/${code}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterStatuses'] })
    },
  })

  const saveBranch = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch(branchForm.id ? `/api/branches/${branchForm.id}` : '/api/branches', {
        method: branchForm.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: branchForm.name.trim(),
          code: branchForm.code.trim() || undefined,
          description: branchForm.description.trim() || undefined,
        }),
      })
      return response.json()
    },
    onSuccess: (data) => {
      if (data.success) {
        setBranchMessage(branchForm.id ? 'Cabang berhasil diperbarui' : 'Cabang berhasil ditambahkan')
        setBranchForm({ id: '', name: '', code: '', description: '' })
        queryClient.invalidateQueries({ queryKey: ['branches'] })
      } else {
        setBranchMessage(data.message || 'Gagal menyimpan cabang')
      }
    },
  })

  const deleteBranch = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/branches/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    onSuccess: (data) => {
      if (data.success) {
        setBranchMessage(data.message || 'Cabang berhasil dihapus')
      } else {
        setBranchMessage(data.message || 'Gagal menghapus cabang')
      }
      queryClient.invalidateQueries({ queryKey: ['branches'] })
    },
  })

  const saveVehicleType = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch(vehicleTypeForm.id ? `/api/vehicle-types/${vehicleTypeForm.id}` : '/api/vehicle-types', {
        method: vehicleTypeForm.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: vehicleTypeForm.name.trim(),
          description: vehicleTypeForm.description.trim() || undefined,
        }),
      })
      return response.json()
    },
    onSuccess: (data) => {
      if (data.success) {
        setVehicleTypeMessage(vehicleTypeForm.id ? 'Tipe unit berhasil diperbarui' : 'Tipe unit berhasil ditambahkan')
        setVehicleTypeForm({ id: '', name: '', description: '' })
        queryClient.invalidateQueries({ queryKey: ['vehicleTypes'] })
      } else {
        setVehicleTypeMessage(data.message || 'Gagal menyimpan tipe unit')
      }
    },
  })

  const deleteVehicleType = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/vehicle-types/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    onSuccess: (data) => {
      setVehicleTypeMessage(data.message || (data.success ? 'Tipe unit berhasil dihapus' : 'Gagal menghapus tipe unit'))
      queryClient.invalidateQueries({ queryKey: ['vehicleTypes'] })
    },
  })

  const parseCSV = (csvText: string) => {
    const text = csvText.replace(/\uFEFF/g, '').trim()
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
    if (lines.length === 0) return []

    const headers = lines[0].split(',').map((header) => header.trim())

    return lines.slice(1).map((line) => {
      const values: string[] = []
      let current = ''
      let inQuotes = false

      for (let i = 0; i < line.length; i += 1) {
        const char = line[i]

        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"'
            i += 1
          } else {
            inQuotes = !inQuotes
          }
        } else if (char === ',' && !inQuotes) {
          values.push(current)
          current = ''
        } else {
          current += char
        }
      }

      values.push(current)

      return headers.reduce((record, header, index) => {
        record[header] = (values[index] || '').trim()
        return record
      }, {} as Record<string, string>)
    })
  }

  const downloadCSVTemplate = (filename: string, headers: string[]) => {
    const csv = `${headers.join(',')}\n`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const importVehicleCSV = async (file: File | null) => {
    setVehicleImportMessage('')
    if (!file) return

    setIsImportingVehicles(true)
    try {
      const text = await file.text()
      const rows = parseCSV(text)
      if (rows.length === 0) {
        setVehicleImportMessage('File CSV kosong atau tidak valid.')
        return
      }

      const branchList = (branches?.data || []) as { id: string; name: string }[]
      const branchMap = Object.fromEntries(branchList.map((b) => [b.name.toLowerCase(), b.id]))

      const token = localStorage.getItem('token')
      const results = await Promise.all(rows.map(async (row, index) => {
        const cabang = row.cabang || ''
        const branchId = branchMap[cabang.toLowerCase()]

        if (!row.nopol || !row.vehicleType || !cabang) {
          return {
            success: false,
            message: `Baris ${index + 2}: nopol, vehicleType, dan cabang wajib diisi.`,
          }
        }

        if (!branchId) {
          return {
            success: false,
            message: `Baris ${index + 2}: cabang "${cabang}" tidak ditemukan.`,
          }
        }

        const payload = {
          nopol: row.nopol,
          vehicleType: row.vehicleType,
          branchId,
          tonase: row.tonase ? Number(row.tonase) : undefined,
          kubikasi: row.kubikasi ? Number(row.kubikasi) : undefined,
          nomorRangka: row.nomorRangka || undefined,
          detailUnit: row.detailUnit || undefined,
          targetRevenue: row.targetRevenue ? Number(row.targetRevenue) : undefined,
          nomorLambung: row.nomorLambung || undefined,
          vhcId: row.vhcId || undefined,
          isActive: row.isActive ? row.isActive.toLowerCase() === 'true' : true,
          customerId: row.customerId || undefined,
          driverId: row.driverId || undefined,
        }

        const response = await fetch('/api/vehicles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        })

        const data = await response.json()
        return {
          success: response.ok && data.success,
          message: data.message || data.error || response.statusText,
          row: index + 2,
        }
      }))

      const successCount = results.filter((r) => r.success).length
      const failed = results.filter((r) => !r.success)
      if (successCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      }

      setVehicleImportMessage(
        failed.length === 0
          ? `${successCount} baris Armada berhasil diimpor.`
          : `${successCount} baris berhasil, ${failed.length} baris gagal. ${failed.slice(0, 3).map((r) => r.message).join(' ')}`
      )
    } catch (error) {
      setVehicleImportMessage('Terjadi kesalahan saat membaca file CSV.')
    } finally {
      setIsImportingVehicles(false)
    }
  }

  const importDriverCSV = async (file: File | null) => {
    setDriverImportMessage('')
    if (!file) return

    setIsImportingDrivers(true)
    try {
      const text = await file.text()
      const rows = parseCSV(text)
      if (rows.length === 0) {
        setDriverImportMessage('File CSV kosong atau tidak valid.')
        return
      }

      const token = localStorage.getItem('token')
      const results = await Promise.all(rows.map(async (row, index) => {
        const payload = {
          name: row.name || '',
        }

        if (!payload.name) {
          return {
            success: false,
            message: `Baris ${index + 2}: nama pengemudi wajib diisi.`,
          }
        }

        const response = await fetch('/api/drivers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        })

        const data = await response.json()
        return {
          success: response.ok && data.success,
          message: data.message || data.error || response.statusText,
          row: index + 2,
        }
      }))

      const successCount = results.filter((r) => r.success).length
      const failed = results.filter((r) => !r.success)
      if (successCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['drivers'] })
      }

      setDriverImportMessage(
        failed.length === 0
          ? `${successCount} baris Pengemudi berhasil diimpor.`
          : `${successCount} baris berhasil, ${failed.length} baris gagal. ${failed.slice(0, 3).map((r) => r.message).join(' ')}`
      )
    } catch (error) {
      setDriverImportMessage('Terjadi kesalahan saat membaca file CSV.')
    } finally {
      setIsImportingDrivers(false)
    }
  }

  const handleVehicleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    await importVehicleCSV(file)
    event.target.value = ''
  }

  const handleDriverFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    await importDriverCSV(file)
    event.target.value = ''
  }

  // Filter and paginate vehicles
  const filteredVehicles = (vehicles?.data || []).filter((vehicle: any) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = 
      vehicle.nopol?.toLowerCase().includes(searchLower) ||
      vehicle.vehicleType?.toLowerCase().includes(searchLower) ||
      vehicle.cabang?.toLowerCase().includes(searchLower) ||
      vehicle.customer?.name?.toLowerCase().includes(searchLower)
    
    const matchesBranch = selectedBranch === '' || vehicle.cabang === selectedBranch
    
    return matchesSearch && matchesBranch
  })

  // Filter and paginate drivers
  const filteredDrivers = (drivers?.data || []).filter((driver: any) => {
    const searchLower = searchTerm.toLowerCase()
    return driver.name?.toLowerCase().includes(searchLower)
  })

  // Filter and paginate customers
  const filteredCustomers = (customers?.data || []).filter((customer: any) => {
    const searchLower = searchTerm.toLowerCase()
    return customer.name?.toLowerCase().includes(searchLower)
  })

  const filteredVehicleTypes = (vehicleTypes?.data || []).filter((type: any) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      type.name?.toLowerCase().includes(searchLower) ||
      type.description?.toLowerCase().includes(searchLower)
    )
  })

  const filteredBranches = (branches?.data || []).filter((branch: any) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      branch.name?.toLowerCase().includes(searchLower) ||
      branch.code?.toLowerCase().includes(searchLower) ||
      branch.description?.toLowerCase().includes(searchLower)
    )
  })

  const totalPages = Math.ceil(
    (activeTab === 'vehicles' ? filteredVehicles.length : 
     activeTab === 'unitTypes' ? filteredVehicleTypes.length :
     activeTab === 'drivers' ? filteredDrivers.length :
     activeTab === 'customers' ? filteredCustomers.length :
     activeTab === 'branches' ? filteredBranches.length : 0) / itemsPerPage
  )

  const getCurrentPageData = () => {
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage

    if (activeTab === 'vehicles') return filteredVehicles.slice(start, end)
    if (activeTab === 'unitTypes') return filteredVehicleTypes.slice(start, end)
    if (activeTab === 'drivers') return filteredDrivers.slice(start, end)
    if (activeTab === 'customers') return filteredCustomers.slice(start, end)
    if (activeTab === 'branches') return filteredBranches.slice(start, end)
    return []
  }

  const resetPagination = () => {
    setCurrentPage(1)
    setSearchTerm('')
    setSelectedBranch('')
  }
  
  // Stats Calculation for Vehicles
  const vehicleStats = useMemo(() => {
    const data = vehicles?.data || []
    const total = data.length
    const aktif = data.filter((v: any) => v.isActive).length
    const nonaktif = total - aktif
    const totalTonase = data.reduce((acc: number, v: any) => acc + (Number(v.tonase) || 0), 0)
    return { total, aktif, nonaktif, totalTonase }
  }, [vehicles?.data])

  const counts = useMemo(() => ({
    vehicles: vehicles?.data?.length || 0,
    drivers: drivers?.data?.length || 0,
    customers: customers?.data?.length || 0,
    branches: branches?.data?.length || 0,
    unitTypes: vehicleTypes?.data?.length || 0,
    status: masterStatuses?.data?.length || 0,
  }), [vehicles, drivers, customers, branches, vehicleTypes, masterStatuses])

  return (
    <div className="space-y-6 animate-fade-up">
      <style>{staggerStyles}</style>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Master Data</h1>
        {(activeTab as string) !== 'roles' && (activeTab as string) !== 'unitTypes' && (
          <div className="relative group">
            <button
              onClick={() => {
                if (activeTab === 'vehicles') setIsAddVehicleOpen(true)
                else if (activeTab === 'drivers') setIsAddDriverOpen(true)
                else if (activeTab === 'customers') setIsAddCustomerOpen(true)
                else if (activeTab === 'branches') setBranchForm({ id: '', name: '', code: '', description: '' })
                else if (activeTab === 'status' && isAdmin) setIsAddMasterStatusOpen(true)
              }}
              disabled={!isAdmin}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                !isAdmin
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400 shadow-lg shadow-emerald-500/25'
              }`}
            >
              <Plus className="w-5 h-5" />
              <span>Tambah</span>
            </button>
            {!isAdmin && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-lg">
                Hanya ADMIN yang dapat menambah data
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stat Cards (Only for Vehicles Tab) */}
      {activeTab === 'vehicles' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Total Armada" value={vehicleStats.total} icon={<Truck className="text-blue-600" />} color="bg-blue-50" delay="stagger-1" />
          <StatCard label="Aktif" value={vehicleStats.aktif} icon={<CheckCircle2 className="text-emerald-600" />} color="bg-emerald-50" delay="stagger-2" />
          <StatCard label="Nonaktif" value={vehicleStats.nonaktif} icon={<XCircle className="text-rose-600" />} color="bg-rose-50" delay="stagger-3" />
          <StatCard label="Total Kapasitas" value={`${vehicleStats.totalTonase} Ton`} icon={<Weight className="text-amber-600" />} color="bg-amber-50" delay="stagger-4" />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                resetPagination()
              }}
              className={`flex-1 min-w-max px-6 py-4 font-bold transition-all flex items-center justify-center gap-2 border-b-2 ${
                activeTab === tab.id
                  ? 'text-blue-600 border-blue-600 bg-blue-50/50'
                  : 'text-gray-500 border-transparent hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {counts[tab.id as keyof typeof counts] !== undefined && (
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                  {counts[tab.id as keyof typeof counts]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Search Bar */}
          {activeTab !== 'status' && activeTab !== 'roles' && (
            <div className="mb-6 flex gap-4">
              <div className="flex-1 relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  placeholder={`Cari ${
                  activeTab === 'vehicles'
                    ? 'kendaraan...'
                    : activeTab === 'drivers'
                    ? 'pengemudi...'
                    : activeTab === 'customers'
                    ? 'pelanggan...'
                    : activeTab === 'branches'
                    ? 'cabang...'
                    : ''
                }`}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              {activeTab === 'vehicles' && (
                <div className="relative min-w-[160px]">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select
                    value={selectedBranch}
                    onChange={(e) => {
                      setSelectedBranch(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium text-gray-700 appearance-none cursor-pointer"
                  >
                    <option value="">Semua Cabang</option>
                    {(branches?.data || []).map((branch: any) => (
                      <option key={branch.id} value={branch.name}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {activeTab === 'vehicles' && (
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                  >
                    <LayoutGrid className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {(activeTab === 'vehicles' || activeTab === 'drivers') && (
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => downloadCSVTemplate(
                    activeTab === 'vehicles' ? 'vehicle-template.csv' : 'driver-template.csv',
                    activeTab === 'vehicles' ? vehicleTemplateHeaders : driverTemplateHeaders,
                  )}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Download Template
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'vehicles') vehicleFileInputRef.current?.click()
                    else driverFileInputRef.current?.click()
                  }}
                  disabled={!isAdmin}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isAdmin ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isAdmin ? 'Impor CSV' : 'Hanya ADMIN' }
                </button>
              </div>
              <div className="text-sm text-gray-600">
                {activeTab === 'vehicles' ? vehicleImportMessage : driverImportMessage}
                {(isImportingVehicles && activeTab === 'vehicles') || (isImportingDrivers && activeTab === 'drivers') ? (
                  <span> Memproses file...</span>
                ) : null}
              </div>
              <input type="file" hidden accept=".csv" ref={vehicleFileInputRef} onChange={handleVehicleFileChange} />
              <input type="file" hidden accept=".csv" ref={driverFileInputRef} onChange={handleDriverFileChange} />
            </div>
          )}

          {/* Vehicles Table */}
          {activeTab === 'vehicles' && (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getCurrentPageData().map((vehicle: any, idx: number) => (
                  <VehicleCard 
                    key={vehicle.id} 
                    vehicle={vehicle} 
                    index={idx} 
                    isAdmin={isAdmin}
                    onEdit={() => { setSelectedVehicle(vehicle); setIsEditVehicleOpen(true); }}
                    onDelete={() => { if (confirm('Yakin ingin menghapus?')) deleteVehicle.mutate(vehicle.id); }}
                  />
                ))}
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nopol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipe</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Rangka</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detail Unit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nomor Lambung</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">VHCID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tonase</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cabang</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pelanggan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getCurrentPageData().map((vehicle: any) => (
                    <tr key={vehicle.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{vehicle.nopol}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{vehicle.vehicleType}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{vehicle.nomorRangka || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{vehicle.detailUnit || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{vehicle.targetRevenue != null ? Number(vehicle.targetRevenue).toLocaleString('id-ID') : '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{vehicle.nomorLambung || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">{vehicle.vhcId || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{vehicle.tonase || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{vehicle.cabang}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{vehicle.customer?.name || '-'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${vehicle.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {vehicle.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-sm space-x-2 flex">
                          <button
                            onClick={() => {
                              setSelectedVehicle(vehicle)
                              setIsEditVehicleOpen(true)
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Yakin ingin menghapus?')) {
                                deleteVehicle.mutate(vehicle.id)
                              }
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {/* Unit Types Table */}
          {activeTab === 'unitTypes' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">{vehicleTypeForm.id ? 'Edit Type Unit' : 'Buat Type Unit'}</h2>
                    <p className="text-sm text-gray-500">Kelola tipe unit untuk data kendaraan.</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${isAdmin ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {isAdmin ? 'ADMIN' : 'Read-only'}
                  </span>
                </div>

                {vehicleTypeMessage && (
                  <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
                    {vehicleTypeMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nama Tipe *</label>
                      <input
                        type="text"
                        value={vehicleTypeForm.name}
                        onChange={(e) => setVehicleTypeForm({ ...vehicleTypeForm, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Contoh: Tronton, Fuso, Colt Diesel"
                        disabled={!isAdmin}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                      <textarea
                        value={vehicleTypeForm.description}
                        onChange={(e) => setVehicleTypeForm({ ...vehicleTypeForm, description: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Deskripsi singkat tipe unit"
                        rows={4}
                        disabled={!isAdmin}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <button
                      onClick={() => saveVehicleType.mutate()}
                      disabled={!isAdmin}
                      type="button"
                      className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg hover:from-emerald-600 hover:to-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25"
                    >
                      {vehicleTypeForm.id ? 'Simpan Perubahan' : 'Tambah Tipe Unit'}
                    </button>
                    {vehicleTypeForm.id && (
                      <button
                        type="button"
                        onClick={() => setVehicleTypeForm({ id: '', name: '', description: '' })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Batal Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto bg-white rounded-xl border border-gray-100">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Tipe</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deskripsi</th>
                      {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {getCurrentPageData().map((type: any) => (
                      <tr key={type.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{type.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{type.description || '-'}</td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-sm space-x-2 flex">
                            <button
                              onClick={() => setVehicleTypeForm({ id: type.id, name: type.name, description: type.description || '' })}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Yakin ingin menghapus tipe unit ini?')) {
                                  deleteVehicleType.mutate(type.id)
                                }
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              Hapus
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Branches Table */}
          {activeTab === 'branches' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">
                      {branchForm.id ? 'Edit Cabang' : 'Buat Cabang'}
                    </h2>
                    <p className="text-sm text-gray-500">Kelola daftar cabang untuk relasi kendaraan dan user.</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${isAdmin ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {isAdmin ? 'ADMIN' : 'Read-only'}
                  </span>
                </div>

                {branchMessage && (
                  <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
                    {branchMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nama Cabang *</label>
                      <input
                        type="text"
                        value={branchForm.name}
                        onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Contoh: Jakarta"
                        disabled={!isAdmin}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Kode Cabang</label>
                      <input
                        type="text"
                        value={branchForm.code}
                        onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Contoh: JKT"
                        disabled={!isAdmin}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                      <textarea
                        value={branchForm.description}
                        onChange={(e) => setBranchForm({ ...branchForm, description: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Deskripsi singkat cabang"
                        rows={4}
                        disabled={!isAdmin}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <button
                      onClick={() => saveBranch.mutate()}
                      disabled={!isAdmin}
                      type="button"
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {branchForm.id ? 'Simpan Perubahan' : 'Tambah Cabang'}
                    </button>
                    {branchForm.id && (
                      <button
                        type="button"
                        onClick={() => setBranchForm({ id: '', name: '', code: '', description: '' })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Batal Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto bg-white rounded-xl border border-gray-100">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Cabang</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kode</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deskripsi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {getCurrentPageData().map((branch: any) => (
                      <tr key={branch.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{branch.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{branch.code || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{branch.description || '-'}</td>
                        <td className="px-6 py-4 text-sm space-x-2 flex">
                          <button
                            onClick={() => setBranchForm({ id: branch.id, name: branch.name, code: branch.code || '', description: branch.description || '' })}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Yakin ingin menghapus cabang ini? Pastikan tidak ada kendaraan atau user yang menggunakan cabang ini.')) {
                                deleteBranch.mutate(branch.id)
                              }
                            }}
                            className="text-red-600 hover:text-red-800"
                            disabled={!isAdmin}
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Drivers Table */}
          {activeTab === 'drivers' && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">NID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. HP</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SIM</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expired SIM</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cabang</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getCurrentPageData().map((driver: any) => (
                    <tr key={driver.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm text-gray-600">{driver.nid || '-'}</td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">{driver.name}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{driver.phone || '-'}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{driver.simType || '-'}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{driver.simExpiry ? new Date(driver.simExpiry).toLocaleDateString('id-ID') : '-'}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{driver.branch?.name || driver.cabang || '-'}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${driver.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {driver.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-4 text-sm space-x-2 flex">
                          <button onClick={() => { setSelectedDriver(driver); setIsEditDriverOpen(true) }} className="text-blue-600 hover:text-blue-800"><Edit2 className="w-4 h-4" /></button>
                          <button title="Arsipkan" onClick={() => { if (confirm('Arsipkan driver ini? Data historis tetap tersimpan; driver bisa diaktifkan kembali nanti.')) deleteDriver.mutate(driver.id) }} className="text-amber-600 hover:text-amber-800"><Archive className="w-4 h-4" /></button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Customers Table */}
          {activeTab === 'customers' && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Telepon</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PIC</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cabang</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getCurrentPageData().map((customer: any) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">{customer.name}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{customer.phone || '-'}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{customer.email || '-'}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{customer.pic || '-'}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{customer.branch?.name || customer.cabang || '-'}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${customer.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {customer.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-4 text-sm space-x-2 flex">
                          <button onClick={() => { setSelectedCustomer(customer); setIsEditCustomerOpen(true) }} className="text-blue-600 hover:text-blue-800"><Edit2 className="w-4 h-4" /></button>
                          <button title="Arsipkan" onClick={() => { if (confirm('Arsipkan customer ini? Data historis tetap tersimpan; customer bisa diaktifkan kembali nanti.')) deleteCustomer.mutate(customer.id) }} className="text-amber-600 hover:text-amber-800"><Archive className="w-4 h-4" /></button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Master Status Table */}
          {activeTab === 'status' && (
            <div>
              {!isAdmin && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">Hanya ADMIN:</span> Edit dan Delete Master Status hanya tersedia untuk user dengan role ADMIN untuk menjaga integritas sistem.
                  </p>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deskripsi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Group Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Indikator</th>
                      {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(masterStatuses?.data || []).map((status: any) => (
                      <tr key={status.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium">
                          <span
                            className="px-3 py-1 rounded-full text-xs font-bold"
                            style={status.color
                              ? { backgroundColor: status.color, color: readableTextColor(status.color) }
                              : { backgroundColor: '#e5e7eb', color: '#1f2937' }}
                          >
                            {status.code}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{status.description}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{status.groupStatus}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            {status.isPA && <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">PA</span>}
                            {status.isUA && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">UA</span>}
                            {status.isProductivity && <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">PROD</span>}
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-sm space-x-2 flex">
                            <button
                              onClick={() => {
                                setSelectedMasterStatus(status)
                                setIsEditMasterStatusOpen(true)
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Yakin ingin menghapus status ini? Pastikan status ini tidak sedang digunakan.')) {
                                  deleteMasterStatus.mutate(status.code)
                                }
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Role & Permission Table */}
          {activeTab === 'roles' && (
            <div>
              {!isAdmin && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">Hanya ADMIN:</span> Konfigurasi Role dan Permission hanya dapat diubah oleh user dengan role ADMIN.
                  </p>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-200">Role</th>
                      {permissionList.map((permission) => (
                        <th
                          key={permission}
                          className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase border-r border-gray-200 min-w-max"
                        >
                          {permission}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {roles.map((role) => (
                      <tr key={role.name} className="hover:bg-gray-50">
                        <td className="px-6 py-4 border-r border-gray-200 min-w-max">
                          <div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${role.color}`}>
                              {role.name}
                            </span>
                            <p className="text-xs text-gray-500 mt-2">{role.description}</p>
                          </div>
                        </td>
                        {permissionList.map((permission) => (
                          <td
                            key={permission}
                            className="px-3 py-4 text-center border-r border-gray-200"
                          >
                            {role.permissions[permission as keyof typeof role.permissions] ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
                                <span className="text-green-600 font-bold">✓</span>
                              </span>
                            ) : (
                              <span className="text-gray-300 font-bold">-</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Note:</span> Tabel ini menampilkan matrix permission untuk setiap role. 
                  Semua role dapat melihat semua data (View Everything), namun hanya role tertentu yang dapat melakukan perubahan pada data.
                </p>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddVehicleModal isOpen={isAddVehicleOpen} onClose={() => setIsAddVehicleOpen(false)} onSuccess={() => {
        setIsAddVehicleOpen(false)
        queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      }} />
      <EditVehicleModal isOpen={isEditVehicleOpen} onClose={() => setIsEditVehicleOpen(false)} onSuccess={() => {
        setIsEditVehicleOpen(false)
        queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      }} vehicle={selectedVehicle} />

      <AddDriverModal isOpen={isAddDriverOpen} onClose={() => setIsAddDriverOpen(false)} onSuccess={() => {
        setIsAddDriverOpen(false)
        queryClient.invalidateQueries({ queryKey: ['drivers'] })
      }} branches={branches?.data} />
      <EditDriverModal isOpen={isEditDriverOpen} onClose={() => setIsEditDriverOpen(false)} onSuccess={() => {
        setIsEditDriverOpen(false)
        queryClient.invalidateQueries({ queryKey: ['drivers'] })
      }} driver={selectedDriver} branches={branches?.data} />

      <AddCustomerModal isOpen={isAddCustomerOpen} onClose={() => setIsAddCustomerOpen(false)} onSuccess={() => {
        setIsAddCustomerOpen(false)
        queryClient.invalidateQueries({ queryKey: ['customers'] })
      }} branches={branches?.data} />
      <EditCustomerModal isOpen={isEditCustomerOpen} onClose={() => setIsEditCustomerOpen(false)} onSuccess={() => {
        setIsEditCustomerOpen(false)
        queryClient.invalidateQueries({ queryKey: ['customers'] })
      }} customer={selectedCustomer} branches={branches?.data} />

      {isAdmin && (
        <>
          <AddMasterStatusModal isOpen={isAddMasterStatusOpen} onClose={() => setIsAddMasterStatusOpen(false)} onSuccess={() => {
            setIsAddMasterStatusOpen(false)
            queryClient.invalidateQueries({ queryKey: ['masterStatuses'] })
          }} />
          <EditMasterStatusModal isOpen={isEditMasterStatusOpen} onClose={() => setIsEditMasterStatusOpen(false)} onSuccess={() => {
            setIsEditMasterStatusOpen(false)
            queryClient.invalidateQueries({ queryKey: ['masterStatuses'] })
          }} status={selectedMasterStatus} />
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, color, delay = '' }: any) {
  return (
    <div className={`bg-white p-5 rounded-2xl border border-slate-100 shadow-sm animate-fade-up ${delay}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function VehicleCard({ vehicle, index, onEdit, onDelete, isAdmin }: any) {
  return (
    <div 
      className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden animate-fade-up"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Accent Bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
        vehicle.isActive ? 'bg-emerald-500' : 'bg-rose-500'
      }`} />

      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">{vehicle.nopol}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
              vehicle.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              {vehicle.isActive ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
          {isAdmin && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button onClick={onEdit} className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors shadow-sm">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={onDelete} className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors shadow-sm">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-y-3 gap-x-4 border-t border-slate-50 pt-4">
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              <Package className="w-3 h-3" /> Tipe
            </p>
            <p className="text-sm font-semibold text-slate-700">{vehicle.vehicleType}</p>
          </div>
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              <Weight className="w-3 h-3" /> Tonase
            </p>
            <p className="text-sm font-semibold text-slate-700">{vehicle.tonase || '-'} Ton</p>
          </div>
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              <User className="w-3 h-3" /> Driver
            </p>
            <p className="text-sm font-semibold text-slate-700 truncate">{vehicle.driver?.name || 'Belum ada'}</p>
          </div>
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              <Truck className="w-3 h-3" /> Cabang
            </p>
            <p className="text-sm font-semibold text-slate-700 truncate">{vehicle.cabang || '-'}</p>
          </div>
        </div>
      </div>

      {/* Detail Footer */}
      <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center group-hover:bg-slate-50 transition-colors">
        <span className="text-[10px] font-medium text-slate-400">ID: {vehicle.id.slice(0, 8)}...</span>
        <button className="text-[10px] font-bold text-blue-600 hover:underline">Pelanggan: {vehicle.customer?.name || '-'}</button>
      </div>
    </div>
  )
}
