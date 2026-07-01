import express from 'express'
import { asyncHandler } from '../middleware/error'
import { authMiddleware } from '../middleware/auth'
import * as exportController from '../controllers/export'

const router = express.Router()

router.use(authMiddleware)

// Export revenue report
router.get('/revenue', asyncHandler(exportController.exportRevenueReport))

// Export KPI report
router.get('/kpi', asyncHandler(exportController.exportKPIReport))

// Export vehicle performance
router.get('/vehicle-performance', asyncHandler(exportController.exportVehiclePerformanceReport))

// Export unit performance
router.get('/unit-performance', asyncHandler(exportController.exportUnitPerformanceReport))

// Export breakdown detail
router.get('/breakdown-detail', asyncHandler(exportController.exportBreakdownDetailReport))

// Export forecast accuracy
router.get('/forecast-accuracy', asyncHandler(exportController.exportForecastAccuracyReport))

export default router
