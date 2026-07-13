import { useState, useEffect } from 'react'
import { useEscToClose } from '../hooks/useModalDismiss'
import { X } from 'lucide-react'

interface AddCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  branches?: any[]
}

export default function AddCustomerModal({ isOpen, onClose, onSuccess, branches }: AddCustomerModalProps) {
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', pic: '', address: '', branchId: '', isActive: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setFormData({ name: '', phone: '', email: '', pic: '', address: '', branchId: '', isActive: true })
    setError('')
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!formData.name.trim()) { setError('Nama customer harus diisi'); return }
    if (formData.name.trim().length < 3) { setError('Nama customer minimal 3 karakter'); return }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const body: Record<string, any> = {}
      for (const [key, val] of Object.entries(formData)) {
        if (val !== '' && val !== undefined && val !== null) body[key] = val
      }

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (data.success) { onSuccess(); onClose() }
      else { setError(data.message || 'Gagal menambah customer') }
    } catch { setError('Terjadi kesalahan saat menambah customer') }
    finally { setLoading(false) }
  }

  useEscToClose(isOpen, onClose)

  if (!isOpen) return null

  const inputClass = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-modal-fade motion-reduce:animate-none">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto animate-modal-pop motion-reduce:animate-none">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Tambah Customer</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (<div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>)}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nama Customer *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClass} placeholder="PT Indofood Sukses Makmur" required />
            </div>
            <div>
              <label className={labelClass}>Nomor Telepon</label>
              <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={inputClass} placeholder="021-12345678" />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inputClass} placeholder="contact@company.com" />
            </div>
            <div>
              <label className={labelClass}>PIC</label>
              <input type="text" value={formData.pic} onChange={(e) => setFormData({ ...formData, pic: e.target.value })} className={inputClass} placeholder="Nama contact person" />
            </div>
            <div>
              <label className={labelClass}>Cabang</label>
              <select value={formData.branchId} onChange={(e) => setFormData({ ...formData, branchId: e.target.value })} className={inputClass}>
                <option value="">Pilih Cabang</option>
                {(branches || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input type="checkbox" id="customer-active" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-4 h-4 text-emerald-500 border-gray-300 rounded focus:ring-emerald-500" />
              <label htmlFor="customer-active" className="text-sm font-medium text-gray-700">Aktif</label>
            </div>
          </div>
          <div>
            <label className={labelClass}>Alamat</label>
            <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className={inputClass} placeholder="Jl. Raya No. 123, Jakarta" rows={2} />
          </div>
          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">Batal</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg hover:from-emerald-600 hover:to-cyan-600 transition-colors disabled:opacity-50 text-sm">
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
