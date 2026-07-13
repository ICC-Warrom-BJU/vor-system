import express from 'express'
import { asyncHandler } from '../middleware/error'
import { authMiddleware, roleGuard } from '../middleware/auth'
import * as gpsController from '../controllers/gps'
import { syncMonthlyGpsData, writeGpsSyncLog } from '../services/gps-integration'
import { AuthRequest } from '../utils/types'

const router = express.Router()

router.use(authMiddleware)

// Get operations
router.get('/date', asyncHandler(gpsController.getGpsTrackingByDate))
router.get('/sync/history', roleGuard(['ADMIN']), asyncHandler(gpsController.getGpsSyncLogs))
router.get('/live/:vehicleId', asyncHandler(gpsController.getLivePosition))
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
  const { tahun, bulan, lstNoPOL, nopol } = req.body
  const year = tahun || new Date().getFullYear()
  const month = bulan || new Date().getMonth() + 1

  // Sync terarah: kirim lstNoPOL (array) atau nopol (string tunggal) untuk 1+ unit.
  // Kosong = semua unit (perilaku lama; saat ini bulk crash di sisi EasyGo).
  const noPolList = Array.isArray(lstNoPOL)
    ? lstNoPOL
    : (typeof nopol === 'string' && nopol.trim() ? [nopol.trim()] : [])
  const scope = noPolList.length ? noPolList.join(', ') : 'ALL'
  const triggeredBy = (req as AuthRequest).user?.id ?? null

  try {
    const result = await syncMonthlyGpsData(year, month, noPolList)
    await writeGpsSyncLog({ triggeredBy, scope, year, month, result })
    res.json({ success: true, data: result })
  } catch (err) {
    await writeGpsSyncLog({ triggeredBy, scope, year, month, result: null, hardError: (err as Error).message })
    throw err
  }
}))

export default router
