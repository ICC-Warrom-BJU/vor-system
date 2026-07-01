import express from 'express'
import { asyncHandler } from '../middleware/error'
import { authMiddleware, roleGuard } from '../middleware/auth'
import * as branchController from '../controllers/branches'

const router = express.Router()

router.use(authMiddleware)

router.get('/', asyncHandler(branchController.getAllBranches))
router.get('/:id', asyncHandler(branchController.getBranchById))
router.post('/', roleGuard(['ADMIN']), asyncHandler(branchController.createBranch))
router.put('/:id', roleGuard(['ADMIN']), asyncHandler(branchController.updateBranch))
router.delete('/:id', roleGuard(['ADMIN']), asyncHandler(branchController.deleteBranch))

export default router
