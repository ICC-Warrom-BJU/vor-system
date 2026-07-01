import express from 'express'
import { asyncHandler } from '../middleware/error'
import { authMiddleware, roleGuard } from '../middleware/auth'
import * as userController from '../controllers/users'

const router = express.Router()

// Public endpoints (with auth)
router.get('/me', authMiddleware, asyncHandler(userController.getCurrentUser))
router.put('/me/profile', authMiddleware, asyncHandler(userController.updateUserProfile))
router.post('/me/change-password', authMiddleware, asyncHandler(userController.changePassword))

// Admin endpoints
router.get('/', authMiddleware, roleGuard(['ADMIN']), asyncHandler(userController.getAllUsers))
router.get('/by-role', authMiddleware, roleGuard(['ADMIN']), asyncHandler(userController.getUsersByRole))
router.get('/:id', authMiddleware, roleGuard(['ADMIN']), asyncHandler(userController.getUserById))
router.post('/', authMiddleware, roleGuard(['ADMIN']), asyncHandler(userController.createUser))
router.put('/:id', authMiddleware, roleGuard(['ADMIN']), asyncHandler(userController.updateUser))
router.delete('/:id', authMiddleware, roleGuard(['ADMIN']), asyncHandler(userController.deleteUser))

export default router
