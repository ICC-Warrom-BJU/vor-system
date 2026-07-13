import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: string
  cabang: string | null
  avatarSeed?: string | null
  twoFactorEnabled?: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string, roleFilter?: { allow?: string; deny?: string }, code?: string) => Promise<void>
  logout: () => void
  updateUser: (partial: Partial<User>) => void
  isAuthenticated: boolean
  isAuthLoaded: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isAuthLoaded, setIsAuthLoaded] = useState(false)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }

    setIsAuthLoaded(true)
  }, [])

  // F-04: penanganan sesi kadaluarsa terpusat.
  // Semua modul memakai fetch(); di sini kita bungkus window.fetch sekali agar
  // respons 401 dari API (token kadaluarsa/dicabut) otomatis memaksa logout.
  // Setelah token dikosongkan, RequireAuth akan redirect ke /login.
  useEffect(() => {
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const response = await originalFetch(...args)
      try {
        const input = args[0]
        const url =
          typeof input === 'string'
            ? input
            : input instanceof Request
              ? input.url
              : String(input)
        const isApi = url.includes('/api/')
        const isLoginCall = url.includes('/api/auth/login')
        if (response.status === 401 && isApi && !isLoginCall && localStorage.getItem('token')) {
          sessionStorage.setItem('sessionExpired', '1')
          setUser(null)
          setToken(null)
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
      } catch {
        // Jangan ganggu alur fetch normal bila parsing URL gagal.
      }
      return response
    }
    return () => {
      window.fetch = originalFetch
    }
  }, [])

  const login = async (email: string, password: string, roleFilter?: { allow?: string; deny?: string }, code?: string) => {
    let response: Response
    try {
      response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...(code ? { code } : {}) }),
      })
    } catch {
      throw new Error('Tidak dapat terhubung ke server. Pastikan server backend berjalan.')
    }

    const raw = await response.text()
    if (!raw) {
      throw new Error(
        `Server tidak memberikan respons (status ${response.status}). Pastikan server backend berjalan.`,
      )
    }

    let data
    try {
      data = JSON.parse(raw)
    } catch {
      throw new Error('Respons server tidak valid. Pastikan alamat API sudah benar.')
    }

    // Password benar tapi butuh kode 2FA → beri sinyal ke halaman login.
    if (data.twoFactorRequired) {
      const err = new Error(data.message || 'Masukkan kode autentikasi 2FA') as Error & { twoFactorRequired?: boolean }
      err.twoFactorRequired = true
      throw err
    }

    if (data.success) {
      const userRole = data.data.user.role

      if (roleFilter?.allow && userRole.toLowerCase() !== roleFilter.allow.toLowerCase()) {
        throw new Error(`Hanya akun dengan role ${roleFilter.allow} yang bisa login di sini`)
      }

      if (roleFilter?.deny && userRole.toLowerCase() === roleFilter.deny.toLowerCase()) {
        throw new Error(`Akun role ${roleFilter.deny} tidak bisa login di sini`)
      }

      setToken(data.data.token)
      setUser(data.data.user)
      localStorage.setItem('token', data.data.token)
      localStorage.setItem('user', JSON.stringify(data.data.user))
    } else {
      throw new Error(data.message || 'Login gagal')
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const updateUser = (partial: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...partial }
      localStorage.setItem('user', JSON.stringify(next))
      return next
    })
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isAuthenticated: !!token, isAuthLoaded }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
