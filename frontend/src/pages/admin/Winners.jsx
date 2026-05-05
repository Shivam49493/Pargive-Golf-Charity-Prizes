import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { drawsApi, adminApi } from '../../lib/api'
import { Card, Button, Badge, Select, Spinner, Empty, formatPence, formatDate } from '../components/ui'
import toast from 'react-hot-toast'

function WinnerRow({ winner }) {
  const qc = useQueryClient()
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)

  const verifyMutation = useMutation({
    mutationFn: ({ status, notes }) => drawsApi.adminVerifyWinner(winner.id, { verification_status: status, admin_notes: notes }),
    onSuccess: () => {
      qc.invalidateQueries(['adminWinners'])
      toast.success('Winner updated')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Action failed')
  })

  const payMutation = useMutation({
    mutationFn: (status) => drawsApi.adminUpdatePayment(winner.id, status),
    onSuccess: () => {
      qc.invalidateQueries(['adminWinners'])
      toast.success('Payment status updated')
    },
    onError: () => toast.error('Failed to update payment')
  })

  const tierLabel = { '5_match': '5-Match 🏆', '4_match': '4-Match ✦', '3_match': '3-Match ◈' }
  const drawMonth = winner.draws?.draw_month
    ? new Date(winner.draws.draw_month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : '—'

  return (
    <Card padding={false}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-medium text-stone-800">{winner.profiles?.full_name || '—'}</span>
              <Badge variant="default">{tierLabel[winner.match_tier]}</Badge>
              <Badge variant={winner.verification_status === 'approved' ? 'success' : winner.verification_status === 'rejected' ? 'danger' : 'warning'}>
                {winner.verification_status}
              </Badge>
              <Badge variant={winner.payment_status === 'paid' ? 'success' : 'default'}>
                {winner.payment_status}
              </Badge>
            </div>
            <p className="text-xs text-stone-400">{winner.profiles?.email} · {drawMonth}</p>
            {winner.admin_notes && (
              <p className="text-xs text-amber-600 mt-1">Note: {winner.admin_notes}</p>
            )}
          </div>
          <div className="text-right">
            <p className="font-serif text-2xl text-stone-900">{formatPence(winner.prize_amount_pence)}</p>
            <p className="text-xs text-stone-400">prize</p>
          </div>
        </div>

        {/* Proof */}
        <div className="bg-stone-50 rounded-xl p-4 mb-4">
          <p className="text-xs font-medium text-stone-500 mb-2">Proof of scores</p>
          {winner.proof_url ? (
            <a
              href={winner.proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-green-600 hover:underline break-all"
            >
              {winner.proof_url}
            </a>
          ) : (
            <p className="text-sm text-stone-400 italic">No proof submitted yet</p>
          )}
        </div>

        {/* Winning numbers */}
        {winner.draws?.winning_numbers && (
          <div className="mb-4">
            <p className="text-xs text-stone-400 mb-1.5">Draw winning numbers</p>
            <div className="flex gap-1.5">
              {winner.draws.winning_numbers.map(n => (
                <div key={n} className="w-8 h-8 rounded-full bg-stone-800 text-white flex items-center justify-center font-serif text-sm">
                  {String(n).padStart(2, '0')}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {winner.verification_status === 'pending' && (
            <>
              <Button
                size="sm"
                onClick={() => verifyMutation.mutate({ status: 'approved', notes })}
                loading={verifyMutation.isPending}
              >
                ✓ Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:bg-red-50"
                onClick={() => setShowNotes(s => !s)}
              >
                ✗ Reject
              </Button>
            </>
          )}

          {winner.verification_status === 'approved' && winner.payment_status === 'pending' && (
            <Button
              size="sm"
              variant="dark"
              onClick={() => payMutation.mutate('paid')}
              loading={payMutation.isPending}
            >
              Mark as paid
            </Button>
          )}

          {winner.verification_status === 'approved' && winner.payment_status === 'paid' && (
            <span className="text-xs text-green-600 font-medium">✓ Paid on {formatDate(winner.paid_at)}</span>
          )}
        </div>

        {showNotes && (
          <div className="mt-3 space-y-2">
            <input
              type="text"
              placeholder="Rejection reason (optional)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-red-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-100"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="danger"
                onClick={() => { verifyMutation.mutate({ status: 'rejected', notes }); setShowNotes(false) }}
                loading={verifyMutation.isPending}
              >
                Confirm rejection
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNotes(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export default function AdminWinners() {
  const [statusFilter, setStatusFilter] = useState('pending')

  const { data: winners, isLoading } = useQuery({
    queryKey: ['adminWinners', statusFilter],
    queryFn: () => adminApi.getWinners({ status: statusFilter || undefined })
  })

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-stone-900">Winners</h1>
          <p className="text-stone-500 text-sm mt-1">Verify proof submissions and manage payouts</p>
        </div>
      </div>

      <div className="flex gap-2">
        {['pending', 'approved', 'rejected', ''].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all
              ${statusFilter === s
                ? 'bg-stone-900 text-white'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : !winners?.length ? (
        <Card>
          <Empty
            icon="◈"
            title={`No ${statusFilter} winners`}
            description="Winners will appear here after draws are published."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {winners.map(w => <WinnerRow key={w.id} winner={w} />)}
        </div>
      )}
    </div>
  )
}
