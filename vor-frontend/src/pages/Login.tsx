import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import vorLogo from '@/assets/logo.png'

type LoginTab = 'karyawan' | 'admin'

const tabData: Record<LoginTab, { label: string; emailPlaceholder: string; emailHint: string }> = {
  karyawan: {
    label: 'Karyawan',
    emailPlaceholder: 'karyawan@perusahaan.com',
    emailHint: 'Email perusahaan anda',
  },
  admin: {
    label: 'Admin',
    emailPlaceholder: 'admin@vor.com',
    emailHint: 'Email admin VOR',
  },
}

export default function Login() {
  const [tab, setTab] = useState<LoginTab>('karyawan')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const navigate = useNavigate()
  const { login } = useAuth()

  // F-04: bila diarahkan ke sini karena sesi kadaluarsa, tampilkan info sekali.
  useEffect(() => {
    if (sessionStorage.getItem('sessionExpired')) {
      setNotice('Sesi Anda telah berakhir. Silakan login kembali.')
      sessionStorage.removeItem('sessionExpired')
    }
  }, [])

  const current = tabData[tab]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const roleFilter = tab === 'admin' ? { allow: 'Admin' } : { deny: 'Admin' }
      setNotice('')
      await login(email, password, roleFilter)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat login')
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center p-4 overflow-hidden">

      {/* Animated Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-cyan-400/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/3 left-1/4 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }} />
      </div>

      {/* Glass Card */}
      <div className="relative w-full max-w-md animate-fade-up">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          <div className="flex flex-col items-center mb-6">
            <div className="mb-4 flex items-center justify-center">
              <img src={vorLogo} alt="VOR" className="h-16 w-auto" />
            </div>
            <p className="text-white/60 text-sm">Vehicle Operational Report (VOR)</p>
          </div>

          {/* Tab Switcher */}
          <div className="relative flex bg-white/10 rounded-xl p-1 mb-8">
            <div
              className="absolute top-1 bottom-1 w-1/2 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg transition-transform duration-300 ease-in-out"
              style={{ transform: `translateX(${tab === 'admin' ? '100%' : '0%'})` }}
            />
            {(['karyawan', 'admin'] as LoginTab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError('') }}
                className={`relative z-10 flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  tab === t ? 'text-white' : 'text-white/60 hover:text-white/80'
                }`}
              >
                {tabData[t].label}
              </button>
            ))}
          </div>

          {notice && !error && (
            <div className="bg-amber-500/20 backdrop-blur-sm border border-amber-400/30 text-amber-200 px-4 py-3 rounded-xl mb-6 text-sm">
              {notice}
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-red-300 px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          <form key={tab} onSubmit={handleSubmit} className="space-y-5 animate-fade-up">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none transition-all backdrop-blur-sm"
                placeholder={current.emailPlaceholder}
                required
              />
              <p className="text-white/40 text-xs mt-1">{current.emailHint}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none transition-all backdrop-blur-sm"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:from-emerald-400 hover:to-cyan-400 transition-all shadow-lg shadow-emerald-500/25 active:scale-[0.98]"
            >
              Login
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-white/40">
            <p>VOR by BJU System Development Team</p>
            <p>Version 1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  )
}
