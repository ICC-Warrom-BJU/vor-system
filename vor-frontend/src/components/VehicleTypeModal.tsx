import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useEscToClose } from '../hooks/useModalDismiss'

interface VehicleTypeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editItem?: { id: string; name: string; description?: string | null } | null
}

export default function VehicleTypeModal({ isOpen, onClose, onSuccess, editItem }: VehicleTypeModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEscToClose(isOpen, onClose)

  useEffect(() => {
    if (isOpen) {
      setName(editItem?.name || '')
      setDescription(editItem?.description || '')
      setError('')
    }
  }, [isOpen, editItem])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('Nama tipe harus diisi')
      return
    }
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(editItem?.id ? `/api/vehicle-types/${editItem.id}` : '/api/vehicle-types', {
        method: editItem?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        onSuccess()
        onClose()
      } else {
        const detail = data.error?.map((x: any) => x.message).join(', ')
        setError(detail || data.message || 'Gagal menyimpan tipe unit')
      }
    } catch {
      setError('Terjadi kesalahan jaringan')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-modal-fade motion-reduce:animate-none">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto animate-modal-pop motion-reduce:animate-none">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">{editItem?.id ? 'Edit Type Unit' : 'Tambah Type Unit'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nama Tipe *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Contoh: Tronton, Fuso, Colt Diesel"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Deskripsi singkat tipe unit"
              rows={3}
            />
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Batal
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg hover:from-emerald-600 hover:to-cyan-600 transition-colors disabled:opacity-50">
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
