import express from 'express'
import { asyncHandler } from '../middleware/error'
import { authMiddleware } from '../middleware/auth'
import * as auditController from '../controllers/audit'

const router = express.Router()

router.use(authMiddleware)
router.get('/', asyncHandler(auditController.getAuditLogs))

export default router
