import express from 'express'
import { asyncHandler } from '../middleware/error'
import { authMiddleware, roleGuard } from '../middleware/auth'
import * as vehicleTypeController from '../controllers/vehicle-types'

const router = express.Router()

router.use(authMiddleware)

router.get('/', asyncHandler(vehicleTypeController.getAllVehicleTypes))
router.post('/', roleGuard(['ADMIN']), asyncHandler(vehicleTypeController.createVehicleType))
router.put('/:id', roleGuard(['ADMIN']), asyncHandler(vehicleTypeController.updateVehicleType))
router.delete('/:id', roleGuard(['ADMIN']), asyncHandler(vehicleTypeController.deleteVehicleType))

export default router
