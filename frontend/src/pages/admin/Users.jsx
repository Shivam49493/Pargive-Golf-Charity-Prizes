import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, subscriptionsApi } from '../../lib/api'
import { Card, Button, Badge, Input, Spinner, Empty, formatDate } from '../components/ui'
import toast from 'react-hot-toast'

function UserRow({ user, onClick }) {
  const sub = user.subscriptions?.[0]
  const statusVariant = { active: 'success', inactive: 'default', cancelled: 'danger', lapsed: 'warning', past_due: 'danger' }

  return (
    <tr
      onClick={onClick}
      className="border-b border-stone-100 hover:bg-stone-50 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-medium flex-shrink-0">
            {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-stone-800">{user.full_name || '—'}</p>
            <p className="text-xs text-stone-400">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge variant={user.role === 'admin' ? 'warning' : 'default'}>{user.role}</Badge>
      </td>
      <td className="px-4 py-3">
        {sub ? (
          <div>
            <Badge variant={statusVariant[sub.status] || 'default'} className="capitalize">{sub.status}</Badge>
            <span className="text-xs text-stone-400 ml-2 capitalize">{sub.plan}</span>
          </div>
        ) : (
          <span className="text-xs text-stone-400">No subscription</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-stone-400">{formatDate(user.created_at)}</td>
    </tr>
  )
}

function UserDetailModal({ userId, onClose }) {
  const qc = useQueryClient()
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({})

  const { data, isLoading } = useQuery({
    queryKey: ['adminUser', userId],
    queryFn: () => adminApi.getUser(userId),
    onSuccess: (d) => setForm({ full_name: d.user.full_name || '', role: d.user.role })
  })

  const updateMutation = useMutation({
    mutationFn: (updates) => adminApi.updateUser(userId, updates),
    onSuccess: () => {
      qc.invalidateQueries(['adminUser', userId])
      qc.invalidateQueries(['adminUsers'])
      toast.success('User updated')
      setEditMode(false)
    }
  })

  const subMutation = useMutation({
    mutationFn: ({ status }) => subscriptionsApi.adminUpdate(userId, { status }),
    onSuccess: () => {
      qc.invalidateQueries(['adminUser', userId])
      toast.success('Subscription updated')
    }
  })

  if (isLoading) return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <Spinner size="lg" />
    </div>
  )

  const { user, subscription, scores, charitySelection, winnings, drawEntries } = data || {}

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h2 className="font-medium text-stone-900">{user?.full_name || user?.email}</h2>
            <p className="text-xs text-stone-400">{user?.email} · joined {formatDate(user?.created_at)}</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Profile edit */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-stone-700">Profile</h3>
              <Button size="sm" variant="ghost" onClick={() => setEditMode(e => !e)}>
                {editMode ? 'Cancel' : 'Edit'}
              </Button>
            </div>
            {editMode ? (
              <div className="space-y-3">
                <Input label="Full name" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Role</label>
                  <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none">
                    <option value="subscriber">subscriber</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
                <Button size="sm" loading={updateMutation.isPending} onClick={() => updateMutation.mutate(form)}>
                  Save changes
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-stone-400">Name:</span> {user?.full_name || '—'}</div>
                <div><span className="text-stone-400">Role:</span> <Badge variant={user?.role === 'admin' ? 'warning' : 'default'}>{user?.role}</Badge></div>
                <div><span className="text-stone-400">Phone:</span> {user?.phone || '—'}</div>
              </div>
            )}
          </div>

          {/* Subscription */}
          {subscription && (
            <div>
              <h3 className="text-sm font-medium text-stone-700 mb-3">Subscription</h3>
              <div className="bg-stone-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500">Status</span>
                  <Badge variant={subscription.status === 'active' ? 'success' : 'danger'} className="capitalize">{subscription.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Plan</span>
                  <span className="capitalize">{subscription.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Renews</span>
                  <span>{formatDate(subscription.current_period_end)}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {subscription.status !== 'active' && (
                  <Button size="sm" variant="secondary" onClick={() => subMutation.mutate({ status: 'active' })}>
                    Activate
                  </Button>
                )}
                {subscription.status === 'active' && (
                  <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50"
                    onClick={() => subMutation.mutate({ status: 'cancelled' })}>
                    Cancel subscription
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Scores */}
          <div>
            <h3 className="text-sm font-medium text-stone-700 mb-3">Golf scores</h3>
            {scores?.length ? (
              <div className="flex gap-2 flex-wrap">
                {scores.map(s => (
                  <div key={s.id} className="bg-green-50 rounded-lg px-3 py-2 text-center">
                    <p className="font-serif text-lg text-green-700">{s.score}</p>
                    <p className="text-xs text-stone-400">{formatDate(s.score_date)}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-stone-400">No scores</p>}
          </div>

          {/* Charity */}
          {charitySelection && (
            <div>
              <h3 className="text-sm font-medium text-stone-700 mb-2">Charity</h3>
              <p className="text-sm text-stone-600">
                {charitySelection.charities?.name} · {charitySelection.contribution_percentage}%
              </p>
            </div>
          )}

          {/* Winnings summary */}
          {winnings?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-stone-700 mb-3">Winnings ({winnings.length})</h3>
              <div className="space-y-2">
                {winnings.map(w => (
                  <div key={w.id} className="flex justify-between text-sm bg-stone-50 rounded-lg px-3 py-2">
                    <span>{w.match_tier?.replace('_', '-')}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{w.prize_amount_pence ? `£${(w.prize_amount_pence / 100).toFixed(2)}` : '—'}</span>
                      <Badge variant={w.verification_status === 'approved' ? 'success' : 'warning'}>
                        {w.verification_status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminUsers() {
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['adminUsers', search, page],
    queryFn: () => adminApi.getUsers({ search: search || undefined, page, limit: 25 })
  })

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl text-stone-900">Users</h1>
        <p className="text-stone-500 text-sm mt-1">Manage all platform accounts</p>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="max-w-sm"
        />
        {data?.total && (
          <p className="text-sm text-stone-400 self-end">{data.total} users</p>
        )}
      </div>

      <Card padding={false}>
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : !data?.users?.length ? (
          <div className="p-6"><Empty icon="◑" title="No users found" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-400 uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-400 uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-400 uppercase tracking-wide">Subscription</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-400 uppercase tracking-wide">Joined</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map(u => (
                  <UserRow key={u.id} user={u} onClick={() => setSelectedUser(u.id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data?.total > 25 && (
          <div className="flex justify-between items-center px-4 py-3 border-t border-stone-100">
            <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
            <span className="text-xs text-stone-400">Page {page} of {Math.ceil(data.total / 25)}</span>
            <Button size="sm" variant="ghost" disabled={page >= Math.ceil(data.total / 25)} onClick={() => setPage(p => p + 1)}>Next →</Button>
          </div>
        )}
      </Card>

      {selectedUser && <UserDetailModal userId={selectedUser} onClose={() => setSelectedUser(null)} />}
    </div>
  )
}
