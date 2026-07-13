import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { errorHandler, asyncHandler } from './middleware/error'
import { login } from './controllers/auth'

// Import routes
import vehicleRoutes from './routes/vehicles'
import vehicleTypeRoutes from './routes/vehicle-types'
import driverRoutes from './routes/drivers'
import customerRoutes from './routes/customers'
import masterStatusRoutes from './routes/master-status'
import actualStatusRoutes from './routes/actual-status'
import forecastStatusRoutes from './routes/forecast-status'
import kpiRoutes from './routes/kpi'
import revenueRoutes from './routes/revenue'
import forecastDeviationRoutes from './routes/forecast-deviation'
import userRoutes from './routes/users'
import branchRoutes from './routes/branches'
import dashboardRoutes from './routes/dashboard'
import reportingRoutes from './routes/reporting'
import exportRoutes from './routes/export'
import gpsRoutes from './routes/gps'
import auditRoutes from './routes/audit'
import notificationRoutes from './routes/notifications'
import { auditLogger } from './middleware/audit'
import { startGpsScheduler, logGpsStatus } from './jobs/gps-scheduler'

const app = express()
const PORT = process.env.PORT || 3000

// Railway berada di belakang reverse proxy — percayai 1 hop agar rate-limit
// & req.ip membaca IP klien asli dari X-Forwarded-For (bukan IP proxy).
app.set('trust proxy', 1)

// Middleware
app.use(helmet())
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// CORS: pakai daftar origin dari env. Tanpa CORS_ORIGIN, JANGAN default ke '*'
// (bahaya) — di produksi tolak cross-origin, di dev izinkan untuk kemudahan.
const corsOrigins = process.env.CORS_ORIGIN?.split(',').map(s => s.trim()).filter(Boolean)
app.use(cors({
  origin: corsOrigins && corsOrigins.length
    ? corsOrigins
    : process.env.NODE_ENV === 'production' ? false : true,
}))

// Rate limit khusus login: cegah brute-force password.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10,                  // maks 10 percobaan per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.' },
})

// Audit trail: catat semua mutasi (setelah body & sebelum route agar bisa membungkus res.json)
app.use(auditLogger)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server running', timestamp: new Date() })
})

// Auth routes (public). Register DIHAPUS dari endpoint publik (SEC-01):
// pembuatan user hanya lewat POST /api/users (khusus ADMIN, ber-auth).
app.post('/api/auth/login', loginLimiter, asyncHandler(login))

// Protected routes
app.use('/api/vehicles', vehicleRoutes)
app.use('/api/vehicle-types', vehicleTypeRoutes)
app.use('/api/drivers', driverRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/master-status', masterStatusRoutes)
app.use('/api/actual-status', actualStatusRoutes)
app.use('/api/forecast-status', forecastStatusRoutes)
app.use('/api/kpi', kpiRoutes)
app.use('/api/revenue', revenueRoutes)
app.use('/api/forecast-deviation', forecastDeviationRoutes)
app.use('/api/users', userRoutes)
app.use('/api/branches', branchRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/reports', reportingRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/gps', gpsRoutes)
app.use('/api/audit-logs', auditRoutes)
app.use('/api/notifications', notificationRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan',
  })
})

// Error handler
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  console.log(`🚀 VOR Backend Server running on http://localhost:${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)

  // Start GPS scheduler
  startGpsScheduler()
  if (process.env.NODE_ENV !== 'production') logGpsStatus()
})
