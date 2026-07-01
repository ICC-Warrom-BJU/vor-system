import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit2, Filter, Plus, Search, Shield, Trash2, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

type UserRole = 'ADMIN' | 'PLANNER' | 'SUPERVISOR' | 'MANAGEMENT'

interface Branch {
  id: string
  name: string
}

interface User {
  id: string
  name: string
  email: string
  role: UserRole
  cabang?: string | null
  branch?: Branch | null
  branchId?: string | null
  allowedVehicleTypes?: string[]
  createdAt?: string
}

interface UserFormData {
  name: string
  email: string
  password: string
  role: UserRole
  branchId: string
  allowedVehicleTypes: string[]
}

const emptyForm: UserFormData = {
  name: '',
  email: '',
  password: '',
  role: 'PLANNER',
  branchId: '',
  allowedVehicleTypes: [],
}

const roleOptions: UserRole[] = ['ADMIN', 'PLANNER', 'SUPERVISOR', 'MANAGEMENT']

const roleStyles: Record<UserRole, string> = {
  ADMIN: 'bg-red-100 text-red-800',
  PLANNER: 'bg-blue-100 text-blue-800',
  SUPERVISOR: 'bg-purple-100 text-purple-800',
  MANAGEMENT: 'bg-green-100 text-green-800',
}

async function readApiMessage(response: Response) {
  const data = await response.json().catch(() => null)

  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || 'Request gagal')
  }

  return data
}

export default function Settings() {
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<UserFormData>(emptyForm)
  const [formError, setFormError] = useState('')
  const [message, setMessage] = useState('')
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const isAdmin = currentUser?.role === 'ADMIN'

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      return readApiMessage(response)
    },
  })

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/branches', {
        headers: { Authorization: `Bearer ${token}` },
      })
      return readApiMessage(response)
    },
  })

  const { data: vehicleTypesData } = useQuery({
    queryKey: ['vehicleTypes'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/vehicle-types', {
        headers: { Authorization: `Bearer ${token}` },
      })
      return readApiMessage(response)
    },
  })

  const filteredUsers = useMemo(() => {
    const search = searchTerm.toLowerCase()

    return ((users?.data || []) as User[]).filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.role.toLowerCase().includes(search) ||
        (user.branch?.name || user.cabang || '').toLowerCase().includes(search) ||
        (user.allowedVehicleTypes || []).join(' ').toLowerCase().includes(search)
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter

      return matchesSearch && matchesRole
    })
  }, [roleFilter, searchTerm, users?.data])

  const saveUser = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token')
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        branchId: formData.branchId || undefined,
        allowedVehicleTypes: formData.role === 'PLANNER' ? formData.allowedVehicleTypes : [],
        ...(editingUser ? {} : { password: formData.password }),
      }

      const response = await fetch(editingUser ? `/api/users/${editingUser.id}` : '/api/users', {
        method: editingUser ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      return readApiMessage(response)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setMessage(editingUser ? 'User berhasil diperbarui' : 'User berhasil ditambahkan')
      closeModal()
    },
    onError: (error) => setFormError(error.message),
  })

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      return readApiMessage(response)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setMessage('User berhasil dihapus')
    },
    onError: (error) => setMessage(error.message),
  })

  const openCreateModal = () => {
    setEditingUser(null)
    setFormData(emptyForm)
    setFormError('')
    setMessage('')
    setIsModalOpen(true)
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      branchId: user.branchId || '',
      allowedVehicleTypes: user.allowedVehicleTypes || [],
    })
    setFormError('')
    setMessage('')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingUser(null)
    setFormData(emptyForm)
    setFormError('')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')

    if (!formData.name.trim()) {
      setFormError('Nama wajib diisi')
      return
    }

    if (!formData.email.trim()) {
      setFormError('Email wajib diisi')
      return
    }

    if (!editingUser && formData.password.length < 6) {
      setFormError('Password minimal 6 karakter')
      return
    }

    saveUser.mutate()
  }

  const handleDelete = (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      setMessage('Tidak dapat menghapus akun sendiri')
      return
    }

    if (confirm(`Hapus user ${targetUser.name}?`)) {
      deleteUser.mutate(targetUser.id)
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manajemen User</h1>
          <p className="text-sm text-gray-500">Kelola akses user, role, dan cabang operasional.</p>
        </div>
        <button
          onClick={openCreateModal}
          disabled={!isAdmin}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-4 py-2 rounded-lg hover:from-emerald-400 hover:to-cyan-400 transition-all shadow-lg shadow-emerald-500/25 disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-300 disabled:shadow-none disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          <span>Tambah User</span>
        </button>
      </div>

      {!isAdmin && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Hanya user dengan role ADMIN yang dapat menambah, mengedit, atau menghapus user.
        </div>
      )}

      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.includes('berhasil')
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama, email, role, atau cabang..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as 'ALL' | UserRole)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="ALL">Semua Role</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cabang</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akses Tipe</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dibuat</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">Memuat data user...</td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-full ${roleStyles[user.role]}`}>
                        <Shield className="h-3 w-3" />
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.branch?.name || user.cabang || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.role === 'PLANNER' && user.allowedVehicleTypes && user.allowedVehicleTypes.length > 0
                        ? user.allowedVehicleTypes.join(', ')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          disabled={!isAdmin}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 disabled:text-gray-300 disabled:cursor-not-allowed"
                        >
                          <Edit2 className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={!isAdmin || deleteUser.isPending || user.id === currentUser?.id}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 disabled:text-gray-300 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-4 w-4" />
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <p className="text-lg font-medium mb-2">{searchTerm || roleFilter !== 'ALL' ? 'Tidak ada hasil pencarian' : 'Tidak ada data user'}</p>
                    <p className="text-sm">{searchTerm || roleFilter !== 'ALL' ? 'Coba kata kunci atau filter lain' : 'Silakan tambah user baru'}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">{editingUser ? 'Edit User' : 'Tambah User'}</h2>
              <button onClick={closeModal} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700">Nama *</span>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="Nama lengkap"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700">Email *</span>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="nama@email.com"
                  />
                </label>

                {!editingUser && (
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-gray-700">Password *</span>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      placeholder="Minimal 6 karakter"
                    />
                  </label>
                )}

                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700">Role *</span>
                  <select
                    value={formData.role}
                    onChange={(event) => setFormData({ ...formData, role: event.target.value as UserRole })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 sm:col-span-2">
                  <span className="text-sm font-medium text-gray-700">Cabang</span>
                  <select
                    value={formData.branchId}
                    onChange={(event) => setFormData({ ...formData, branchId: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Pilih cabang</option>
                    {(branches?.data || []).map((branch: any) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>

                {formData.role === 'PLANNER' && (
                  <label className="space-y-1 sm:col-span-2">
                    <span className="text-sm font-medium text-gray-700">Akses Tipe Unit</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                      {(vehicleTypesData?.data || []).map((vt: any) => {
                        const checked = formData.allowedVehicleTypes.includes(vt.name)
                        return (
                          <label key={vt.id} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 has-[:checked]:bg-blue-50 has-[:checked]:border-blue-300">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setFormData({
                                  ...formData,
                                  allowedVehicleTypes: checked
                                    ? formData.allowedVehicleTypes.filter((t: string) => t !== vt.name)
                                    : [...formData.allowedVehicleTypes, vt.name],
                                })
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            {vt.name}
                          </label>
                        )
                      })}
                    </div>
                  </label>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saveUser.isPending}
                  className="rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-white transition-colors hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-50"
                >
                  {saveUser.isPending ? 'Menyimpan...' : editingUser ? 'Simpan Perubahan' : 'Tambah User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
