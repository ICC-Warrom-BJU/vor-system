import express from 'express'
import { asyncHandler } from '../middleware/error'
import { authMiddleware, roleGuard } from '../middleware/auth'
import * as driverController from '../controllers/drivers'

const router = express.Router()

router.use(authMiddleware)

router.get('/', asyncHandler(driverController.getAllDrivers))
router.get('/:id', asyncHandler(driverController.getDriverById))
router.post('/', roleGuard(['ADMIN']), asyncHandler(driverController.createDriver))
router.put('/:id', roleGuard(['ADMIN']), asyncHandler(driverController.updateDriver))
router.delete('/:id', roleGuard(['ADMIN']), asyncHandler(driverController.deleteDriver))

export default router
