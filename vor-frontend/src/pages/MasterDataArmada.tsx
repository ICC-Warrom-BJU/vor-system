import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  LayoutGrid, List, Search, Plus, Truck, CheckCircle2, 
  XCircle, Weight, Edit2, Trash2, Package, User, MoreVertical 
} from 'lucide-react'

const masterDataStyles = `
  @keyframes fade-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-up {
    animation: fade-up 0.5s ease-out forwards;
  }
  .stagger-1 { animation-delay: 0.1s; }
  .stagger-2 { animation-delay: 0.2s; }
  .stagger-3 { animation-delay: 0.3s; }
`;

interface Vehicle {
  id: string;
  nopol: string;
  vehicleType: string;
  tonase: number;
  status: 'Aktif' | 'Nonaktif';
  customer?: { name: string };
  driver?: { name: string };
}

export default function MasterDataArmada() {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'aktif' | 'nonaktif'>('all')

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/vehicles', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      return result.data as Vehicle[]
    },
  })

  // Real-time filtering logic
  const filteredVehicles = useMemo(() => {
    if (!vehicles) return []
    return vehicles.filter(v => {
      const matchesSearch = v.nopol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          v.driver?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesTab = activeTab === 'all' || v.status.toLowerCase() === activeTab
      return matchesSearch && matchesTab
    })
  }, [vehicles, searchQuery, activeTab])

  // Stats Calculation
  const stats = useMemo(() => {
    const total = vehicles?.length || 0
    const aktif = vehicles?.filter(v => v.status === 'Aktif').length || 0
    const nonaktif = total - aktif
    const totalTonase = vehicles?.reduce((acc, v) => acc + (v.tonase || 0), 0) || 0
    return { total, aktif, nonaktif, totalTonase }
  }, [vehicles])

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <style>{masterDataStyles}</style>
      
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Master Data Armada</h1>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all shadow-sm active:scale-95">
          <Plus className="w-5 h-5" />
          <span className="font-semibold">Tambah Armada</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Armada" value={stats.total} icon={<Truck className="text-blue-600" />} color="bg-blue-50" delay="stagger-1" />
        <StatCard label="Aktif" value={stats.aktif} icon={<CheckCircle2 className="text-emerald-600" />} color="bg-emerald-50" delay="stagger-2" />
        <StatCard label="Nonaktif" value={stats.nonaktif} icon={<XCircle className="text-rose-600" />} color="bg-rose-50" delay="stagger-3" />
        <StatCard label="Total Kapasitas" value={`${stats.totalTonase} Ton`} icon={<Weight className="text-amber-600" />} color="bg-amber-50" />
      </div>

      {/* Toolbar & Tabs */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
            <TabButton label="Semua" count={stats.total} active={activeTab === 'all'} onClick={() => setActiveTab('all')} />
            <TabButton label="Aktif" count={stats.aktif} active={activeTab === 'aktif'} onClick={() => setActiveTab('aktif')} />
            <TabButton label="Nonaktif" count={stats.nonaktif} active={activeTab === 'nonaktif'} onClick={() => setActiveTab('nonaktif')} />
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Cari nopol atau driver..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-64 transition-all"
              />
            </div>
            <div className="h-8 w-px bg-slate-200 mx-1" />
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((vehicle, idx) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} index={idx} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Nopol</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Tipe</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Driver</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-700">{vehicle.nopol}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm">{vehicle.vehicleType}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      vehicle.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {vehicle.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-sm">{vehicle.driver?.name || '-'}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

function TabButton({ label, count, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
        active ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {label}
      <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${active ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
        {count}
      </span>
    </button>
  )
}

function VehicleCard({ vehicle, index }: { vehicle: Vehicle, index: number }) {
  return (
    <div 
      className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden animate-fade-up"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Accent Bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
        vehicle.status === 'Aktif' ? 'bg-emerald-500' : 'bg-slate-300'
      }`} />

      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">{vehicle.nopol}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
              vehicle.status === 'Aktif' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
            }`}>
              {vehicle.status}
            </span>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <button className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors shadow-sm">
              <Edit2 className="w-4 h-4" />
            </button>
            <button className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors shadow-sm">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
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
              <Truck className="w-3 h-3" /> Customer
            </p>
            <p className="text-sm font-semibold text-slate-700 truncate">{vehicle.customer?.name || '-'}</p>
          </div>
        </div>
      </div>

      {/* Detail Footer */}
      <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center group-hover:bg-slate-50 transition-colors">
        <span className="text-[10px] font-medium text-slate-400">ID: {vehicle.id.slice(0, 8)}...</span>
        <button className="text-[10px] font-bold text-blue-600 hover:underline">Lihat Log</button>
      </div>
    </div>
  )
}