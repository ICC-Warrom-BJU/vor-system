import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Car, RefreshCw, MapPin, Clock, ExternalLink, AlertCircle } from 'lucide-react'

interface LivePosition {
  vehicleId: string
  nopol: string
  vhcId: string
  latitude: number
  longitude: number
  lastUpdate: string
}

function relativeFromNow(lastUpdate: string): { text: string; stale: boolean } {
  // Format EasyGo: "2026-07-12 14:23:23" (tanpa timezone) — diperlakukan sebagai waktu lokal.
  const t = new Date(lastUpdate.replace(' ', 'T')).getTime()
  if (isNaN(t)) return { text: lastUpdate, stale: false }
  const diffMin = Math.round((Date.now() - t) / 60000)
  const stale = diffMin > 30
  if (diffMin < 1) return { text: 'baru saja', stale: false }
  if (diffMin < 60) return { text: `${diffMin} menit lalu`, stale }
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return { text: `${diffH} jam lalu`, stale: true }
  return { text: `${Math.floor(diffH / 24)} hari lalu`, stale: true }
}

export default function LiveTracking() {
  const [vehicleId, setVehicleId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [position, setPosition] = useState<LivePosition | null>(null)

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/vehicles', { headers: { Authorization: `Bearer ${token}` } })
      return response.json()
    },
  })

  // Hanya unit yang punya VHCID yang bisa dilacak
  const trackableVehicles = (vehicles?.data || []).filter((v: any) => v.vhcId)

  const handleCheck = async () => {
    if (!vehicleId) { setError('Pilih unit terlebih dahulu'); return }
    setError('')
    setLoading(true)
    setPosition(null)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/gps/live/${vehicleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setPosition(data.data)
      } else {
        setError(data.message || 'Gagal mengambil posisi terakhir')
      }
    } catch {
      setError('Terjadi kesalahan jaringan saat mengambil posisi')
    } finally {
      setLoading(false)
    }
  }

  const fresh = position ? relativeFromNow(position.lastUpdate) : null
  const bbox = position
    ? `${position.longitude - 0.02},${position.latitude - 0.02},${position.longitude + 0.02},${position.latitude + 0.02}`
    : ''
  const mapSrc = position
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${position.latitude},${position.longitude}`
    : ''

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-50 rounded-xl">
          <Car className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Live Tracking</h1>
          <p className="text-sm text-gray-500">Cek posisi terakhir unit dari EasyGo GPS</p>
        </div>
      </div>

      {/* Panel pemilih unit */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="">Pilih unit…</option>
              {trackableVehicles.map((v: any) => (
                <option key={v.id} value={v.id}>{v.nopol} — {v.vehicleType} ({v.vhcId})</option>
              ))}
            </select>
            {vehicles?.data && trackableVehicles.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Belum ada unit dengan VHCID. Isi VHCID di Master Data → Armada terlebih dahulu.
              </p>
            )}
          </div>
          <button
            onClick={handleCheck}
            disabled={loading || !vehicleId}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-5 py-2 rounded-lg hover:from-emerald-400 hover:to-cyan-400 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Mengambil…' : 'Cek Lokasi'}
          </button>
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Hasil posisi */}
      {position && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <iframe
              title="Peta Lokasi"
              src={mapSrc}
              className="w-full h-[420px] border-0"
              loading="lazy"
            />
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Unit</p>
              <p className="text-xl font-bold text-gray-800">{position.nopol}</p>
              <p className="text-xs text-gray-400 font-mono mt-0.5">VHCID: {position.vhcId}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Koordinat</p>
                  <p className="text-sm font-mono text-gray-800">{position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Update Terakhir</p>
                  <p className="text-sm text-gray-800">{position.lastUpdate}</p>
                  {fresh && (
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      fresh.stale ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {fresh.text}{fresh.stale ? ' • data mungkin usang' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <a
              href={`https://www.google.com/maps?q=${position.latitude},${position.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Buka di Google Maps
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
