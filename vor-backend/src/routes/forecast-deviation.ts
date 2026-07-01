import express from 'express'
import { asyncHandler } from '../middleware/error'
import { authMiddleware, roleGuard } from '../middleware/auth'
import * as forecastDeviationController from '../controllers/forecast-deviation'

const router = express.Router()

router.use(authMiddleware)

// Get operations
router.get('/accuracy-report', asyncHandler(forecastDeviationController.getAccuracyReport))
router.get('/vehicle/:vehicleId', asyncHandler(forecastDeviationController.getForecastDeviationByVehicleAndDate))
router.get('/:id', asyncHandler(forecastDeviationController.getForecastDeviationById))

// Record deviation - SUPERVISOR/ADMIN
router.post('/', roleGuard(['SUPERVISOR', 'ADMIN']), asyncHandler(forecastDeviationController.recordForecastDeviation))

export default router
