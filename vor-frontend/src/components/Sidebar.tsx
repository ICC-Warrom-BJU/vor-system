import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Database, BarChart3, DollarSign, Settings, LogOut, GitCompare, MapPin, ClipboardCheck, CalendarClock, Car, CircleUser, ScrollText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '../contexts/AuthContext'
import Avatar from './Avatar'
import vorLogo from '@/assets/logo.png'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ClipboardCheck, label: 'Status Aktual', path: '/actual-status' },
  { icon: CalendarClock, label: 'Status Forecast', path: '/forecast-status' },
  { icon: GitCompare, label: 'Actual vs Forecast', path: '/actual-vs-forecast' },
  { icon: DollarSign, label: 'Pendapatan', path: '/revenue' },
  { icon: MapPin, label: 'Analisa Jarak Tempuh', path: '/gps-tracking' },
  { icon: Car, label: 'Live Tracking', path: '/live-tracking' },
  { icon: BarChart3, label: 'Laporan', path: '/reports' },
  { icon: Database, label: 'Master Data', path: '/master-data' },
  { icon: Settings, label: 'Pengaturan', path: '/settings' },
  { icon: ScrollText, label: 'Audit Log', path: '/audit-log' },
  { icon: CircleUser, label: 'Akun Saya', path: '/account' },
]

// Menu yang hanya boleh dilihat ADMIN (server juga menegakkan 403)
const adminOnlyPaths = ['/settings', '/audit-log']

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const visibleMenuItems = menuItems.filter(
    (item) => !(adminOnlyPaths.includes(item.path) && user?.role !== 'ADMIN')
  )

  return (
    <div className={cn(
      'bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950 text-white flex flex-col transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      <button onClick={onToggle} className="p-4 border-b border-white/10 flex items-center justify-center h-[72px] w-full hover:bg-white/5 transition-all cursor-pointer">
        {collapsed ? (
          <span className="text-lg font-bold text-emerald-400">V</span>
        ) : (
          <img src={vorLogo} alt="VOR" className="h-14 w-auto" />
        )}
      </button>
      <nav className="flex-1 p-2 space-y-1">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center rounded-xl transition-all',
                collapsed
                  ? 'justify-center px-2 py-3'
                  : 'gap-3 px-4 py-3',
                isActive
                  ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-white border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>
      <div className="p-2 border-t border-white/10 space-y-1">
        <Link
          to="/account"
          title={collapsed ? (user?.name || 'Akun Saya') : undefined}
          className={cn(
            'flex items-center rounded-xl transition-all hover:bg-white/5',
            collapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2'
          )}
        >
          <Avatar seed={user?.avatarSeed || user?.email || 'user'} size={collapsed ? 32 : 36} />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user?.name || 'Pengguna'}</p>
              <p className="truncate text-xs text-white/50">{user?.role || ''}</p>
            </div>
          )}
        </Link>
        <button
          onClick={handleLogout}
          title="Logout"
          className={cn(
            'flex items-center rounded-xl transition-all text-white/60 hover:text-white hover:bg-white/5 w-full',
            collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  )
}
