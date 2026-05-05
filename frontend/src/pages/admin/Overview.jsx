import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminApi } from '../../lib/api'
import { Card, Spinner, formatPence } from '../components/ui'

function StatTile({ label, value, sub, accent, to }) {
  const inner = (
    <div className={`rounded-2xl p-5 border transition-all ${accent ? 'bg-stone-900 border-stone-800 text-white' : 'bg-white border-stone-200 hover:border-stone-300'}`}>
      <p className={`text-xs font-medium uppercase tracking-wide mb-3 ${accent ? 'text-stone-400' : 'text-stone-400'}`}>{label}</p>
      <p className={`font-serif text-3xl ${accent ? 'text-green-400' : 'text-stone-900'}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? 'text-stone-500' : 'text-stone-400'}`}>{sub}</p>}
    </div>
  )
  return to ? <Link to={to} className="block">{inner}</Link> : inner
}

export default function AdminOverview() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: adminApi.getStats
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <p className="text-xs font-medium text-amber-500 uppercase tracking-widest mb-1">Admin</p>
        <h1 className="font-serif text-3xl text-stone-900">Platform Overview</h1>
        <p className="text-stone-500 text-sm mt-1">Live stats across all Pargive operations</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label="Total users"
          value={stats?.total_users?.toLocaleString() || '0'}
          to="/admin/users"
          accent
        />
        <StatTile
          label="Active subscribers"
          value={stats?.active_subscribers?.toLocaleString() || '0'}
          sub={`of ${stats?.total_users || 0} total`}
          to="/admin/subscriptions"
        />
        <StatTile
          label="Total prize pool"
          value={formatPence(stats?.total_prize_pool_pence || 0)}
          sub="across all draws"
        />
        <StatTile
          label="Charity donated"
          value={formatPence(stats?.total_charity_donated_pence || 0)}
          sub="total contributed"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatTile
          label="Total draws"
          value={stats?.total_draws || '0'}
          to="/admin/draws"
        />
        <StatTile
          label="Total paid out"
          value={formatPence(stats?.total_paid_out_pence || 0)}
          sub="to winners"
        />
        <StatTile
          label="Pending verification"
          value={stats?.pending_verification || '0'}
          sub="winners awaiting review"
          to="/admin/winners"
          accent={stats?.pending_verification > 0}
        />
      </div>

      {/* Quick actions */}
      <Card>
        <h2 className="font-medium text-stone-800 mb-4">Quick actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: '/admin/draws', icon: '✦', label: 'Manage draws', desc: 'Run simulations & publish' },
            { to: '/admin/winners', icon: '◈', label: 'Verify winners', desc: `${stats?.pending_verification || 0} pending` },
            { to: '/admin/users', icon: '◑', label: 'Manage users', desc: 'Profiles & subscriptions' },
            { to: '/admin/charities', icon: '♥', label: 'Manage charities', desc: 'Add, edit, feature' }
          ].map(a => (
            <Link
              key={a.to}
              to={a.to}
              className="block rounded-xl border border-stone-200 p-4 hover:border-stone-300 hover:bg-stone-50 transition-all"
            >
              <div className="text-2xl mb-2">{a.icon}</div>
              <p className="text-sm font-medium text-stone-800">{a.label}</p>
              <p className="text-xs text-stone-400 mt-0.5">{a.desc}</p>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}
