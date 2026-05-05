import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { subscriptionsApi } from '../../lib/api'
import { Card, Badge, Spinner, Empty, formatDate, formatPence } from '../components/ui'

export default function AdminSubscriptions() {
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['adminSubscriptions', statusFilter, page],
    queryFn: () => subscriptionsApi.adminGetAll({ status: statusFilter || undefined, page, limit: 30 })
  })

  const statusVariant = { active: 'success', inactive: 'default', cancelled: 'danger', lapsed: 'warning', past_due: 'danger' }
  const statuses = ['', 'active', 'inactive', 'cancelled', 'lapsed', 'past_due']

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl text-stone-900">Subscriptions</h1>
        <p className="text-stone-500 text-sm mt-1">All subscriber billing records</p>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all
              ${statusFilter === s ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
            {s || 'All'}
          </button>
        ))}
        {data?.total && <span className="text-sm text-stone-400 self-center ml-2">{data.total} results</span>}
      </div>

      <Card padding={false}>
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : !data?.subscriptions?.length ? (
          <div className="p-6"><Empty icon="◉" title="No subscriptions found" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-100">
                  {['User', 'Plan', 'Status', 'Period end', 'Amount'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-stone-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.subscriptions.map(sub => (
                  <tr key={sub.id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-stone-800">{sub.profiles?.full_name || '—'}</p>
                      <p className="text-xs text-stone-400">{sub.profiles?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="default" className="capitalize">{sub.plan}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[sub.status] || 'default'} className="capitalize">{sub.status}</Badge>
                      {sub.cancel_at_period_end && <span className="text-xs text-amber-500 ml-1">cancels</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">{formatDate(sub.current_period_end)}</td>
                    <td className="px-4 py-3 text-sm font-medium">{formatPence(sub.monthly_amount_pence)}/mo</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data?.total > 30 && (
          <div className="flex justify-between items-center px-4 py-3 border-t border-stone-100">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
              className="text-sm text-stone-500 disabled:opacity-30">← Prev</button>
            <span className="text-xs text-stone-400">Page {page} of {Math.ceil(data.total / 30)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(data.total / 30)}
              className="text-sm text-stone-500 disabled:opacity-30">Next →</button>
          </div>
        )}
      </Card>
    </div>
  )
}
