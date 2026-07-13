import { Response } from 'express'
import { AuthRequest, ApiResponse } from '../utils/types'
import prisma from '../config/prisma'

// Notifikasi dihitung on-the-fly dari data operasional (tanpa tabel khusus).
export const getNotifications = async (req: AuthRequest, res: Response) => {
  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)
  const in30 = new Date(now); in30.setDate(in30.getDate() + 30)
  const last7 = new Date(now); last7.setDate(last7.getDate() - 7)

  const notifications: any[] = []

  // 1. Status hari ini: BREAKDOWN (kritis) & READY FOR USE / idle (info)
  const todayStatuses = await prisma.actualStatus.findMany({
    where: { date: { gte: todayStart, lte: todayEnd } },
    include: {
      vehicle: { select: { nopol: true } },
      status: { select: { groupStatus: true } },
    },
  })
  const breakdown = todayStatuses.filter((s) => s.status?.groupStatus === 'BREAKDOWN')
  const idle = todayStatuses.filter((s) => s.status?.groupStatus === 'READY FOR USE')

  if (breakdown.length) {
    notifications.push({
      id: 'breakdown-today',
      type: 'breakdown',
      severity: 'critical',
      title: `${breakdown.length} unit BREAKDOWN hari ini`,
      message: breakdown.map((s) => s.vehicle?.nopol).filter(Boolean).slice(0, 10).join(', '),
      link: '/actual-status',
    })
  }
  if (idle.length) {
    notifications.push({
      id: 'idle-today',
      type: 'idle',
      severity: 'info',
      title: `${idle.length} unit idle (READY FOR USE) hari ini`,
      message: idle.map((s) => s.vehicle?.nopol).filter(Boolean).slice(0, 10).join(', '),
      link: '/actual-status',
    })
  }

  // 2. SIM driver mendekati kedaluwarsa (<= 30 hari)
  const expiringSim = await prisma.driver.findMany({
    where: { isActive: true, simExpiry: { gte: todayStart, lte: in30 } },
    select: { id: true, name: true, simType: true, simExpiry: true },
    orderBy: { simExpiry: 'asc' },
    take: 20,
  })
  for (const d of expiringSim) {
    notifications.push({
      id: `sim-${d.id}`,
      type: 'sim-expiry',
      severity: 'warning',
      title: `SIM ${d.simType || ''} ${d.name} akan kedaluwarsa`,
      message: d.simExpiry ? new Date(d.simExpiry).toLocaleDateString('id-ID') : '',
      link: '/master-data',
    })
  }

  // 3. Sync GPS gagal / sebagian dalam 7 hari terakhir
  const failedSyncs = await prisma.gpsSyncLog.findMany({
    where: { status: { not: 'SUCCESS' }, createdAt: { gte: last7 } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })
  for (const s of failedSyncs) {
    notifications.push({
      id: `sync-${s.id}`,
      type: 'gps-sync',
      severity: s.status === 'FAILED' ? 'critical' : 'warning',
      title: `Sync GPS ${s.status} — ${s.scope} (${s.bulan}/${s.tahun})`,
      message: `${s.success} berhasil, ${s.failed} gagal`,
      link: '/gps-tracking',
    })
  }

  res.json({
    success: true,
    message: 'Notifikasi berhasil diambil',
    data: { notifications, count: notifications.length },
  } as ApiResponse<any>)
}
