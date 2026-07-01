import express from 'express'
import { asyncHandler } from '../middleware/error'
import { authMiddleware } from '../middleware/auth'
import * as masterStatusController from '../controllers/master-status'

const router = express.Router()

router.use(authMiddleware)

router.get('/', asyncHandler(masterStatusController.getAllMasterStatus))
router.post('/', asyncHandler(masterStatusController.createMasterStatus))
router.get('/code/:code', asyncHandler(masterStatusController.getMasterStatusByCode))
router.get('/group', asyncHandler(masterStatusController.getMasterStatusByGroup))
router.put('/code/:code', asyncHandler(masterStatusController.updateMasterStatus))
router.delete('/code/:code', asyncHandler(masterStatusController.deleteMasterStatus))

export default router
