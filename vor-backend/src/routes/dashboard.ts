import express from 'express'
import { asyncHandler } from '../middleware/error'
import { authMiddleware } from '../middleware/auth'
import * as dashboardController from '../controllers/dashboard'

const router = express.Router()

router.use(authMiddleware)

// Fleet overview
router.get('/fleet-overview', asyncHandler(dashboardController.getFleetOverview))

// Revenue dashboard
router.get('/revenue', asyncHandler(dashboardController.getRevenueDashboard))

// KPI dashboard
router.get('/kpi', asyncHandler(dashboardController.getKPIDashboard))

// Forecast accuracy dashboard
router.get('/forecast-accuracy', asyncHandler(dashboardController.getForecastAccuracyDashboard))

// Operational metrics
router.get('/operational-metrics', asyncHandler(dashboardController.getOperationalMetrics))

// Performance per branch
router.get('/performance-by-branch', asyncHandler(dashboardController.getPerformanceByBranch))

// GPS tracking dashboard
router.get('/gps', asyncHandler(dashboardController.getGpsDashboardData))

export default router
