import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: string
  cabang: string | null
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string, roleFilter?: { allow?: string; deny?: string }) => Promise<void>
  logout: () => void
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

  const login = async (email: string, password: string, roleFilter?: { allow?: string; deny?: string }) => {
    const baseUrl = import.meta.env.VITE_API_URL || ''
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    
    const data = await response.json()
    
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

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, isAuthLoaded }}>
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
