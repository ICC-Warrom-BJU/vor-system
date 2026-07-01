import { Request } from 'express'
import { ParsedQs } from 'qs'
import { Role } from '@prisma/client'

export interface AuthRequest extends Request {
  params: Record<string, string>
  query: ParsedQs & Record<string, string | undefined>
  user?: {
    id: string
    email: string
    role: Role
    cabang?: string
    branchId?: string
    allowedVehicleTypes?: string[]
  }
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
  error?: string
}

export class AppError extends Error {
  public statusCode: number

  constructor(message: string, statusCode?: number)
  constructor(statusCode: number, message: string)
  constructor(messageOrStatusCode: string | number, statusCodeOrMessage: number | string = 500) {
    const message = typeof messageOrStatusCode === 'string' ? messageOrStatusCode : String(statusCodeOrMessage)
    super(message)
    this.statusCode = typeof messageOrStatusCode === 'number' ? messageOrStatusCode : Number(statusCodeOrMessage)
    Error.captureStackTrace(this, this.constructor)
  }
}
