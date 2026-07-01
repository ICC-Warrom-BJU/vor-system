import express from 'express'
import { asyncHandler } from '../middleware/error'
import { authMiddleware, roleGuard } from '../middleware/auth'
import * as revenueController from '../controllers/revenue'

const router = express.Router()

router.use(authMiddleware)

// Get operations
router.get('/date', asyncHandler(revenueController.getRevenueDataByDate))
router.get('/summary', asyncHandler(revenueController.getRevenueSummary))
router.get('/vehicle/:vehicleId', asyncHandler(revenueController.getRevenueDataByVehicleAndDate))
router.get('/:id', asyncHandler(revenueController.getRevenueDataById))

// Write operations - PLANNER/ADMIN
router.post('/', roleGuard(['PLANNER', 'ADMIN']), asyncHandler(revenueController.createRevenueData))
router.put('/:id', roleGuard(['ADMIN']), asyncHandler(revenueController.updateRevenueData))
router.delete('/:id', roleGuard(['ADMIN']), asyncHandler(revenueController.deleteRevenueData))

// Bulk update
router.post('/bulk/update', roleGuard(['PLANNER', 'ADMIN']), asyncHandler(revenueController.bulkUpdateRevenueData))

export default router
