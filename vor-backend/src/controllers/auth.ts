import { Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { AuthRequest, AppError, ApiResponse } from '../utils/types'
import prisma from '../config/prisma'
import { loginSchema, LoginRequest } from '../utils/validators'
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/env'
import { authenticator } from 'otplib'

export const login = async (req: AuthRequest, res: Response) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    // Di halaman login, samakan semua input tidak valid dgn kegagalan kredensial
    // agar tidak membocorkan detail validasi maupun membedakan validasi vs auth.
    return res.status(401).json({
      success: false,
      message: 'Email atau password salah',
    })
  }

  const body: LoginRequest = parsed.data

  const user = await prisma.user.findUnique({
    where: { email: body.email },
    include: {
      branch: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Email atau password salah',
    })
  }

  const isPasswordValid = await bcrypt.compare(body.password, user.password)
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Email atau password salah',
    })
  }

  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'User tidak aktif',
    })
  }

  // 2FA (TOTP): bila aktif, wajib kode 6 digit yang valid sebelum token diterbitkan.
  if (user.twoFactorEnabled && user.twoFactorSecret) {
    const code = String(req.body?.code || '').trim()
    if (!code) {
      // Password benar tapi kode belum dikirim → minta kode (belum terbitkan token).
      return res.status(200).json({
        success: false,
        twoFactorRequired: true,
        message: 'Masukkan kode autentikasi 2FA',
      })
    }
    const valid = authenticator.verify({ token: code, secret: user.twoFactorSecret })
    if (!valid) {
      return res.status(401).json({
        success: false,
        twoFactorRequired: true,
        message: 'Kode autentikasi 2FA tidak valid',
      })
    }
  }

  // ADMIN wajib 2FA: bila belum aktif, tetap login tapi tandai agar frontend
  // memaksa proses setup sebelum akses fitur lain.
  const mustEnable2FA = user.role === 'ADMIN' && !user.twoFactorEnabled

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      cabang: user.cabang,
      branchId: user.branchId,
      allowedVehicleTypes: user.allowedVehicleTypes,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
  )

  res.json({
    success: true,
    message: 'Login berhasil',
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        cabang: user.cabang,
        branchId: user.branchId,
        branch: user.branch ? { id: user.branch.id, name: user.branch.name } : undefined,
        allowedVehicleTypes: user.allowedVehicleTypes,
        avatarSeed: user.avatarSeed,
        twoFactorEnabled: user.twoFactorEnabled,
        mustEnable2FA,
      },
      token,
    },
  } as ApiResponse<any>)
}
