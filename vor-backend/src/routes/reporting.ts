import express from 'express'
import { asyncHandler } from '../middleware/error'
import { authMiddleware } from '../middleware/auth'
import * as reportingController from '../controllers/reporting'

const router = express.Router()

router.use(authMiddleware)

// Vehicle performance report
router.get('/vehicle-performance', asyncHandler(reportingController.getVehiclePerformanceReport))

// Revenue analysis
router.get('/revenue-analysis', asyncHandler(reportingController.getRevenueAnalysis))

// KPI trend report
router.get('/kpi-trend', asyncHandler(reportingController.getKPITrendReport))

// Unit performance report
router.get('/unit-performance', asyncHandler(reportingController.getUnitPerformanceReport))

// Breakdown detail report
router.get('/breakdown-detail', asyncHandler(reportingController.getBreakdownDetailReport))

// Compliance report
router.get('/compliance', asyncHandler(reportingController.getComplianceReport))

// Utilization analysis
router.get('/utilization-analysis', asyncHandler(reportingController.getUtilizationAnalysis))

export default router
