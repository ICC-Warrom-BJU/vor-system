import { Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AuthRequest, AppError } from '../utils/types'
import { Role } from '@prisma/client'
import { JWT_SECRET } from '../config/env'

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]

    if (!token || token === 'null' || token === 'undefined') {
      throw new AppError(401, 'Token tidak ditemukan')
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string
      email: string
      role: Role
      cabang?: string
    }

    req.user = decoded
    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ success: false, message: 'Token tidak valid' })
    }
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message })
    }
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export const roleGuard = (allowedRoles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User tidak terautentikasi' })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak. Hanya role ${allowedRoles.join(', ')} yang diizinkan`,
      })
    }

    next()
  }
}
