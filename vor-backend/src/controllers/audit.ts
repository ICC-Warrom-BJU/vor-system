import { Response } from 'express'
import { AuthRequest, ApiResponse } from '../utils/types'
import prisma from '../config/prisma'

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Hanya ADMIN yang dapat melihat audit log',
    })
  }

  const { entity, action, page = '1', limit = '50' } = req.query
  const take = Math.min(Number(limit) || 50, 200)
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take

  const where: any = {}
  if (entity) where.entity = entity as string
  if (action) where.action = action as string

  const [logs, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.auditLog.count({ where }),
  ])

  res.json({
    success: true,
    message: 'Audit log berhasil diambil',
    data: { logs, totalCount, page: Math.max(Number(page) || 1, 1), limit: take },
  } as ApiResponse<any>)
}
