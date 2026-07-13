import { FormEvent, useState } from 'react'
import { Shuffle, Save, KeyRound, Check, AlertCircle } from 'lucide-react'
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
    if (newPassword.length < 6) {
      setPwMsg({ ok: false, text: 'Password baru minimal 6 karakter.' })
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
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} placeholder="Minimal 6 karakter" required />
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
    </div>
  )
}
