import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Spinner } from './ui'

export function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>
  if (!user) return <Navigate to={`/auth/login?redirect=${location.pathname}`} replace />
  return children
}

export function RequireAdmin({ children }) {
  const { user, isAdmin, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>
  if (!user) return <Navigate to={`/auth/login?redirect=${location.pathname}`} replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

export function RequireSubscription({ children }) {
  const { isSubscribed, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>
  if (!isSubscribed) return <Navigate to="/pricing" replace />
  return children
}

export function GuestOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>
  if (user) return <Navigate to="/dashboard" replace />
  return children
}
