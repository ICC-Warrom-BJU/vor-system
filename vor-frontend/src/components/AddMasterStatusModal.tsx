import { useState } from 'react'
import { useEscToClose } from '../hooks/useModalDismiss'
import { X } from 'lucide-react'

const defaultStatusColor = '#808080'

interface AddMasterStatusModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddMasterStatusModal({ isOpen, onClose, onSuccess }: AddMasterStatusModalProps) {
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    groupStatus: '',
    color: defaultStatusColor,
    isPA: false,
    isUA: false,
    isProductivity: false,
    canCopyNextDay: true,
    forecastAllowed: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.code.trim()) {
      setError('Code harus diisi')
      return
    }
    if (!formData.description.trim()) {
      setError('Deskripsi harus diisi')
      return
    }
    if (!formData.groupStatus.trim()) {
      setError('Group Status harus diisi')
      return
    }

    // Code validation - uppercase only, no spaces
    if (!/^[A-Z0-9]+$/.test(formData.code)) {
      setError('Code hanya boleh huruf besar dan angka (tanpa spasi)')
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/master-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        onSuccess()
        onClose()
        setFormData({
          code: '',
          description: '',
          groupStatus: '',
          color: defaultStatusColor,
          isPA: false,
          isUA: false,
          isProductivity: false,
          canCopyNextDay: true,
          forecastAllowed: true,
        })
      } else {
        setError(data.message || 'Gagal membuat status')
      }
    } catch (err) {
      setError('Error membuat status')
    } finally {
      setLoading(false)
    }
  }

  useEscToClose(isOpen, onClose)

  if (!isOpen) return null

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-modal-fade motion-reduce:animate-none">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto animate-modal-pop motion-reduce:animate-none">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Tambah Jenis Status</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none uppercase"
              placeholder="Contoh: UTI, RFU, BD"
              maxLength={10}
            />
            <p className="text-xs text-gray-500 mt-1">Huruf besar dan angka saja, max 10 karakter</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi *</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Masukkan deskripsi status"
            />
          </div>

          {/* Group Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group Status *</label>
            <input
              type="text"
              value={formData.groupStatus}
              onChange={(e) => setFormData({ ...formData, groupStatus: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Contoh: UTILISASI, BREAKDOWN"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Warna</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                placeholder="#000000"
              />
            </div>
          </div>

          {/* Indicators */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Indikator</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isPA}
                  onChange={(e) => setFormData({ ...formData, isPA: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">PA (Productive Available)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isUA}
                  onChange={(e) => setFormData({ ...formData, isUA: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">UA (Utilized Available)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isProductivity}
                  onChange={(e) => setFormData({ ...formData, isProductivity: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">PROD (Productivity)</span>
              </label>
            </div>
          </div>

          {/* Flags */}
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.canCopyNextDay}
                onChange={(e) => setFormData({ ...formData, canCopyNextDay: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Dapat Copy ke Hari Berikutnya</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.forecastAllowed}
                onChange={(e) => setFormData({ ...formData, forecastAllowed: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Diizinkan untuk Forecast</span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Membuat...' : 'Buat Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
