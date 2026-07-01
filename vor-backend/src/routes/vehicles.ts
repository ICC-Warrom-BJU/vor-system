import express from 'express'
import { asyncHandler } from '../middleware/error'
import { authMiddleware, roleGuard } from '../middleware/auth'
import * as vehicleController from '../controllers/vehicles'

const router = express.Router()

// All routes require authentication
router.use(authMiddleware)

// GET all vehicles
router.get('/', asyncHandler(vehicleController.getAllVehicles))

// GET vehicle by id
router.get('/:id', asyncHandler(vehicleController.getVehicleById))

// CREATE vehicle (Admin only)
router.post('/', roleGuard(['ADMIN']), asyncHandler(vehicleController.createVehicle))

// UPDATE vehicle (Admin only)
router.put('/:id', roleGuard(['ADMIN']), asyncHandler(vehicleController.updateVehicle))

// DELETE vehicle (Admin only)
router.delete('/:id', roleGuard(['ADMIN']), asyncHandler(vehicleController.deleteVehicle))

export default router
