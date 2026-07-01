import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'

interface AddVehicleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddVehicleModal({ isOpen, onClose, onSuccess }: AddVehicleModalProps) {
  const [formData, setFormData] = useState({
    nopol: '',
    vehicleType: '',
    tonase: '',
    kubikasi: '',
    nomorRangka: '',
    detailUnit: '',
    targetRevenue: '',
    nomorLambung: '',
    branchId: '',
    driverId: '',
    customerId: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { data: vehicleTypes } = useQuery({
    queryKey: ['vehicleTypes'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/vehicle-types', {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    enabled: isOpen,
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
    enabled: isOpen,
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
    enabled: isOpen,
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
    enabled: isOpen,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Validation
    if (!formData.nopol.trim()) {
      setError('Nopol harus diisi')
      return
    }
    if (!formData.vehicleType) {
      setError('Tipe kendaraan harus dipilih')
      return
    }
    if (!formData.branchId) {
      setError('Cabang harus dipilih')
      return
    }
    if (formData.tonase && (isNaN(parseFloat(formData.tonase)) || parseFloat(formData.tonase) <= 0)) {
      setError('Tonase harus berupa angka positif')
      return
    }
    if (formData.kubikasi && (isNaN(parseFloat(formData.kubikasi)) || parseFloat(formData.kubikasi) <= 0)) {
      setError('Kubikasi harus berupa angka positif')
      return
    }
    if (formData.targetRevenue && (isNaN(parseFloat(formData.targetRevenue)) || parseFloat(formData.targetRevenue) < 0)) {
      setError('Target revenue harus berupa angka positif')
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          tonase: formData.tonase ? parseFloat(formData.tonase) : null,
          kubikasi: formData.kubikasi ? parseFloat(formData.kubikasi) : null,
          nomorRangka: formData.nomorRangka || null,
          detailUnit: formData.detailUnit || null,
          targetRevenue: formData.targetRevenue ? parseFloat(formData.targetRevenue) : null,
          nomorLambung: formData.nomorLambung || null,
          customerId: formData.customerId || undefined,
          driverId: formData.driverId || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        onSuccess()
        onClose()
        setFormData({
          nopol: '',
          vehicleType: '',
          tonase: '',
          kubikasi: '',
          nomorRangka: '',
          detailUnit: '',
          targetRevenue: '',
          nomorLambung: '',
          branchId: '',
          driverId: '',
          customerId: '',
        })
      } else {
        const detail = data.error?.map((e: any) => e.message).join(', ')
        setError(detail || data.message || 'Gagal menambah kendaraan')
      }
    } catch (err) {
      setError('Terjadi kesalahan saat menambah kendaraan')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Tambah Kendaraan</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nopol *
            </label>
            <input
              type="text"
              value={formData.nopol}
              onChange={(e) => setFormData({ ...formData, nopol: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="B 1234 XYZ"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipe Kendaraan *
            </label>
            <select
              value={formData.vehicleType}
              onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            >
              <option value="">Pilih tipe</option>
              {(vehicleTypes?.data || []).map((type: any) => (
                <option key={type.id} value={type.name}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tonase
              </label>
              <input
                type="number"
                value={formData.tonase}
                onChange={(e) => setFormData({ ...formData, tonase: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="25"
                step="0.1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kubikasi
              </label>
              <input
                type="number"
                value={formData.kubikasi}
                onChange={(e) => setFormData({ ...formData, kubikasi: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="30"
                step="0.1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                No. Rangka
              </label>
              <input
                type="text"
                value={formData.nomorRangka}
                onChange={(e) => setFormData({ ...formData, nomorRangka: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Nomor rangka"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nomor Lambung
              </label>
              <input
                type="text"
                value={formData.nomorLambung}
                onChange={(e) => setFormData({ ...formData, nomorLambung: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Nomor lambung"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Detail Unit
            </label>
            <input
              type="text"
              value={formData.detailUnit}
              onChange={(e) => setFormData({ ...formData, detailUnit: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Contoh: Hino 500 box pendingin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Revenue
            </label>
            <input
              type="number"
              value={formData.targetRevenue}
              onChange={(e) => setFormData({ ...formData, targetRevenue: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Target revenue bulanan"
              step="1000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cabang *
            </label>
            <select
              value={formData.branchId}
              onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            >
              <option value="">Pilih cabang</option>
              {(branches?.data || []).map((branch: any) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pelanggan
              </label>
              <select
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Pilih pelanggan</option>
                {(customers?.data || []).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Driver
              </label>
              <select
                value={formData.driverId}
                onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Pilih driver</option>
                {(drivers?.data || []).map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
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
  )
}
