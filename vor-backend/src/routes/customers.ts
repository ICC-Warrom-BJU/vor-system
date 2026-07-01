import express from 'express'
import { asyncHandler } from '../middleware/error'
import { authMiddleware, roleGuard } from '../middleware/auth'
import * as customerController from '../controllers/customers'

const router = express.Router()

router.use(authMiddleware)

router.get('/', asyncHandler(customerController.getAllCustomers))
router.get('/:id', asyncHandler(customerController.getCustomerById))
router.post('/', roleGuard(['ADMIN']), asyncHandler(customerController.createCustomer))
router.put('/:id', roleGuard(['ADMIN']), asyncHandler(customerController.updateCustomer))
router.delete('/:id', roleGuard(['ADMIN']), asyncHandler(customerController.deleteCustomer))

export default router
