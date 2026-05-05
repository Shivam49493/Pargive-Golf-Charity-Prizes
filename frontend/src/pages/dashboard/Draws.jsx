import { useQuery } from '@tanstack/react-query'
import { drawsApi } from '../../lib/api'
import { Card, Badge, Spinner, Empty, formatPence, formatDate } from '../components/ui'

function DrawBall({ number, matched }) {
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-serif text-sm transition-all
      ${matched ? 'bg-green-400 text-white' : 'bg-stone-100 text-stone-500'}`}>
      {String(number).padStart(2, '0')}
    </div>
  )
}

function TierBadge({ tier }) {
  const map = {
    '5_match': { label: '5-match 🏆', variant: 'success' },
    '4_match': { label: '4-match ✦', variant: 'info' },
    '3_match': { label: '3-match ◈', variant: 'default' }
  }
  const t = map[tier]
  if (!t) return null
  return <Badge variant={t.variant}>{t.label}</Badge>
}

function PoolBar({ label, amount, total, color }) {
  const pct = total > 0 ? Math.round((amount / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-stone-500">{label}</span>
        <span className="font-medium text-stone-700">{formatPence(amount)}</span>
      </div>
      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function DrawsPage() {
  const { data: entries, isLoading } = useQuery({
    queryKey: ['myDrawEntries'],
    queryFn: drawsApi.getMyEntries
  })

  const { data: published } = useQuery({
    queryKey: ['publishedDraws'],
    queryFn: drawsApi.getPublished
  })

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl text-stone-900">Draw History</h1>
        <p className="text-stone-500 text-sm mt-1">Your participation across all monthly draws</p>
      </div>

      {/* Summary stats */}
      {entries?.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-stone-50 rounded-xl p-4 text-center">
            <p className="font-serif text-2xl text-stone-900">{entries.length}</p>
            <p className="text-xs text-stone-500 mt-0.5">Draws entered</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-4 text-center">
            <p className="font-serif text-2xl text-green-600">
              {entries.filter(e => e.match_tier).length}
            </p>
            <p className="text-xs text-stone-500 mt-0.5">Times won</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-4 text-center">
            <p className="font-serif text-2xl text-stone-900">
              {Math.max(...(entries.map(e => e.matches || 0)), 0)}
            </p>
            <p className="text-xs text-stone-500 mt-0.5">Best match</p>
          </div>
        </div>
      )}

      {/* Draw entries */}
      {!entries?.length ? (
        <Card>
          <Empty
            icon="✦"
            title="No draw entries yet"
            description="Once draws are published, your entries will appear here."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {entries.map(entry => {
            const draw = entry.draws
            const winner = entry.winners?.[0]
            const drawMonth = draw?.draw_month
              ? new Date(draw.draw_month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
              : 'Unknown'

            return (
              <Card key={entry.id} padding={false}>
                <div className="p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-medium text-stone-800">{drawMonth} Draw</h3>
                      {entry.match_tier && <TierBadge tier={entry.match_tier} />}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-stone-400">Matches</p>
                      <p className="font-serif text-xl text-stone-900">{entry.matches}</p>
                    </div>
                  </div>

                  {/* Winning numbers vs my numbers */}
                  {draw?.winning_numbers && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-stone-400 mb-1.5">Winning numbers</p>
                        <div className="flex gap-1.5">
                          {draw.winning_numbers.map(n => (
                            <DrawBall
                              key={n}
                              number={n}
                              matched={entry.entry_numbers?.includes(n)}
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-stone-400 mb-1.5">Your entry</p>
                        <div className="flex gap-1.5">
                          {entry.entry_numbers?.map(n => (
                            <div
                              key={n}
                              className={`w-9 h-9 rounded-full flex items-center justify-center font-serif text-sm border
                                ${draw.winning_numbers.includes(n)
                                  ? 'border-green-400 text-green-600 bg-green-50'
                                  : 'border-stone-200 text-stone-500 bg-white'
                                }`}
                            >
                              {String(n).padStart(2, '0')}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Winner info */}
                  {winner && (
                    <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-stone-400">Prize amount</p>
                        <p className="font-medium text-stone-800">{formatPence(winner.prize_amount_pence)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={winner.verification_status === 'approved' ? 'success' : winner.verification_status === 'rejected' ? 'danger' : 'warning'}>
                          {winner.verification_status}
                        </Badge>
                        <Badge variant={winner.payment_status === 'paid' ? 'success' : 'default'}>
                          {winner.payment_status}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Prize pool breakdown for latest draw */}
      {published?.[0] && (
        <Card>
          <h2 className="font-medium text-stone-800 mb-4">Latest draw prize pool breakdown</h2>
          <div className="space-y-3">
            <PoolBar
              label="Jackpot (5-match • 40%)"
              amount={published[0].jackpot_pool_pence}
              total={published[0].total_pool_pence}
              color="bg-green-400"
            />
            <PoolBar
              label="4-match • 35%"
              amount={published[0].four_match_pool_pence}
              total={published[0].total_pool_pence}
              color="bg-blue-400"
            />
            <PoolBar
              label="3-match • 25%"
              amount={published[0].three_match_pool_pence}
              total={published[0].total_pool_pence}
              color="bg-stone-300"
            />
          </div>
          <div className="mt-4 pt-4 border-t border-stone-100 flex justify-between text-sm">
            <span className="text-stone-500">Total pool</span>
            <span className="font-medium">{formatPence(published[0].total_pool_pence)}</span>
          </div>
        </Card>
      )}
    </div>
  )
}
