import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { errorHandler, asyncHandler } from './middleware/error'
import { authMiddleware } from './middleware/auth'
import { login, register } from './controllers/auth'

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
import { startGpsScheduler, logGpsStatus } from './jobs/gps-scheduler'

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',').map(s => s.trim()) || '*',
}))

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server running', timestamp: new Date() })
})

// Auth routes (public)
app.post('/api/auth/login', asyncHandler(login))
app.post('/api/auth/register', asyncHandler(register))

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
