import { useState } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user } = useAuth()
  const location = useLocation()

  // ADMIN wajib 2FA: bila belum aktif, paksa ke halaman Akun untuk mengaktifkan.
  const mustEnable2FA = user?.role === 'ADMIN' && !user?.twoFactorEnabled
  if (mustEnable2FA && location.pathname !== '/account') {
    return <Navigate to="/account" replace />
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((prev) => !prev)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
