import { FormEvent, useState } from 'react'
import { Shuffle, Save, KeyRound, Check, AlertCircle, ShieldCheck, Smartphone } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Avatar from '../components/Avatar'

function randomSeed() {
  return Math.random().toString(36).slice(2, 10)
}

export default function Account() {
  const { user, updateUser } = useAuth()
  const defaultSeed = user?.avatarSeed || user?.email || 'user'

  // Avatar
  const [seed, setSeed] = useState(defaultSeed)
  const [savingAvatar, setSavingAvatar] = useState(false)
  const [avatarMsg, setAvatarMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // 2FA
  const isAdmin = user?.role === 'ADMIN'
  const [twoFaEnabled, setTwoFaEnabled] = useState(!!user?.twoFactorEnabled)
  const [setupData, setSetupData] = useState<{ qr: string; secret: string } | null>(null)
  const [twoFaCode, setTwoFaCode] = useState('')
  const [disabling, setDisabling] = useState(false)
  const [twoFaBusy, setTwoFaBusy] = useState(false)
  const [twoFaMsg, setTwoFaMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const twoFaFetch = async (path: string, body?: object) => {
    const token = localStorage.getItem('token')
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    })
    return { res, data: await res.json() }
  }

  const startSetup = async () => {
    setTwoFaMsg(null); setTwoFaBusy(true)
    try {
      const { res, data } = await twoFaFetch('/api/auth/2fa/setup')
      if (res.ok && data.success) setSetupData({ qr: data.data.qr, secret: data.data.secret })
      else setTwoFaMsg({ ok: false, text: data.message || 'Gagal memulai setup 2FA.' })
    } catch { setTwoFaMsg({ ok: false, text: 'Terjadi kesalahan jaringan.' }) }
    finally { setTwoFaBusy(false) }
  }

  const confirmEnable = async () => {
    setTwoFaMsg(null); setTwoFaBusy(true)
    try {
      const { res, data } = await twoFaFetch('/api/auth/2fa/enable', { code: twoFaCode })
      if (res.ok && data.success) {
        setTwoFaEnabled(true); setSetupData(null); setTwoFaCode(''); updateUser({ twoFactorEnabled: true })
        setTwoFaMsg({ ok: true, text: '2FA berhasil diaktifkan.' })
      } else setTwoFaMsg({ ok: false, text: data.message || 'Kode tidak valid.' })
    } catch { setTwoFaMsg({ ok: false, text: 'Terjadi kesalahan jaringan.' }) }
    finally { setTwoFaBusy(false) }
  }

  const confirmDisable = async () => {
    setTwoFaMsg(null); setTwoFaBusy(true)
    try {
      const { res, data } = await twoFaFetch('/api/auth/2fa/disable', { code: twoFaCode })
      if (res.ok && data.success) {
        setTwoFaEnabled(false); setDisabling(false); setTwoFaCode(''); updateUser({ twoFactorEnabled: false })
        setTwoFaMsg({ ok: true, text: '2FA berhasil dinonaktifkan.' })
      } else setTwoFaMsg({ ok: false, text: data.message || 'Kode tidak valid.' })
    } catch { setTwoFaMsg({ ok: false, text: 'Terjadi kesalahan jaringan.' }) }
    finally { setTwoFaBusy(false) }
  }

  const dirtyAvatar = seed !== defaultSeed

  const saveAvatar = async () => {
    setAvatarMsg(null)
    setSavingAvatar(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/users/me/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatarSeed: seed }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        updateUser({ avatarSeed: seed })
        setAvatarMsg({ ok: true, text: 'Avatar berhasil disimpan.' })
      } else {
        setAvatarMsg({ ok: false, text: data.message || 'Gagal menyimpan avatar.' })
      }
    } catch {
      setAvatarMsg({ ok: false, text: 'Terjadi kesalahan jaringan.' })
    } finally {
      setSavingAvatar(false)
    }
  }

  const changePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPwMsg(null)
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPwMsg({ ok: false, text: 'Password baru minimal 8 karakter serta mengandung huruf dan angka.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ ok: false, text: 'Konfirmasi password tidak cocok.' })
      return
    }
    setSavingPw(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/users/me/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setPwMsg({ ok: true, text: 'Password berhasil diubah.' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setPwMsg({ ok: false, text: data.message || 'Gagal mengubah password.' })
      }
    } catch {
      setPwMsg({ ok: false, text: 'Terjadi kesalahan jaringan.' })
    } finally {
      setSavingPw(false)
    }
  }

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'

  return (
    <div className="space-y-6 animate-fade-up max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Akun Saya</h1>
        <p className="text-sm text-gray-500">Ubah avatar dan password akun Anda.</p>
      </div>

      {/* Avatar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Avatar</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <Avatar seed={seed} size={96} className="border border-gray-200 shadow-sm" />
          <div className="flex-1 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seed avatar</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  className={inputClass}
                  placeholder="Ketik apa saja untuk avatar unik"
                />
                <button
                  type="button"
                  onClick={() => setSeed(randomSeed())}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                >
                  <Shuffle className="w-4 h-4" /> Acak
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Avatar dibuat dari seed ini (Multiavatar). Seed yang sama menghasilkan avatar yang sama.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={saveAvatar}
                disabled={savingAvatar || !dirtyAvatar}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg hover:from-emerald-400 hover:to-cyan-400 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {savingAvatar ? 'Menyimpan…' : 'Simpan Avatar'}
              </button>
              {avatarMsg && (
                <span className={`flex items-center gap-1 text-sm ${avatarMsg.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                  {avatarMsg.ok ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {avatarMsg.text}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Password */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
          <KeyRound className="w-5 h-5 text-gray-500" /> Ubah Password
        </h2>
        <form onSubmit={changePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password saat ini</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password baru</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} placeholder="Min 8 karakter, huruf & angka" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi password baru</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} required />
          </div>
          {pwMsg && (
            <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${pwMsg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {pwMsg.ok ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {pwMsg.text}
            </div>
          )}
          <button
            type="submit"
            disabled={savingPw}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg hover:from-emerald-400 hover:to-cyan-400 transition-all disabled:opacity-50"
          >
            <KeyRound className="w-4 h-4" /> {savingPw ? 'Menyimpan…' : 'Ubah Password'}
          </button>
        </form>
      </div>

      {/* 2FA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-1">
          <ShieldCheck className="w-5 h-5 text-gray-500" /> Autentikasi Dua Faktor (2FA)
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Tambahkan lapisan keamanan dengan kode dari aplikasi authenticator (Google Authenticator, Authy, dll).
        </p>

        {isAdmin && !twoFaEnabled && (
          <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2 mb-4 bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            2FA <strong>wajib</strong> untuk akun ADMIN. Mohon aktifkan sekarang.
          </div>
        )}

        {twoFaMsg && (
          <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 mb-4 ${twoFaMsg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {twoFaMsg.ok ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {twoFaMsg.text}
          </div>
        )}

        {/* Status aktif */}
        {twoFaEnabled && !disabling && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
              <ShieldCheck className="w-4 h-4" /> 2FA Aktif
            </span>
            <button
              type="button"
              onClick={() => { setDisabling(true); setTwoFaMsg(null); setTwoFaCode('') }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Nonaktifkan
            </button>
          </div>
        )}

        {/* Konfirmasi nonaktifkan */}
        {twoFaEnabled && disabling && (
          <div className="max-w-sm space-y-3">
            <p className="text-sm text-gray-600">Masukkan kode dari authenticator untuk menonaktifkan 2FA.</p>
            <input
              type="text" inputMode="numeric" autoFocus value={twoFaCode}
              onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={`${inputClass} text-center text-xl tracking-[0.4em]`} placeholder="000000" maxLength={6}
            />
            <div className="flex gap-2">
              <button type="button" disabled={twoFaBusy || twoFaCode.length !== 6} onClick={confirmDisable}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                {twoFaBusy ? 'Memproses…' : 'Nonaktifkan 2FA'}
              </button>
              <button type="button" onClick={() => { setDisabling(false); setTwoFaCode('') }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Batal</button>
            </div>
          </div>
        )}

        {/* Belum aktif & belum mulai setup */}
        {!twoFaEnabled && !setupData && (
          <button type="button" disabled={twoFaBusy} onClick={startSetup}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg hover:from-emerald-400 hover:to-cyan-400 transition-all disabled:opacity-50">
            <ShieldCheck className="w-4 h-4" /> {twoFaBusy ? 'Memuat…' : 'Aktifkan 2FA'}
          </button>
        )}

        {/* Proses setup: tampilkan QR + input kode */}
        {!twoFaEnabled && setupData && (
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="shrink-0">
              <img src={setupData.qr} alt="QR 2FA" className="w-44 h-44 rounded-lg border border-gray-200" />
            </div>
            <div className="flex-1 space-y-3 max-w-sm">
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <Smartphone className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                <span>Scan QR dengan aplikasi authenticator. Bila tak bisa scan, masukkan kode ini manual:</span>
              </div>
              <code className="block text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5 break-all font-mono">{setupData.secret}</code>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Masukkan kode 6 digit</label>
                <input
                  type="text" inputMode="numeric" autoFocus value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`${inputClass} text-center text-xl tracking-[0.4em]`} placeholder="000000" maxLength={6}
                />
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={twoFaBusy || twoFaCode.length !== 6} onClick={confirmEnable}
                  className="px-4 py-2 text-sm bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg hover:from-emerald-400 hover:to-cyan-400 transition-all disabled:opacity-50">
                  {twoFaBusy ? 'Memverifikasi…' : 'Aktifkan'}
                </button>
                <button type="button" onClick={() => { setSetupData(null); setTwoFaCode(''); setTwoFaMsg(null) }}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Batal</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
