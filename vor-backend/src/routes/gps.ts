import express from 'express'
import { asyncHandler } from '../middleware/error'
import { authMiddleware, roleGuard } from '../middleware/auth'
import * as gpsController from '../controllers/gps'
import { syncMonthlyGpsData } from '../services/gps-integration'

const router = express.Router()

router.use(authMiddleware)

// Get operations
router.get('/date', asyncHandler(gpsController.getGpsTrackingByDate))
router.get('/vehicle/:vehicleId', asyncHandler(gpsController.getGpsTrackingByVehicleAndDate))
router.get('/:id', asyncHandler(gpsController.getGpsTrackingById))

// Write operations
router.post('/', roleGuard(['PLANNER', 'ADMIN']), asyncHandler(gpsController.createGpsTracking))
router.put('/:id', roleGuard(['ADMIN']), asyncHandler(gpsController.updateGpsTracking))
router.delete('/:id', roleGuard(['ADMIN']), asyncHandler(gpsController.deleteGpsTracking))

// Bulk update
router.post('/bulk/update', roleGuard(['PLANNER', 'ADMIN']), asyncHandler(gpsController.bulkUpdateGpsTracking))

// Manual sync with EasyGo GPS API
router.post('/sync', roleGuard(['ADMIN']), asyncHandler(async (req, res) => {
  const { tahun, bulan } = req.body
  const year = tahun || new Date().getFullYear()
  const month = bulan || new Date().getMonth() + 1

  const result = await syncMonthlyGpsData(year, month)
  res.json({ success: true, data: result })
}))

export default router
