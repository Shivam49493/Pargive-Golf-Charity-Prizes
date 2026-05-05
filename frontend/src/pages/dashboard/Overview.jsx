import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { drawsApi, scoresApi } from '../../lib/api'
import { Card, StatCard, Badge, Button, Spinner, formatPence, formatDate } from '../components/ui'

function DrawBall({ number, matched }) {
  return (
    <div className={`draw-ball text-sm ${matched ? 'draw-ball-matched' : 'draw-ball-unmatched'}`}>
      {String(number).padStart(2, '0')}
    </div>
  )
}

export default function DashboardOverview() {
  const { user, subscription, charitySelection, isSubscribed } = useAuth()

  const { data: latestDraw, isLoading: drawLoading } = useQuery({
    queryKey: ['latestDraw'],
    queryFn: drawsApi.getLatest,
    enabled: !!user
  })

  const { data: scores } = useQuery({
    queryKey: ['myScores'],
    queryFn: scoresApi.getAll,
    enabled: isSubscribed
  })

  const { data: winnings } = useQuery({
    queryKey: ['myWinnings'],
    queryFn: drawsApi.getMyWinnings,
    enabled: isSubscribed
  })

  const renewalDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const totalWon = winnings?.filter(w => w.verification_status === 'approved')
    .reduce((acc, w) => acc + w.prize_amount_pence, 0) || 0

  const pendingWinnings = winnings?.filter(w => w.verification_status === 'pending') || []

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl text-stone-900">
          Good day, {user?.full_name?.split(' ')[0] || 'there'} 👋
        </h1>
        <p className="text-stone-500 text-sm mt-1">Here's your Pargive snapshot</p>
      </div>

      {/* Subscription alert if inactive */}
      {!isSubscribed && (
        <Card className="bg-stone-900 text-white border-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium mb-1">You don't have an active subscription</h3>
              <p className="text-stone-400 text-sm">Subscribe to enter monthly draws, track scores and support your charity.</p>
            </div>
            <Button as={Link} to="/pricing" variant="primary" className="ml-6 flex-shrink-0">
              <Link to="/pricing" className="text-white no-underline">Subscribe now</Link>
            </Button>
          </div>
        </Card>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Subscription"
          value={subscription?.status === 'active' ? 'Active' : 'Inactive'}
          sub={renewalDate ? `Renews ${renewalDate}` : undefined}
        />
        <StatCard
          label="Scores logged"
          value={scores?.length || 0}
          sub="out of 5 max"
        />
        <StatCard
          label="Total won"
          value={formatPence(totalWon)}
          sub="all time"
        />
        <StatCard
          label="Charity"
          value={charitySelection?.charities?.name || 'Not selected'}
          sub={charitySelection ? `${charitySelection.contribution_percentage}% of plan` : 'Choose below'}
        />
      </div>

      {/* Latest draw */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-medium text-stone-800">Latest draw</h2>
            <Link to="/dashboard/draws" className="text-xs text-green-600 hover:underline">View all →</Link>
          </div>

          {drawLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : !latestDraw?.draw ? (
            <p className="text-stone-400 text-sm py-4">No published draws yet</p>
          ) : (
            <div>
              <p className="text-xs text-stone-400 mb-3">
                {new Date(latestDraw.draw.draw_month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </p>
              <div className="flex gap-2 mb-5">
                {latestDraw.draw.winning_numbers?.map(n => {
                  const matched = latestDraw.entry?.entry_numbers?.includes(n)
                  return <DrawBall key={n} number={n} matched={matched} />
                })}
              </div>

              {latestDraw.entry ? (
                <div>
                  <p className="text-xs text-stone-500 mb-1">Your numbers: {latestDraw.entry.entry_numbers?.join(', ')}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-stone-800">{latestDraw.entry.matches} matches</span>
                    {latestDraw.entry.match_tier && (
                      <Badge variant="success">Winner!</Badge>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-stone-400">You weren't entered in this draw</p>
              )}

              <div className="mt-4 pt-4 border-t border-stone-100 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-stone-400">Prize pool</p>
                  <p className="text-sm font-medium mt-0.5">{formatPence(latestDraw.draw.total_pool_pence)}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400">Jackpot (5x)</p>
                  <p className="text-sm font-medium mt-0.5">{formatPence(latestDraw.draw.jackpot_pool_pence)}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400">Published</p>
                  <p className="text-sm font-medium mt-0.5">{formatDate(latestDraw.draw.published_at)}</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Score snapshot */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-medium text-stone-800">My scores</h2>
            <Link to="/dashboard/scores" className="text-xs text-green-600 hover:underline">Manage →</Link>
          </div>

          {!isSubscribed ? (
            <p className="text-stone-400 text-sm">Subscribe to enter scores</p>
          ) : !scores?.length ? (
            <div className="text-center py-6">
              <p className="text-stone-400 text-sm mb-3">No scores yet</p>
              <Link to="/dashboard/scores">
                <Button size="sm">Add your first score</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {scores.map((s, i) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-stone-400 w-4">{i + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center font-serif text-green-700 text-sm">
                      {s.score}
                    </div>
                    <span className="text-sm text-stone-600">{formatDate(s.score_date)}</span>
                  </div>
                  {i === 0 && <Badge variant="success">Latest</Badge>}
                </div>
              ))}
              <p className="text-xs text-stone-400 pt-1">Last 5 scores • most recent first</p>
            </div>
          )}
        </Card>
      </div>

      {/* Pending winnings alert */}
      {pendingWinnings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <span className="text-amber-500 text-lg mt-0.5">⚠</span>
            <div>
              <h3 className="font-medium text-amber-800 mb-1">You have {pendingWinnings.length} pending win{pendingWinnings.length > 1 ? 's' : ''}</h3>
              <p className="text-amber-700 text-sm mb-3">Upload proof of your scores to claim your prize.</p>
              <Link to="/dashboard/winnings">
                <Button size="sm" variant="dark">View & claim →</Button>
              </Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
