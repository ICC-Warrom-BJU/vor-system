import { Response } from 'express'
import { z } from 'zod'
import prisma from '../config/prisma'
import { ApiResponse, AuthRequest } from '../utils/types'

const createVehicleTypeSchema = z.object({
  name: z.string().min(1, 'Nama tipe unit wajib diisi'),
  description: z.string().nullable().optional(),
})

const updateVehicleTypeSchema = createVehicleTypeSchema.partial()

export const getAllVehicleTypes = async (req: AuthRequest, res: Response) => {
  const vehicleTypes = await prisma.vehicleType.findMany({
    orderBy: { name: 'asc' },
  })

  res.json({
    success: true,
    message: 'Data tipe unit berhasil diambil',
    data: vehicleTypes,
  } as ApiResponse<any>)
}

export const createVehicleType = async (req: AuthRequest, res: Response) => {
  const parsed = createVehicleTypeSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Validasi gagal', error: parsed.error.issues })
  }
  const body = parsed.data
  const name = body.name.trim()

  const existing = await prisma.vehicleType.findUnique({
    where: { name },
  })

  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'Tipe unit sudah terdaftar',
    })
  }

  const vehicleType = await prisma.vehicleType.create({
    data: {
      name,
      description: body.description?.trim() || null,
    },
  })

  res.status(201).json({
    success: true,
    message: 'Tipe unit berhasil ditambahkan',
    data: vehicleType,
  } as ApiResponse<any>)
}

export const updateVehicleType = async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const parsed = updateVehicleTypeSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Validasi gagal', error: parsed.error.issues })
  }
  const body = parsed.data

  const vehicleType = await prisma.vehicleType.findUnique({
    where: { id },
  })

  if (!vehicleType) {
    return res.status(404).json({
      success: false,
      message: 'Tipe unit tidak ditemukan',
    })
  }

  const name = body.name?.trim()
  if (name && name !== vehicleType.name) {
    const existing = await prisma.vehicleType.findUnique({
      where: { name },
    })

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Tipe unit sudah terdaftar',
      })
    }
  }

  const updated = await prisma.vehicleType.update({
    where: { id },
    data: {
      name,
      description: body.description?.trim() || null,
    },
  })

  res.json({
    success: true,
    message: 'Tipe unit berhasil diperbarui',
    data: updated,
  } as ApiResponse<any>)
}

export const deleteVehicleType = async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  const vehicleType = await prisma.vehicleType.findUnique({
    where: { id },
  })

  if (!vehicleType) {
    return res.status(404).json({
      success: false,
      message: 'Tipe unit tidak ditemukan',
    })
  }

  const usedByVehicle = await prisma.vehicle.findFirst({
    where: { vehicleType: vehicleType.name },
  })

  if (usedByVehicle) {
    return res.status(400).json({
      success: false,
      message: 'Tipe unit masih digunakan oleh data kendaraan',
    })
  }

  await prisma.vehicleType.delete({
    where: { id },
  })

  res.json({
    success: true,
    message: 'Tipe unit berhasil dihapus',
  } as ApiResponse<null>)
}
