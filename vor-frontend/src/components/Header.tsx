import { useState } from 'react'
import { Bell, AlertTriangle, Info, AlertCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

interface Notification {
  id: string
  type: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  message: string
  link: string
}

const severityStyle: Record<string, { dot: string; icon: JSX.Element }> = {
  critical: { dot: 'bg-red-500', icon: <AlertCircle className="w-4 h-4 text-red-500" /> },
  warning: { dot: 'bg-amber-500', icon: <AlertTriangle className="w-4 h-4 text-amber-500" /> },
  info: { dot: 'bg-blue-500', icon: <Info className="w-4 h-4 text-blue-500" /> },
}

export function Header() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
      return res.json()
    },
    refetchInterval: 60000,
  })

  const notifications: Notification[] = data?.data?.notifications || []
  const count = data?.data?.count || 0

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
        <p className="text-sm text-gray-500">Selamat datang kembali</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Notifikasi"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-100 z-50">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">Notifikasi</span>
                  <span className="text-xs text-gray-400">{count} baru</span>
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">Tidak ada notifikasi</div>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {notifications.map((n) => {
                      const s = severityStyle[n.severity] || severityStyle.info
                      return (
                        <li key={n.id}>
                          <button
                            onClick={() => { setOpen(false); navigate(n.link) }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3"
                          >
                            <span className="mt-0.5 shrink-0">{s.icon}</span>
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-gray-800">{n.title}</span>
                              {n.message && <span className="block text-xs text-gray-500 truncate">{n.message}</span>}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
