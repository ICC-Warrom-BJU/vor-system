import express from 'express'
import { asyncHandler } from '../middleware/error'
import { authMiddleware } from '../middleware/auth'
import { setup2FA, enable2FA, disable2FA } from '../controllers/twofa'

const router = express.Router()

router.post('/setup', authMiddleware, asyncHandler(setup2FA))
router.post('/enable', authMiddleware, asyncHandler(enable2FA))
router.post('/disable', authMiddleware, asyncHandler(disable2FA))

export default router
