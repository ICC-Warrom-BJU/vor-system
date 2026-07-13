import express from 'express'
import { asyncHandler } from '../middleware/error'
import { authMiddleware } from '../middleware/auth'
import { getNotifications } from '../controllers/notifications'

const router = express.Router()

router.use(authMiddleware)
router.get('/', asyncHandler(getNotifications))

export default router
