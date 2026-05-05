import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { drawsApi } from '../../lib/api'
import { Card, Badge, Button, Spinner, Empty, formatPence, formatDate } from '../components/ui'
import toast from 'react-hot-toast'

function ProofUploader({ winner, onSuccess }) {
  const qc = useQueryClient()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!url.trim()) { toast.error('Please enter a screenshot URL'); return }
    setLoading(true)
    try {
      await drawsApi.uploadProof(winner.id, url.trim())
      qc.invalidateQueries(['myWinnings'])
      toast.success('Proof submitted for review!')
      onSuccess?.()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit proof')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-amber-200">
      <p className="text-xs font-medium text-amber-800 mb-3">
        Upload a screenshot URL from your golf platform showing these scores
      </p>
      <div className="flex gap-2">
        <input
          type="url"
          placeholder="https://... (screenshot URL)"
          value={url}
          onChange={e => setUrl(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
        />
        <Button type="submit" loading={loading} size="sm">Submit</Button>
      </div>
      <p className="text-xs text-stone-400 mt-2">
        Upload your screenshot to an image host (e.g. Imgur, Cloudinary) and paste the URL here.
      </p>
    </form>
  )
}

function WinnerCard({ winner }) {
  const [showUploader, setShowUploader] = useState(false)
  const tierLabel = { '5_match': '5-Number Match 🏆', '4_match': '4-Number Match ✦', '3_match': '3-Number Match ◈' }
  const verStatus = winner.verification_status
  const payStatus = winner.payment_status

  return (
    <Card className={verStatus === 'approved' ? 'border-green-200' : verStatus === 'rejected' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-medium text-stone-800">{tierLabel[winner.match_tier]}</h3>
          <p className="text-xs text-stone-400 mt-0.5">
            {winner.draws?.draw_month
              ? new Date(winner.draws.draw_month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
              : formatDate(winner.created_at)}
          </p>
        </div>
        <p className="font-serif text-2xl text-stone-900">{formatPence(winner.prize_amount_pence)}</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <Badge variant={verStatus === 'approved' ? 'success' : verStatus === 'rejected' ? 'danger' : 'warning'}>
          Verification: {verStatus}
        </Badge>
        <Badge variant={payStatus === 'paid' ? 'success' : 'default'}>
          Payment: {payStatus}
        </Badge>
      </div>

      {verStatus === 'pending' && !winner.proof_url && (
        <div>
          <p className="text-sm text-amber-700 mb-2">
            ⚠ You need to submit proof of your scores to claim this prize.
          </p>
          <Button size="sm" variant="dark" onClick={() => setShowUploader(s => !s)}>
            {showUploader ? 'Cancel' : 'Upload proof'}
          </Button>
          {showUploader && <ProofUploader winner={winner} onSuccess={() => setShowUploader(false)} />}
        </div>
      )}

      {winner.proof_url && verStatus === 'pending' && (
        <p className="text-xs text-stone-500">
          ✓ Proof submitted — awaiting admin review
        </p>
      )}

      {verStatus === 'rejected' && (
        <div>
          <p className="text-sm text-red-600 mb-2">
            Your proof was rejected.{winner.admin_notes ? ` Reason: ${winner.admin_notes}` : ''}
          </p>
          <Button size="sm" variant="danger" onClick={() => setShowUploader(s => !s)}>
            Resubmit proof
          </Button>
          {showUploader && <ProofUploader winner={winner} onSuccess={() => setShowUploader(false)} />}
        </div>
      )}

      {verStatus === 'approved' && payStatus === 'pending' && (
        <p className="text-sm text-green-600">✓ Verified — payment being processed</p>
      )}

      {verStatus === 'approved' && payStatus === 'paid' && (
        <p className="text-sm text-green-600">✓ Paid on {formatDate(winner.paid_at)}</p>
      )}
    </Card>
  )
}

export default function WinningsPage() {
  const { data: winnings, isLoading } = useQuery({
    queryKey: ['myWinnings'],
    queryFn: drawsApi.getMyWinnings
  })

  const totalApproved = winnings?.filter(w => w.verification_status === 'approved')
    .reduce((acc, w) => acc + w.prize_amount_pence, 0) || 0
  const totalPaid = winnings?.filter(w => w.payment_status === 'paid')
    .reduce((acc, w) => acc + w.prize_amount_pence, 0) || 0

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl text-stone-900">Winnings</h1>
        <p className="text-stone-500 text-sm mt-1">Your prize history and payment status</p>
      </div>

      {winnings?.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-stone-50 rounded-xl p-4">
            <p className="text-xs text-stone-500 mb-1">Total wins</p>
            <p className="font-serif text-2xl">{winnings.length}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-xs text-stone-500 mb-1">Verified total</p>
            <p className="font-serif text-2xl text-green-700">{formatPence(totalApproved)}</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-4">
            <p className="text-xs text-stone-500 mb-1">Paid out</p>
            <p className="font-serif text-2xl">{formatPence(totalPaid)}</p>
          </div>
        </div>
      )}

      {!winnings?.length ? (
        <Card>
          <Empty
            icon="◈"
            title="No winnings yet"
            description="Keep entering draws — your time will come!"
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {winnings.map(w => <WinnerCard key={w.id} winner={w} />)}
        </div>
      )}
    </div>
  )
}
