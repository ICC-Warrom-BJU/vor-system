import express from 'express'
import { asyncHandler } from '../middleware/error'
import { authMiddleware, roleGuard } from '../middleware/auth'
import * as forecastStatusController from '../controllers/forecast-status'

const router = express.Router()

router.use(authMiddleware)

// Get operations
router.get('/date', asyncHandler(forecastStatusController.getForecastStatusByDate))
router.get('/vehicle/:vehicleId', asyncHandler(forecastStatusController.getForecastStatusByVehicleAndDateRange))
router.get('/:id', asyncHandler(forecastStatusController.getForecastStatusById))

// Write operations - PLANNER role
router.post('/', roleGuard(['PLANNER', 'ADMIN']), asyncHandler(forecastStatusController.createForecastStatus))
router.put('/:id', roleGuard(['PLANNER', 'ADMIN']), asyncHandler(forecastStatusController.updateForecastStatus))
router.delete('/:id', roleGuard(['ADMIN']), asyncHandler(forecastStatusController.deleteForecastStatus))

// Bulk update forecast
router.post('/bulk/update', roleGuard(['PLANNER', 'ADMIN']), asyncHandler(forecastStatusController.bulkUpdateForecastStatus))

export default router
