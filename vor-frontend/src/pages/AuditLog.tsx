import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ScrollText, Shield } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const actionStyle: Record<string, string> = {
  POST: 'bg-emerald-100 text-emerald-700',
  PUT: 'bg-blue-100 text-blue-700',
  PATCH: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
}

export default function AuditLog() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [entity, setEntity] = useState('')
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)
  const limit = 50

  const { data, isLoading } = useQuery({
    queryKey: ['auditLogs', entity, action, page],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (entity) params.set('entity', entity)
      if (action) params.set('action', action)
      const res = await fetch(`/api/audit-logs?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      return res.json()
    },
    enabled: isAdmin,
  })

  const logs = data?.data?.logs || []
  const totalCount = data?.data?.totalCount || 0
  const totalPages = Math.max(1, Math.ceil(totalCount / limit))

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        Hanya user dengan role ADMIN yang dapat melihat Audit Log.
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 rounded-xl"><ScrollText className="w-6 h-6 text-indigo-600" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Audit Log</h1>
          <p className="text-sm text-gray-500">Jejak semua perubahan data di sistem.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3">
        <input
          value={entity}
          onChange={(e) => { setEntity(e.target.value); setPage(1) }}
          placeholder="Filter entity (mis. vehicles, master-status)"
          className="flex-1 min-w-[220px] border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Semua aksi</option>
          <option value="POST">POST (buat)</option>
          <option value="PUT">PUT (ubah)</option>
          <option value="DELETE">DELETE (hapus)</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waktu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Memuat…</td></tr>
              ) : logs.length > 0 ? (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(log.createdAt).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="inline-flex items-center gap-1 font-medium text-gray-800">
                        <Shield className="w-3 h-3 text-gray-400" />{log.user?.name || log.userId}
                      </span>
                      <span className="block text-xs text-gray-400">{log.user?.role}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${actionStyle[log.action] || 'bg-gray-100 text-gray-700'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">{log.entity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">{log.entityId || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Belum ada catatan audit.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 text-sm text-gray-600">
          <span>{totalCount} catatan</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40">Prev</button>
            <span>{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}
