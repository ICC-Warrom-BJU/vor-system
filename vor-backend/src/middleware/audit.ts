import { Request, Response, NextFunction } from 'express'
import prisma from '../config/prisma'
import { AuthRequest } from '../utils/types'

const AUDITED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

// Segmen sub-resource yang bukan id entitas
const NON_ID_SEGMENTS = ['me', 'bulk', 'code', 'date', 'vehicle', 'live', 'sync', 'group', 'update', 'change-password', 'profile']

function entityFromPath(path: string): { entity: string; entityId: string | null } {
  const clean = path.replace(/^\/+/, '').replace(/^api\//, '')
  const segs = clean.split('/').filter(Boolean)
  const entity = segs[0] || 'unknown'
  const second = segs[1]
  const entityId = second && !NON_ID_SEGMENTS.includes(second) ? second : null
  return { entity, entityId }
}

function sanitize(data: any): any {
  if (!data || typeof data !== 'object') return data
  const clone: any = Array.isArray(data) ? data.map(sanitize) : { ...data }
  if (clone && typeof clone === 'object' && !Array.isArray(clone) && 'password' in clone) {
    delete clone.password
  }
  return clone
}

// Mencatat semua mutasi (POST/PUT/PATCH/DELETE) ke AuditLog secara best-effort.
// Endpoint /api/auth dilewati agar kredensial tidak tercatat.
export const auditLogger = (req: Request, res: Response, next: NextFunction) => {
  if (!AUDITED_METHODS.includes(req.method)) return next()
  // originalUrl tidak pernah dimutasi oleh router (req.path berubah jadi relatif saat routing)
  const pathname = req.originalUrl.split('?')[0]
  if (pathname.startsWith('/api/auth')) return next()

  const originalJson = res.json.bind(res)
  let payload: any
  res.json = ((body: any) => {
    payload = body
    return originalJson(body)
  }) as any

  res.on('finish', () => {
    if (res.statusCode >= 400) return
    const userId = (req as AuthRequest).user?.id
    if (!userId) return

    const { entity, entityId } = entityFromPath(pathname)
    const after = sanitize(payload?.data ?? null)

    prisma.auditLog
      .create({
        data: {
          userId,
          action: req.method,
          entity,
          entityId: entityId || payload?.data?.id || null,
          after: after ?? undefined,
        },
      })
      .catch(() => {
        /* best-effort: jangan pernah mengganggu request utama */
      })
  })

  next()
}
