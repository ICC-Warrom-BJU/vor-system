import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AuthProvider } from './contexts/AuthContext'
import RequireAuth from './components/RequireAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MasterData from './pages/MasterData'
import ActualStatus from './pages/ActualStatus'
import ForecastStatus from './pages/ForecastStatus'
import ActualVsForecast from './pages/ActualVsForecast'
import Revenue from './pages/Revenue'
import GpsTracking from './pages/GpsTracking'
import LiveTracking from './pages/LiveTracking'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Account from './pages/Account'
import AuditLog from './pages/AuditLog'
import Layout from './components/Layout'

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule])

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<RequireAuth />}>
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="master-data" element={<MasterData />} />
                <Route path="actual-status" element={<ActualStatus />} />
                <Route path="forecast-status" element={<ForecastStatus />} />
                <Route path="actual-vs-forecast" element={<ActualVsForecast />} />
                <Route path="revenue" element={<Revenue />} />
                <Route path="gps-tracking" element={<GpsTracking />} />
                <Route path="live-tracking" element={<LiveTracking />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
                <Route path="account" element={<Account />} />
                <Route path="audit-log" element={<AuditLog />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
