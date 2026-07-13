import { Response } from 'express'
import { authenticator } from 'otplib'
import qrcode from 'qrcode'
import { AuthRequest, ApiResponse, AppError } from '../utils/types'
import prisma from '../config/prisma'

const ISSUER = 'VOR Fleet BJU'

// Langkah 1: buat secret TOTP (pending) & kembalikan QR untuk di-scan.
// Secret disimpan tapi twoFactorEnabled tetap false sampai user memverifikasi kode.
export const setup2FA = async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user) throw new AppError('User tidak ditemukan', 404)
  if (user.twoFactorEnabled) {
    throw new AppError('2FA sudah aktif. Nonaktifkan dulu untuk mengatur ulang.', 409)
  }

  const secret = authenticator.generateSecret()
  const otpauth = authenticator.keyuri(user.email, ISSUER, secret)
  const qrDataUrl = await qrcode.toDataURL(otpauth)

  // Simpan sebagai secret pending (enabled masih false)
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: secret },
  })

  res.json({
    success: true,
    message: 'Scan QR dengan aplikasi authenticator, lalu masukkan kode untuk mengaktifkan',
    data: { qr: qrDataUrl, otpauth, secret },
  } as ApiResponse<any>)
}

// Langkah 2: verifikasi kode 6 digit terhadap secret pending → aktifkan 2FA.
export const enable2FA = async (req: AuthRequest, res: Response) => {
  const code = String(req.body?.code || '').trim()
  if (!code) throw new AppError('Kode autentikasi harus diisi', 400)

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user) throw new AppError('User tidak ditemukan', 404)
  if (user.twoFactorEnabled) throw new AppError('2FA sudah aktif', 409)
  if (!user.twoFactorSecret) throw new AppError('Belum ada proses setup 2FA. Mulai setup terlebih dahulu.', 400)

  const valid = authenticator.verify({ token: code, secret: user.twoFactorSecret })
  if (!valid) throw new AppError('Kode autentikasi tidak valid', 401)

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: true },
  })

  res.json({ success: true, message: '2FA berhasil diaktifkan' } as ApiResponse<any>)
}

// Nonaktifkan 2FA — wajib verifikasi kode aktif agar tidak sembarangan dimatikan.
export const disable2FA = async (req: AuthRequest, res: Response) => {
  const code = String(req.body?.code || '').trim()
  if (!code) throw new AppError('Kode autentikasi harus diisi', 400)

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user) throw new AppError('User tidak ditemukan', 404)
  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new AppError('2FA tidak sedang aktif', 400)
  }

  const valid = authenticator.verify({ token: code, secret: user.twoFactorSecret })
  if (!valid) throw new AppError('Kode autentikasi tidak valid', 401)

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  })

  res.json({ success: true, message: '2FA berhasil dinonaktifkan' } as ApiResponse<any>)
}
