import { Response } from 'express'
import { AuthRequest, ApiResponse } from '../utils/types'
import prisma from '../config/prisma'
import { createCustomerSchema, updateCustomerSchema } from '../utils/validators'

const customerInclude = {
  branch: { select: { id: true, name: true } },
  vehicles: {
    select: { id: true, nopol: true, vehicleType: true },
  },
}

export const getAllCustomers = async (req: AuthRequest, res: Response) => {
  const where: any = {}
  if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGEMENT') {
    where.cabang = req.user.cabang
  }

  const customers = await prisma.customer.findMany({
    where,
    include: customerInclude,
    orderBy: { name: 'asc' },
  })

  res.json({
    success: true,
    message: 'Data customer berhasil diambil',
    data: customers,
  } as ApiResponse<any>)
}

export const getCustomerById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: customerInclude,
  })

  if (!customer) {
    return res.status(404).json({
      success: false,
      message: 'Customer tidak ditemukan',
    })
  }

  res.json({
    success: true,
    message: 'Data customer berhasil diambil',
    data: customer,
  } as ApiResponse<any>)
}

export const createCustomer = async (req: AuthRequest, res: Response) => {
  const parsed = createCustomerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Validasi gagal',
      error: parsed.error.issues,
    })
  }

  const data: any = { ...parsed.data }
  if (data.branchId && !data.cabang) {
    const branch = await prisma.branch.findUnique({ where: { id: data.branchId } })
    if (branch) data.cabang = branch.name
  }

  const customer = await prisma.customer.create({
    data,
    include: customerInclude,
  })

  res.status(201).json({
    success: true,
    message: 'Customer berhasil ditambahkan',
    data: customer,
  } as ApiResponse<any>)
}

export const updateCustomer = async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  const parsed = updateCustomerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Validasi gagal',
      error: parsed.error.issues,
    })
  }

  const customer = await prisma.customer.findUnique({ where: { id } })
  if (!customer) {
    return res.status(404).json({
      success: false,
      message: 'Customer tidak ditemukan',
    })
  }

  const data: any = { ...parsed.data }
  if (data.branchId && !data.cabang) {
    const branch = await prisma.branch.findUnique({ where: { id: data.branchId } })
    if (branch) data.cabang = branch.name
  }

  const updated = await prisma.customer.update({
    where: { id },
    data,
    include: customerInclude,
  })

  res.json({
    success: true,
    message: 'Customer berhasil diperbarui',
    data: updated,
  } as ApiResponse<any>)
}

export const deleteCustomer = async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  const customer = await prisma.customer.findUnique({ where: { id } })
  if (!customer) {
    return res.status(404).json({
      success: false,
      message: 'Customer tidak ditemukan',
    })
  }

  const hasVehicles = await prisma.vehicle.findFirst({
    where: { customerId: id },
  })
  if (hasVehicles) {
    return res.status(409).json({
      success: false,
      message: 'Customer masih memiliki kendaraan, tidak bisa diarsipkan',
    })
  }

  // Arsip (bukan hapus): jaga integritas data historis (ActualStatus merujuk customer).
  await prisma.customer.update({ where: { id }, data: { isActive: false } })

  res.json({
    success: true,
    message: 'Customer berhasil diarsipkan',
  } as ApiResponse<null>)
}
