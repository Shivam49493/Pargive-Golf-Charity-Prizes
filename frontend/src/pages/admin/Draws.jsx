import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { drawsApi } from '../../lib/api'
import { Card, Button, Badge, Select, Spinner, Empty, formatPence, formatDate } from '../components/ui'
import toast from 'react-hot-toast'

function DrawBall({ number }) {
  return (
    <div className="draw-ball draw-ball-winning text-sm w-9 h-9">
      {String(number).padStart(2, '0')}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = { pending: 'default', simulated: 'warning', published: 'success' }
  return <Badge variant={map[status] || 'default'} className="capitalize">{status}</Badge>
}

function SimulationPanel({ onSimulate }) {
  const [drawType, setDrawType] = useState('random')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const run = async () => {
    setLoading(true)
    try {
      const res = await onSimulate(drawType)
      setResult(res.simulation)
    } catch (err) {
      toast.error('Simulation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-dashed border-2 border-stone-300">
      <h3 className="font-medium text-stone-700 mb-3">Quick Simulation (no draw required)</h3>
      <div className="flex gap-3 items-end mb-4">
        <Select
          label="Draw type"
          value={drawType}
          onChange={e => setDrawType(e.target.value)}
          className="max-w-xs"
        >
          <option value="random">Random</option>
          <option value="algorithmic">Algorithmic (score-weighted)</option>
        </Select>
        <Button onClick={run} loading={loading} variant="secondary">Run simulation</Button>
      </div>

      {result && (
        <div className="bg-stone-50 rounded-xl p-4 space-y-3">
          <div>
            <p className="text-xs text-stone-400 mb-2">Simulated winning numbers</p>
            <div className="flex gap-1.5">
              {result.winning_numbers.map(n => <DrawBall key={n} number={n} />)}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-xs text-stone-400">5-match winners</p>
              <p className="font-serif text-xl">{result.five_match_count}</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-xs text-stone-400">4-match winners</p>
              <p className="font-serif text-xl">{result.four_match_count}</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-xs text-stone-400">3-match winners</p>
              <p className="font-serif text-xl">{result.three_match_count}</p>
            </div>
          </div>
          <div className="text-sm text-stone-600">
            <span className="font-medium">Estimated pool:</span> {formatPence(result.estimated_pools.total)} |
            Jackpot: {formatPence(result.estimated_pools.five_match)} |
            {result.jackpot_rolls_over && <span className="text-amber-600 font-medium"> Jackpot rolls over!</span>}
          </div>
        </div>
      )}
    </Card>
  )
}

function CreateDrawModal({ onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    draw_month: new Date().toISOString().split('T')[0].slice(0, 7) + '-01',
    draw_type: 'random',
    notes: ''
  })

  const createMutation = useMutation({
    mutationFn: drawsApi.adminCreate,
    onSuccess: () => {
      qc.invalidateQueries(['adminDraws'])
      toast.success('Draw created!')
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create draw')
  })

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <h2 className="font-medium text-stone-800 mb-5">Create new draw</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Draw month</label>
            <input
              type="month"
              value={form.draw_month.slice(0, 7)}
              onChange={e => setForm(p => ({ ...p, draw_month: e.target.value + '-01' }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
            />
          </div>
          <Select
            label="Draw type"
            value={form.draw_type}
            onChange={e => setForm(p => ({ ...p, draw_type: e.target.value }))}
          >
            <option value="random">Random</option>
            <option value="algorithmic">Algorithmic (weighted)</option>
          </Select>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none resize-none"
              placeholder="Admin notes..."
            />
          </div>
          <div className="flex gap-3">
            <Button onClick={() => createMutation.mutate(form)} loading={createMutation.isPending}>
              Create draw
            </Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

function DrawRow({ draw }) {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [winners, setWinners] = useState(null)

  const generateMutation = useMutation({
    mutationFn: () => drawsApi.adminGenerate(draw.id),
    onSuccess: (data) => {
      qc.invalidateQueries(['adminDraws'])
      toast.success(`Numbers generated: ${data.winning_numbers.join(', ')}`)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to generate')
  })

  const publishMutation = useMutation({
    mutationFn: () => drawsApi.adminPublish(draw.id),
    onSuccess: () => {
      qc.invalidateQueries(['adminDraws'])
      toast.success('Draw published!')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to publish')
  })

  const loadWinners = async () => {
    if (winners) { setExpanded(e => !e); return }
    const data = await drawsApi.adminGetWinners(draw.id)
    setWinners(data)
    setExpanded(true)
  }

  const drawMonth = new Date(draw.draw_month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <Card padding={false}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-stone-800">{drawMonth}</h3>
              <StatusBadge status={draw.status} />
              <Badge variant="default" className="capitalize">{draw.draw_type}</Badge>
            </div>
            {draw.notes && <p className="text-xs text-stone-400">{draw.notes}</p>}
          </div>
          <div className="text-right text-xs text-stone-400">
            {draw.published_at ? `Published ${formatDate(draw.published_at)}` : `Created ${formatDate(draw.created_at)}`}
          </div>
        </div>

        {draw.winning_numbers?.length > 0 && (
          <div className="flex gap-1.5 mb-4">
            {draw.winning_numbers.map(n => <DrawBall key={n} number={n} />)}
          </div>
        )}

        {draw.total_pool_pence > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-4 text-xs text-stone-500">
            <div><span className="block font-medium text-stone-700">{formatPence(draw.total_pool_pence)}</span>Total pool</div>
            <div><span className="block font-medium text-stone-700">{formatPence(draw.jackpot_pool_pence)}</span>Jackpot (40%)</div>
            <div><span className="block font-medium text-stone-700">{formatPence(draw.four_match_pool_pence)}</span>4-match (35%)</div>
            <div><span className="block font-medium text-stone-700">{formatPence(draw.three_match_pool_pence)}</span>3-match (25%)</div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {draw.status !== 'published' && (
            <Button size="sm" variant="secondary" loading={generateMutation.isPending} onClick={() => generateMutation.mutate()}>
              {draw.winning_numbers?.length ? 'Re-generate' : 'Generate numbers'}
            </Button>
          )}
          {draw.status === 'simulated' && (
            <Button size="sm" onClick={() => {
              if (confirm('Publish this draw? This cannot be undone.')) publishMutation.mutate()
            }} loading={publishMutation.isPending}>
              Publish results
            </Button>
          )}
          {draw.winning_numbers?.length > 0 && (
            <Button size="sm" variant="ghost" onClick={loadWinners}>
              {expanded ? 'Hide winners' : 'View winners'}
            </Button>
          )}
        </div>
      </div>

      {expanded && winners && (
        <div className="border-t border-stone-100 p-5">
          <h4 className="text-sm font-medium text-stone-700 mb-3">Winners ({winners.length})</h4>
          {!winners.length ? (
            <p className="text-sm text-stone-400">No winners for this draw</p>
          ) : (
            <div className="space-y-2">
              {winners.map(w => (
                <div key={w.id} className="flex items-center justify-between bg-stone-50 rounded-lg px-4 py-2.5">
                  <div>
                    <span className="text-sm font-medium text-stone-800">{w.profiles?.full_name || w.profiles?.email}</span>
                    <span className="text-xs text-stone-400 ml-2">{w.match_tier?.replace('_', '-')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{formatPence(w.prize_amount_pence)}</span>
                    <Badge variant={w.verification_status === 'approved' ? 'success' : w.verification_status === 'rejected' ? 'danger' : 'warning'}>
                      {w.verification_status}
                    </Badge>
                    <Badge variant={w.payment_status === 'paid' ? 'success' : 'default'}>
                      {w.payment_status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export default function AdminDraws() {
  const [showCreate, setShowCreate] = useState(false)
  const { data: draws, isLoading } = useQuery({
    queryKey: ['adminDraws'],
    queryFn: drawsApi.adminGetAll
  })

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-stone-900">Draw Management</h1>
          <p className="text-stone-500 text-sm mt-1">Create, simulate and publish monthly draws</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ New draw</Button>
      </div>

      <SimulationPanel onSimulate={drawsApi.adminSimulate} />

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : !draws?.length ? (
        <Card>
          <Empty icon="✦" title="No draws yet" description="Create your first monthly draw to get started." action={<Button onClick={() => setShowCreate(true)}>Create draw</Button>} />
        </Card>
      ) : (
        <div className="space-y-4">
          {draws.map(d => <DrawRow key={d.id} draw={d} />)}
        </div>
      )}

      {showCreate && <CreateDrawModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
