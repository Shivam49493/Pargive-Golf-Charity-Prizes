import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { subscriptionsApi } from '../lib/api'
import { Button } from '../pages/components/ui'
import toast from 'react-hot-toast'

const FEATURES = [
  'Monthly draw entry',
  'Score tracking (5-score rolling window)',
  'Charity contribution (min 10%)',
  'Draw history & match details',
  'Winner verification portal',
  'Prize pool participation'
]

const YEARLY_EXTRAS = [
  'All monthly features',
  '25% saving vs monthly',
  'Priority draw entry status',
  'Yearly performance report',
  'Early access to new charities'
]

export default function PricingPage() {
  const { user, isSubscribed } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(null)

  const handleSubscribe = async (plan) => {
    if (!user) { navigate('/auth/register'); return }
    setLoading(plan)
    try {
      const { url } = await subscriptionsApi.createCheckout(plan)
      window.location.href = url
    } catch (err) {
      toast.error('Could not start checkout. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-stone-200 bg-white">
        <a href="/" className="font-serif text-xl text-stone-900">par<span className="text-green-400">give</span></a>
        <div className="flex items-center gap-4">
          {user ? (
            <a href="/dashboard" className="text-sm text-stone-600 hover:text-stone-900">Dashboard →</a>
          ) : (
            <a href="/auth/login" className="text-sm text-stone-600 hover:text-stone-900">Sign in</a>
          )}
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <p className="text-xs font-medium uppercase tracking-widest text-green-400 mb-3">Pricing</p>
          <h1 className="font-serif text-5xl text-stone-900 mb-4">Simple, honest pricing</h1>
          <p className="text-stone-500 max-w-md mx-auto">
            Every pound works — part goes to prizes, part goes to your charity, part keeps the platform running.
          </p>
        </div>

        {isSubscribed && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center mb-10">
            <p className="text-green-700 font-medium">You already have an active subscription!</p>
            <a href="/dashboard/settings" className="text-green-600 text-sm hover:underline">Manage your plan →</a>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {/* Monthly */}
          <div className="bg-white rounded-2xl border border-stone-200 p-8">
            <p className="text-sm text-stone-400 mb-2">Monthly</p>
            <div className="mb-1">
              <span className="font-serif text-5xl text-stone-900">£9</span>
              <span className="font-serif text-2xl text-stone-400">.99</span>
            </div>
            <p className="text-stone-400 text-sm mb-6">per month · cancel anytime</p>
            <ul className="space-y-3 mb-8">
              {FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-stone-600">
                  <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Button
              variant="secondary"
              className="w-full"
              size="lg"
              loading={loading === 'monthly'}
              onClick={() => handleSubscribe('monthly')}
              disabled={isSubscribed}
            >
              {isSubscribed ? 'Already subscribed' : 'Get started monthly'}
            </Button>
          </div>

          {/* Yearly */}
          <div className="bg-stone-900 rounded-2xl border border-stone-800 p-8 relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-green-400 text-white text-xs font-medium px-3 py-1 rounded-full">
              Best value
            </div>
            <p className="text-sm text-stone-400 mb-2">Yearly</p>
            <div className="mb-1">
              <span className="font-serif text-5xl text-white">£89</span>
              <span className="font-serif text-2xl text-stone-400">.99</span>
            </div>
            <p className="text-stone-500 text-sm mb-1">per year · that's £7.50/month</p>
            <p className="text-green-400 text-xs font-medium mb-6">Save £29.89 vs monthly billing</p>
            <ul className="space-y-3 mb-8">
              {YEARLY_EXTRAS.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-stone-300">
                  <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Button
              variant="primary"
              className="w-full"
              size="lg"
              loading={loading === 'yearly'}
              onClick={() => handleSubscribe('yearly')}
              disabled={isSubscribed}
            >
              {isSubscribed ? 'Already subscribed' : 'Subscribe yearly — best value'}
            </Button>
          </div>
        </div>

        {/* Where does the money go */}
        <div className="bg-white rounded-2xl border border-stone-200 p-8">
          <h2 className="font-serif text-2xl text-stone-900 mb-6 text-center">Where your money goes</h2>
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { pct: '80%', label: 'Prize pool', desc: 'Split across 5, 4 & 3 match tiers each month' },
              { pct: '10%', label: 'Your charity', desc: 'Goes directly to the cause you choose (you can increase this)' },
              { pct: '10%', label: 'Operations', desc: 'Platform costs, payment processing & support' }
            ].map(b => (
              <div key={b.label}>
                <p className="font-serif text-4xl text-green-400 mb-2">{b.pct}</p>
                <p className="font-medium text-stone-800 mb-1">{b.label}</p>
                <p className="text-xs text-stone-400 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="font-serif text-2xl text-stone-900 mb-8 text-center">Common questions</h2>
          <div className="space-y-4 max-w-2xl mx-auto">
            {[
              ['Can I cancel anytime?', 'Yes. Cancel from your dashboard at any time. You retain access until the end of your billing period.'],
              ['How does the jackpot rollover work?', 'If no subscriber matches all 5 numbers in a month, the jackpot carries forward and adds to next month\'s jackpot pool.'],
              ['How are winners verified?', 'Winners upload a screenshot from their golf platform as proof. Our admins review and approve or request more info.'],
              ['What is Stableford scoring?', 'Stableford is a golf scoring format based on points per hole. Scores range from 1–45 in our system.'],
              ['Can I change my charity?', 'Yes, you can switch your selected charity at any time from your dashboard.']
            ].map(([q, a]) => (
              <details key={q} className="group bg-white rounded-xl border border-stone-200 px-5">
                <summary className="py-4 text-sm font-medium text-stone-800 cursor-pointer list-none flex items-center justify-between">
                  {q}
                  <span className="text-stone-400 group-open:rotate-180 transition-transform">↓</span>
                </summary>
                <p className="pb-4 text-sm text-stone-500 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
