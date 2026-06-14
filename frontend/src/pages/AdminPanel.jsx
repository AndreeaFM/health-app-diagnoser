import { useState, useEffect, useCallback } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import Layout from '../components/Layout'
import { api } from '../api'

const BAR_COLORS = [
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#F59E0B',
  '#10B981',
]
const ROLE_COLORS = {
  patient: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
  doctor:
    'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400',
  admin: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
}

function StatCard({ label, value, sub, color = 'default' }) {
  const colors = {
    default: 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800',
    blue: 'bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-800',
    green:
      'bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-800',
    purple:
      'bg-purple-50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-800',
  }
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        {value}
      </p>
      {sub && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
      )}
    </div>
  )
}

function RoleBadge({ role }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        ROLE_COLORS[role] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {role}
    </span>
  )
}

function StatusDot({ active }) {
  return (
    <span
      className={`inline-flex w-2 h-2 rounded-full ${
        active ? 'bg-green-400' : 'bg-gray-300'
      }`}
    />
  )
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 max-w-sm w-full">
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
          {message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 transition"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminPanel() {
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [actionMsg, setActionMsg] = useState('')
  // Verification tab
  const [pendingDoctors, setPendingDoctors] = useState([])
  const [verifLoading, setVerifLoading] = useState(false)
  const [rejectModal, setRejectModal] = useState(null) // { userId, name }
  const [rejectReason, setRejectReason] = useState('')
  // Audit log tab
  const [auditLogs, setAuditLogs] = useState([])
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditPage, setAuditPage] = useState(1)
  const [auditPages, setAuditPages] = useState(1)
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditFilter, setAuditFilter] = useState('')

  // Load platform stats
  useEffect(() => {
    api
      .get('/api/admin/stats')
      .then((d) => setStats(d))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  // Load users
  const fetchUsers = useCallback(
    async (p = 1) => {
      setUsersLoading(true)
      try {
        const params = new URLSearchParams({ page: p, limit: 15 })
        if (search) params.set('search', search)
        if (roleFilter) params.set('role', roleFilter)
        const data = await api.get(`/api/admin/users?${params}`)
        setUsers(data.users)
        setTotal(data.total)
        setPage(data.page)
        setPages(data.pages)
      } catch (err) {
        console.error(err)
      } finally {
        setUsersLoading(false)
      }
    },
    [search, roleFilter],
  )

  useEffect(() => {
    if (tab === 'users') fetchUsers(1)
  }, [tab, fetchUsers])

  // Load pending verifications
  useEffect(() => {
    if (tab !== 'verification') return
    setVerifLoading(true)
    api
      .get('/api/admin/verification/pending')
      .then((d) => setPendingDoctors(d.pending || []))
      .catch((err) => console.error(err))
      .finally(() => setVerifLoading(false))
  }, [tab])

  // Load audit logs
  const fetchAuditLogs = useCallback(
    async (p = 1) => {
      setAuditLoading(true)
      try {
        const params = new URLSearchParams({ page: p, limit: 20 })
        if (auditFilter) params.set('action', auditFilter)
        const data = await api.get(`/api/admin/audit-log?${params}`)
        setAuditLogs(data.logs)
        setAuditTotal(data.total)
        setAuditPage(data.page)
        setAuditPages(data.pages)
      } catch (err) {
        console.error(err)
      } finally {
        setAuditLoading(false)
      }
    },
    [auditFilter],
  )

  useEffect(() => {
    if (tab === 'audit') fetchAuditLogs(1)
  }, [tab, fetchAuditLogs])

  const flash = (msg) => {
    setActionMsg(msg)
    setTimeout(() => setActionMsg(''), 3000)
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.patch(`/api/admin/users/${userId}/role`, { role: newRole })
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)),
      )
      flash(`Role updated to ${newRole}`)
    } catch (err) {
      flash('Error: ' + err.message)
    }
  }

  const handleStatusToggle = async (userId, currentStatus) => {
    const newStatus = !currentStatus
    const action = newStatus ? 'activate' : 'deactivate'
    setConfirm({
      message: `Are you sure you want to ${action} this account?`,
      onConfirm: async () => {
        setConfirm(null)
        try {
          await api.patch(`/api/admin/users/${userId}/status`, {
            isActive: newStatus,
          })
          setUsers((prev) =>
            prev.map((u) =>
              u._id === userId ? { ...u, isActive: newStatus } : u,
            ),
          )
          flash(`Account ${action}d`)
        } catch (err) {
          flash('Error: ' + err.message)
        }
      },
    })
  }

  const handleDelete = (userId, userName) => {
    setConfirm({
      message: `Permanently delete ${userName} and all their data? This cannot be undone.`,
      onConfirm: async () => {
        setConfirm(null)
        try {
          await api.delete(`/api/admin/users/${userId}`)
          setUsers((prev) => prev.filter((u) => u._id !== userId))
          setTotal((prev) => prev - 1)
          flash('User deleted')
        } catch (err) {
          flash('Error: ' + err.message)
        }
      },
    })
  }

  const handleApproveDoctor = async (userId) => {
    try {
      await api.patch(`/api/admin/verification/${userId}/approve`, {})
      setPendingDoctors((prev) => prev.filter((u) => u._id !== userId))
      flash('Doctor approved')
    } catch (err) {
      flash('Error: ' + err.message)
    }
  }

  const handleRejectDoctor = async () => {
    if (!rejectModal) return
    try {
      await api.patch(`/api/admin/verification/${rejectModal.userId}/reject`, {
        reason: rejectReason,
      })
      setPendingDoctors((prev) =>
        prev.filter((u) => u._id !== rejectModal.userId),
      )
      setRejectModal(null)
      setRejectReason('')
      flash('Doctor rejected')
    } catch (err) {
      flash('Error: ' + err.message)
    }
  }

  return (
    <Layout>
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Admin panel
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Platform overview and user management
          </p>
        </div>

        {/* Action message */}
        {actionMsg && (
          <div className="mb-4 px-4 py-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-400">
            {actionMsg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6 w-fit flex-wrap">
          {['overview', 'users', 'verification', 'audit'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition capitalize flex items-center gap-1.5 ${
                tab === t
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t === 'verification' && pendingDoctors.length > 0 && (
                <span className="w-4 h-4 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {pendingDoctors.length}
                </span>
              )}
              {t}
            </button>
          ))}
        </div>

        {/* ── Overview tab ── */}
        {tab === 'overview' && (
          <>
            {loading ? (
              <div className="grid grid-cols-4 gap-4 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 animate-pulse"
                  >
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2 mb-3" />
                    <div className="h-7 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : (
              stats && (
                <>
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <StatCard
                      label="Total users"
                      value={stats.totalUsers}
                      sub={`+${stats.newUsersThisWeek} this week`}
                      color="blue"
                    />
                    <StatCard
                      label="Patients"
                      value={stats.totalPatients}
                      sub="active accounts"
                    />
                    <StatCard
                      label="Doctors"
                      value={stats.totalDoctors}
                      sub="with access"
                      color="purple"
                    />
                    <StatCard
                      label="Total entries"
                      value={stats.totalEntries}
                      sub={`+${stats.newEntriesThisWeek} this week`}
                      color="green"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <StatCard
                      label="Active share links"
                      value={stats.activeShares}
                      sub="patient–doctor shares"
                    />
                    <StatCard
                      label="Admins"
                      value={stats.totalAdmins}
                      sub="platform admins"
                    />
                  </div>

                  {/* Activity chart */}
                  {stats.activityOverTime?.length > 0 && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mb-6">
                      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Daily entries — last 14 days
                      </h2>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart
                          data={stats.activityOverTime}
                          margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f3f4f6"
                          />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(s) =>
                              new Date(s).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                              })
                            }
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            allowDecimals={false}
                          />
                          <Tooltip
                            formatter={(v) => [v, 'entries']}
                            contentStyle={{
                              fontSize: 12,
                              borderRadius: 8,
                              border: '1px solid #e5e7eb',
                            }}
                          />
                          <Bar
                            dataKey="count"
                            fill="#3B82F6"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Top symptoms platform-wide */}
                  {stats.topSymptoms?.length > 0 && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Top symptoms platform-wide
                      </h2>
                      <ResponsiveContainer
                        width="100%"
                        height={Math.max(120, stats.topSymptoms.length * 34)}
                      >
                        <BarChart
                          data={stats.topSymptoms}
                          layout="vertical"
                          margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f3f4f6"
                            horizontal={false}
                          />
                          <XAxis
                            type="number"
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            allowDecimals={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={130}
                            tick={{ fontSize: 12, fill: '#374151' }}
                          />
                          <Tooltip
                            formatter={(v) => [v, 'occurrences']}
                            contentStyle={{ fontSize: 12, borderRadius: 8 }}
                          />
                          <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                            {stats.topSymptoms.map((_, i) => (
                              <Cell
                                key={i}
                                fill={BAR_COLORS[i % BAR_COLORS.length]}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              )
            )}
          </>
        )}

        {/* ── Users tab ── */}
        {tab === 'users' && (
          <>
            {/* Search + filter */}
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  <path
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchUsers(1)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-400 transition"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value)
                  fetchUsers(1)
                }}
                className="px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-400"
              >
                <option value="">All roles</option>
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={() => fetchUsers(1)}
                className="px-4 py-2.5 text-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl hover:bg-gray-700 dark:hover:bg-gray-300 transition"
              >
                Search
              </button>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              {total} users total
            </p>

            {usersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 animate-pulse"
                  >
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div
                    key={u._id}
                    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-semibold text-gray-600 dark:text-gray-400 shrink-0">
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {u.name}
                            </p>
                            <RoleBadge role={u.role} />
                            <StatusDot active={u.isActive} />
                            {!u.isActive && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                Deactivated
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                            {u.email}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {u.entryCount} entries · joined{' '}
                            {new Date(u.createdAt).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Role change */}
                        <select
                          value={u.role}
                          onChange={(e) =>
                            handleRoleChange(u._id, e.target.value)
                          }
                          className="text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
                        >
                          <option value="patient">Patient</option>
                          <option value="doctor">Doctor</option>
                          <option value="admin">Admin</option>
                        </select>

                        {/* Toggle active */}
                        <button
                          onClick={() => handleStatusToggle(u._id, u.isActive)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border transition ${
                            u.isActive
                              ? 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-amber-300 hover:text-amber-600'
                              : 'border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950'
                          }`}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(u._id, u.name)}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => fetchUsers(page - 1)}
                  disabled={page <= 1}
                  className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Page {page} of {pages}
                </span>
                <button
                  onClick={() => fetchUsers(page + 1)}
                  disabled={page >= pages}
                  className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Verification tab ── */}
        {tab === 'verification' && (
          <>
            <div className="mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Users who have requested the doctor role. Review their details
                before approving.
              </p>
            </div>

            {/* Reject reason modal */}
            {rejectModal && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 max-w-sm w-full">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Reject {rejectModal.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Optionally provide a reason (shown to user):
                  </p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    placeholder="e.g. License number could not be verified"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setRejectModal(null)
                        setRejectReason('')
                      }}
                      className="flex-1 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRejectDoctor}
                      className="flex-1 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 transition"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            )}

            {verifLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 animate-pulse"
                  >
                    <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : pendingDoctors.length === 0 ? (
              <div className="text-center py-14 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No pending verification requests
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Requests appear here when users apply for the doctor role
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingDoctors.map((u) => (
                  <div
                    key={u._id}
                    className="bg-white dark:bg-gray-900 rounded-2xl border border-amber-200 dark:border-amber-800 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {u.name}
                          </p>
                          <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-full">
                            Pending
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {u.email}
                        </p>
                        <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
                          <div>
                            <p className="text-gray-400 dark:text-gray-500">
                              Specialization
                            </p>
                            <p className="font-medium text-gray-700 dark:text-gray-300">
                              {u.doctorInfo?.specialization || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 dark:text-gray-500">
                              License no.
                            </p>
                            <p className="font-medium text-gray-700 dark:text-gray-300">
                              {u.doctorInfo?.licenseNumber || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 dark:text-gray-500">
                              Hospital
                            </p>
                            <p className="font-medium text-gray-700 dark:text-gray-300">
                              {u.doctorInfo?.hospital || '—'}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                          Requested{' '}
                          {new Date(
                            u.doctorVerification?.requestedAt,
                          ).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleApproveDoctor(u._id)}
                          className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            setRejectModal({ userId: u._id, name: u.name })
                          }
                          className="px-3 py-1.5 text-xs border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Audit log tab ── */}
        {tab === 'audit' && (
          <>
            <div className="flex gap-3 mb-4 flex-wrap">
              <select
                value={auditFilter}
                onChange={(e) => {
                  setAuditFilter(e.target.value)
                  fetchAuditLogs(1)
                }}
                className="px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-400"
              >
                <option value="">All actions</option>
                <option value="doctor_viewed_patient">
                  Doctor viewed patient
                </option>
                <option value="doctor_added_note">Doctor added note</option>
                <option value="doctor_prescribed_medication">
                  Medication prescribed
                </option>
                <option value="share_created">Share created</option>
                <option value="share_revoked">Share revoked</option>
                <option value="admin_role_changed">Role changed</option>
                <option value="doctor_verification_approved">
                  Doctor approved
                </option>
                <option value="doctor_verification_rejected">
                  Doctor rejected
                </option>
                <option value="admin_user_deleted">User deleted</option>
              </select>
              <button
                onClick={() => fetchAuditLogs(1)}
                className="px-4 py-2.5 text-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl hover:bg-gray-700 dark:hover:bg-gray-300 transition"
              >
                Filter
              </button>
              <p className="text-xs text-gray-400 dark:text-gray-500 self-center ml-auto">
                {auditTotal} events total
              </p>
            </div>

            {auditLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 animate-pulse"
                  >
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3 mb-2" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-14 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No audit events yet
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Events are recorded automatically as users take actions
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => {
                  const actionLabels = {
                    doctor_viewed_patient: 'viewed patient records',
                    doctor_added_note: 'added a clinical note',
                    doctor_prescribed_medication: 'prescribed a medication',
                    share_created: 'created a share link',
                    share_revoked: 'revoked a share link',
                    share_accepted: 'accepted a share link',
                    admin_role_changed: 'changed user role',
                    admin_user_deactivated: 'deactivated account',
                    admin_user_activated: 'activated account',
                    admin_user_deleted: 'deleted user',
                    doctor_verification_requested:
                      'requested doctor verification',
                    doctor_verification_approved: 'approved doctor',
                    doctor_verification_rejected: 'rejected doctor',
                    insight_dismissed: 'dismissed health insight',
                    insight_acted_on: 'acted on health insight',
                  }
                  const roleColors = {
                    admin:
                      'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
                    doctor:
                      'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400',
                    patient:
                      'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
                  }
                  return (
                    <div
                      key={log._id}
                      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[log.actorRole] || ''}`}
                            >
                              {log.actorRole}
                            </span>
                            <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                              {log.actorName}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {actionLabels[log.action] || log.action}
                            </span>
                            {log.targetName && (
                              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                {log.targetName}
                              </span>
                            )}
                          </div>
                          {log.metadata &&
                            Object.keys(log.metadata).length > 0 && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                {Object.entries(log.metadata)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(' · ')}
                              </p>
                            )}
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                          {new Date(log.createdAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {auditPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => fetchAuditLogs(auditPage - 1)}
                  disabled={auditPage <= 1}
                  className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Page {auditPage} of {auditPages}
                </span>
                <button
                  onClick={() => fetchAuditLogs(auditPage + 1)}
                  disabled={auditPage >= auditPages}
                  className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
