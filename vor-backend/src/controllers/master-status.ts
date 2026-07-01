import { Response } from 'express'
import { AuthRequest, ApiResponse } from '../utils/types'
import prisma from '../config/prisma'

export const getAllMasterStatus = async (req: AuthRequest, res: Response) => {
  const statuses = await prisma.masterStatus.findMany({
    orderBy: { code: 'asc' },
  })

  res.json({
    success: true,
    message: 'Data master status berhasil diambil',
    data: statuses,
  } as ApiResponse<any>)
}

export const createMasterStatus = async (req: AuthRequest, res: Response) => {
  const { code, description, groupStatus, color, isPA, isUA, isProductivity, canCopyNextDay, forecastAllowed } = req.body

  // Check if user is ADMIN
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Hanya ADMIN yang dapat membuat konfigurasi status baru',
    })
  }

  // Validation
  if (!code || !description || !groupStatus) {
    return res.status(400).json({
      success: false,
      message: 'Code, Description, dan Group Status harus diisi',
    })
  }

  // Check if code already exists
  const existingStatus = await prisma.masterStatus.findUnique({
    where: { code },
  })

  if (existingStatus) {
    return res.status(400).json({
      success: false,
      message: `Code "${code}" sudah digunakan`,
    })
  }

  // Create master status
  const newStatus = await prisma.masterStatus.create({
    data: {
      code,
      description,
      groupStatus,
      color: color || '#808080',
      isPA: isPA || false,
      isUA: isUA || false,
      isProductivity: isProductivity || false,
      canCopyNextDay: canCopyNextDay !== false,
      forecastAllowed: forecastAllowed !== false,
    },
  })

  res.json({
    success: true,
    message: 'Master status berhasil dibuat',
    data: newStatus,
  } as ApiResponse<any>)
}

export const getMasterStatusByCode = async (req: AuthRequest, res: Response) => {
  const { code } = req.params

  const status = await prisma.masterStatus.findUnique({
    where: { code },
  })

  if (!status) {
    return res.status(404).json({
      success: false,
      message: 'Status tidak ditemukan',
    })
  }

  res.json({
    success: true,
    message: 'Data master status berhasil diambil',
    data: status,
  } as ApiResponse<any>)
}

export const getMasterStatusByGroup = async (req: AuthRequest, res: Response) => {
  const { group } = req.query

  if (!group || typeof group !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Parameter group harus diberikan',
    })
  }

  const statuses = await prisma.masterStatus.findMany({
    where: { groupStatus: group },
    orderBy: { code: 'asc' },
  })

  res.json({
    success: true,
    message: 'Data master status berhasil diambil',
    data: statuses,
  } as ApiResponse<any>)
}

export const updateMasterStatus = async (req: AuthRequest, res: Response) => {
  const { code } = req.params
  const { description, groupStatus, color, isPA, isUA, isProductivity, canCopyNextDay, forecastAllowed } = req.body

  // Check if user is ADMIN
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Hanya ADMIN yang dapat mengubah konfigurasi status',
    })
  }

  // Check if status exists
  const existingStatus = await prisma.masterStatus.findUnique({
    where: { code },
  })

  if (!existingStatus) {
    return res.status(404).json({
      success: false,
      message: 'Status tidak ditemukan',
    })
  }

  // Update master status
  const updatedStatus = await prisma.masterStatus.update({
    where: { code },
    data: {
      description: description || existingStatus.description,
      groupStatus: groupStatus || existingStatus.groupStatus,
      color: color || existingStatus.color,
      isPA: typeof isPA === 'boolean' ? isPA : existingStatus.isPA,
      isUA: typeof isUA === 'boolean' ? isUA : existingStatus.isUA,
      isProductivity: typeof isProductivity === 'boolean' ? isProductivity : existingStatus.isProductivity,
      canCopyNextDay: typeof canCopyNextDay === 'boolean' ? canCopyNextDay : existingStatus.canCopyNextDay,
      forecastAllowed: typeof forecastAllowed === 'boolean' ? forecastAllowed : existingStatus.forecastAllowed,
    },
  })

  res.json({
    success: true,
    message: 'Master status berhasil diperbarui',
    data: updatedStatus,
  } as ApiResponse<any>)
}

export const deleteMasterStatus = async (req: AuthRequest, res: Response) => {
  const { code } = req.params

  // Check if user is ADMIN
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Hanya ADMIN yang dapat menghapus konfigurasi status',
    })
  }

  // Check if status exists
  const existingStatus = await prisma.masterStatus.findUnique({
    where: { code },
  })

  if (!existingStatus) {
    return res.status(404).json({
      success: false,
      message: 'Status tidak ditemukan',
    })
  }

  // Check if status is being used in ActualStatus or ForecastStatus
  const actualStatusCount = await prisma.actualStatus.count({
    where: { statusCode: code },
  })

  const forecastStatusCount = await prisma.forecastStatus.count({
    where: { statusCode: code },
  })

  if (actualStatusCount > 0 || forecastStatusCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Status tidak dapat dihapus karena sudah digunakan dalam ${actualStatusCount} actual status dan ${forecastStatusCount} forecast status`,
    })
  }

  // Delete master status
  await prisma.masterStatus.delete({
    where: { code },
  })

  res.json({
    success: true,
    message: 'Master status berhasil dihapus',
  } as ApiResponse<any>)
}
