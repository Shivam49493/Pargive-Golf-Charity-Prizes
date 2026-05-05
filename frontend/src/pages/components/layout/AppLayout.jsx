import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import toast from 'react-hot-toast'

const NAV_LINKS = [
  { to: '/dashboard', icon: '◎', label: 'Overview', end: true },
  { to: '/dashboard/scores', icon: '⛳', label: 'My Scores' },
  { to: '/dashboard/draws', icon: '✦', label: 'Draw History' },
  { to: '/dashboard/winnings', icon: '◈', label: 'Winnings' },
  { to: '/dashboard/charity', icon: '♥', label: 'My Charity' },
  { to: '/dashboard/settings', icon: '◉', label: 'Settings' }
]

const ADMIN_LINKS = [
  { to: '/admin', icon: '◎', label: 'Overview', end: true },
  { to: '/admin/users', icon: '◑', label: 'Users' },
  { to: '/admin/draws', icon: '✦', label: 'Draws' },
  { to: '/admin/winners', icon: '◈', label: 'Winners' },
  { to: '/admin/charities', icon: '♥', label: 'Charities' },
  { to: '/admin/subscriptions', icon: '◉', label: 'Subscriptions' }
]

function NavItem({ to, icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all
        ${isActive
          ? 'bg-green-50 text-green-600 font-medium'
          : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
        }`
      }
    >
      <span className="text-base w-5 text-center">{icon}</span>
      {label}
    </NavLink>
  )
}

export default function AppLayout({ admin = false }) {
  const { user, subscription, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const links = admin ? ADMIN_LINKS : NAV_LINKS

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out')
    navigate('/')
  }

  return (
    <div className="min-h-screen flex bg-stone-50">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-stone-200 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-stone-100">
          <NavLink to="/" className="font-serif text-lg text-stone-900">
            par<span className="text-green-400">give</span>
          </NavLink>
          {admin && (
            <span className="ml-2 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">admin</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {links.map(link => <NavItem key={link.to} {...link} />)}
        </nav>

        {/* Subscription status */}
        {!admin && (
          <div className="p-3 border-t border-stone-100">
            <div className={`rounded-xl p-3 text-xs ${subscription?.status === 'active'
              ? 'bg-green-50 text-green-700'
              : 'bg-stone-100 text-stone-500'
            }`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`w-1.5 h-1.5 rounded-full pulse-dot ${subscription?.status === 'active' ? 'bg-green-500' : 'bg-stone-400'}`} />
                <span className="font-medium capitalize">{subscription?.status || 'No plan'}</span>
              </div>
              {subscription?.plan && (
                <span className="capitalize">{subscription.plan} plan</span>
              )}
            </div>
          </div>
        )}

        {/* User footer */}
        <div className="p-3 border-t border-stone-100">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-medium">
              {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-stone-800 truncate">{user?.full_name || 'User'}</p>
              <p className="text-xs text-stone-400 truncate">{user?.email}</p>
            </div>
          </div>
          {isAdmin && !admin && (
            <NavLink to="/admin" className="flex items-center gap-2 px-3 py-2 text-xs text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
              ⚡ Admin panel
            </NavLink>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-stone-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            ↪ Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
