import express from 'express'
import { asyncHandler } from '../middleware/error'
import { authMiddleware, roleGuard } from '../middleware/auth'
import * as kpiController from '../controllers/kpi'

const router = express.Router()

router.use(authMiddleware)

// Get KPI (read-only, any authenticated user)
router.get('/daily', asyncHandler(kpiController.getDailyKPI))
router.get('/weekly', asyncHandler(kpiController.getWeeklyKPI))
router.get('/monthly', asyncHandler(kpiController.getMonthlyKPI))

// Calculate and save KPI (SUPERVISOR+ role)
router.post('/daily/calculate', roleGuard(['SUPERVISOR', 'ADMIN']), asyncHandler(kpiController.calculateAndSaveDailyKPI))
router.post('/weekly/calculate', roleGuard(['SUPERVISOR', 'ADMIN']), asyncHandler(kpiController.calculateAndSaveWeeklyKPI))
router.post('/monthly/calculate', roleGuard(['SUPERVISOR', 'ADMIN']), asyncHandler(kpiController.calculateAndSaveMonthlyKPI))

export default router
