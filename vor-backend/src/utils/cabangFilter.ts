import { AuthRequest } from './types'

const restrictedRoles = ['SUPERVISOR', 'PLANNER']

function isRestricted(req: AuthRequest): boolean {
  return restrictedRoles.includes(req.user?.role || '')
}

export function getCabangFilter(req: AuthRequest): { cabang?: string } {
  if (!isRestricted(req) || !req.user?.cabang) {
    return {}
  }
  return { cabang: req.user.cabang }
}

export function getVehicleCabangFilter(req: AuthRequest): { vehicle?: { cabang?: string } } {
  if (!isRestricted(req) || !req.user?.cabang) {
    return {}
  }
  return { vehicle: { cabang: req.user.cabang } }
}

export function getBranchOrCabangFilter(req: AuthRequest): { cabang?: string; branchId?: string } {
  if (!isRestricted(req)) {
    return {}
  }
  if (req.user?.branchId) {
    return { branchId: req.user.branchId }
  }
  if (req.user?.cabang) {
    return { cabang: req.user.cabang }
  }
  return {}
}

/** For non-restricted roles, optionally filter by a given branchId */
export function getOptionalBranchFilter(req: AuthRequest, branchId?: string): { branchId?: string } {
  if (isRestricted(req)) {
    return {}
  }
  if (branchId) {
    return { branchId }
  }
  return {}
}

/** For non-restricted roles, optionally filter vehicle relation by branchId */
export function getOptionalVehicleBranchFilter(req: AuthRequest, branchId?: string): { vehicle?: { branchId?: string } } {
  if (isRestricted(req)) {
    return {}
  }
  if (branchId) {
    return { vehicle: { branchId } }
  }
  return {}
}

/** For non-restricted roles, optionally filter by branchId on RevenueData (which has vehicle relation) */
export function getVehicleCabangOrBranchFilter(req: AuthRequest, branchId?: string): { vehicle?: { cabang?: string; branchId?: string } } {
  if (isRestricted(req)) {
    return getVehicleCabangFilter(req)
  }
  if (branchId) {
    return { vehicle: { branchId } }
  }
  return {}
}

/** Filter by allowedVehicleTypes — only applies to PLANNER role */
function isPlannerWithRestrictions(req: AuthRequest): boolean {
  const allowed = req.user?.allowedVehicleTypes
  return req.user?.role === 'PLANNER' && !!allowed && allowed.length > 0
}

/** For direct queries on Vehicle model: filter by vehicleType */
export function getVehicleTypeFilter(req: AuthRequest): { vehicleType?: { in: string[] } } {
  if (!isPlannerWithRestrictions(req)) {
    return {}
  }
  return { vehicleType: { in: req.user!.allowedVehicleTypes! } }
}

/** For nested queries through Vehicle relation: filter by vehicleType */
export function getVehicleRelationTypeFilter(req: AuthRequest): { vehicle?: { vehicleType?: { in: string[] } } } {
  if (!isPlannerWithRestrictions(req)) {
    return {}
  }
  return { vehicle: { vehicleType: { in: req.user!.allowedVehicleTypes! } } }
}
