import { z } from 'zod'
import { Role } from '@prisma/client'

// Auth
export const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})

export const registerSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: z.enum(['ADMIN', 'PLANNER', 'SUPERVISOR', 'MANAGEMENT']).default('PLANNER'),
  cabang: z.string().optional(),
  branchId: z.string().optional(),
  allowedVehicleTypes: z.array(z.string()).optional(),
})

// Vehicle
export const createVehicleSchema = z.object({
  nopol: z.string().min(1, 'Nopol tidak boleh kosong'),
  vehicleType: z.string().min(1, 'Tipe kendaraan tidak boleh kosong'),
  tonase: z.number().nullable().optional(),
  kubikasi: z.number().nullable().optional(),
  nomorRangka: z.string().nullable().optional(),
  detailUnit: z.string().nullable().optional(),
  nomorLambung: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  targetRevenue: z.number().nullable().optional(),
  cabang: z.string().optional(),
  branchId: z.string().min(1, 'Cabang harus dipilih'),
  customerId: z.string().min(1).optional().nullable().or(z.literal('')).transform(v => !v ? undefined : v),
  driverId: z.string().min(1).optional().nullable().or(z.literal('')).transform(v => !v ? undefined : v),
})

export const updateVehicleSchema = createVehicleSchema.partial()

function toDateOrUndefined(val: any): string | undefined {
  if (!val || typeof val !== 'string') return undefined
  try { return new Date(val).toISOString() } catch { return undefined }
}

// Driver
export const createDriverSchema = z.object({
  name: z.string().min(3, 'Nama driver minimal 3 karakter'),
  nid: z.string().optional(),
  phone: z.string().optional(),
  simType: z.string().optional(),
  simExpiry: z.string().optional().nullable().transform(v => v ? toDateOrUndefined(v) : undefined),
  address: z.string().optional(),
  joinDate: z.string().optional().nullable().transform(v => v ? toDateOrUndefined(v) : undefined),
  cabang: z.string().optional(),
  branchId: z.string().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
})

export const updateDriverSchema = createDriverSchema.partial()

// Customer
export const createCustomerSchema = z.object({
  name: z.string().min(3, 'Nama customer minimal 3 karakter'),
  phone: z.string().optional(),
  email: z.string().email('Email tidak valid').optional().nullable(),
  pic: z.string().optional(),
  address: z.string().optional(),
  cabang: z.string().optional(),
  branchId: z.string().optional(),
  isActive: z.boolean().default(true),
})

export const updateCustomerSchema = createCustomerSchema.partial()

// Branch
export const createBranchSchema = z.object({
  name: z.string().min(1, 'Nama cabang tidak boleh kosong'),
  code: z.string().optional(),
  description: z.string().optional(),
})

export const updateBranchSchema = createBranchSchema.partial()

// Actual Status
export const createActualStatusSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID tidak boleh kosong'),
  statusCode: z.string().min(1, 'Status code tidak boleh kosong'),
  subStatus: z.string().optional(),
  date: z.string().datetime(),
})

export const updateActualStatusSchema = createActualStatusSchema.partial()

// Revenue Data
export const createRevenueDataSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID tidak boleh kosong'),
  date: z.string().datetime(),
  amount: z.number().min(0, 'Amount tidak boleh negatif'),
})

// GPS Tracking
export const createGpsTrackingSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID tidak boleh kosong'),
  date: z.string().min(1, 'Tanggal tidak boleh kosong'),
  totalDistance: z.number().min(0, 'Total distance tidak boleh negatif'),
  drivingTime: z.number().int().min(0, 'Driving time tidak boleh negatif'),
  movingTime: z.number().int().min(0, 'Moving time tidak boleh negatif'),
  parkingTime: z.number().int().min(0, 'Parking time tidak boleh negatif'),
  idleTime: z.number().int().min(0, 'Idle time tidak boleh negatif'),
  maxSpeed: z.number().min(0).nullable().optional(),
  ratioSpeed: z.number().nullable().optional(),
})

export const updateGpsTrackingSchema = z.object({
  totalDistance: z.number().min(0).optional(),
  drivingTime: z.number().int().min(0).optional(),
  movingTime: z.number().int().min(0).optional(),
  parkingTime: z.number().int().min(0).optional(),
  idleTime: z.number().int().min(0).optional(),
  maxSpeed: z.number().min(0).nullable().optional(),
  ratioSpeed: z.number().nullable().optional(),
})

export type LoginRequest = z.infer<typeof loginSchema>
export type RegisterRequest = z.infer<typeof registerSchema>
export type CreateVehicleRequest = z.infer<typeof createVehicleSchema>
export type CreateDriverRequest = z.infer<typeof createDriverSchema>
export type CreateCustomerRequest = z.infer<typeof createCustomerSchema>
export type CreateActualStatusRequest = z.infer<typeof createActualStatusSchema>
export type CreateRevenueDataRequest = z.infer<typeof createRevenueDataSchema>
export type CreateGpsTrackingRequest = z.infer<typeof createGpsTrackingSchema>
