import express from 'express'
import { asyncHandler } from '../middleware/error'
import { authMiddleware, roleGuard } from '../middleware/auth'
import * as actualStatusController from '../controllers/actual-status'

const router = express.Router()

router.use(authMiddleware)

// Get operations
router.get('/date', asyncHandler(actualStatusController.getActualStatusByDate))
router.get('/vehicle/:vehicleId', asyncHandler(actualStatusController.getActualStatusByVehicleAndDate))
router.get('/:id', asyncHandler(actualStatusController.getActualStatusById))

// Write operations - PLANNER role
router.post('/', roleGuard(['PLANNER', 'ADMIN']), asyncHandler(actualStatusController.createActualStatus))
router.put('/:id', roleGuard(['PLANNER', 'ADMIN']), asyncHandler(actualStatusController.updateActualStatus))
router.delete('/:id', roleGuard(['ADMIN']), asyncHandler(actualStatusController.deleteActualStatus))

// Bulk update for grid
router.post('/bulk/update', roleGuard(['PLANNER', 'ADMIN']), asyncHandler(actualStatusController.bulkUpdateActualStatus))

export default router
