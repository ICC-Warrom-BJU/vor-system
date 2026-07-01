import { Bell, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function Header() {
  const { user } = useAuth()

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
        <p className="text-sm text-gray-500">Selamat datang kembali</p>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">{user?.name || 'Admin VOR'}</p>
            <p className="text-xs text-gray-500">{user?.email || 'admin@vor.com'}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
