import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './hooks/useAuth'
import { RequireAuth, RequireAdmin, GuestOnly } from '../src/pages/components/Guards'
import AppLayout from '../src/pages/components/layout/AppLayout'
import { LoginPage, RegisterPage } from './pages/Auth'
import PricingPage from './pages/Pricing'
import DashboardOverview from './pages/dashboard/Overview'
import ScoresPage from './pages/dashboard/Scores'
import DrawsPage from './pages/dashboard/Draws'
import WinningsPage from './pages/dashboard/Winnings'
import CharityPage from './pages/dashboard/Charity'
import SettingsPage from './pages/dashboard/Settings'
import AdminOverview from './pages/admin/Overview'
import AdminDraws from './pages/admin/Draws'
import AdminWinners from './pages/admin/Winners'
import AdminUsers from './pages/admin/Users'
import AdminCharities from './pages/admin/Charities'
import AdminSubscriptions from './pages/admin/Subscriptions'
import './styles/globals.css'

const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 }
  }
})

// Minimal public homepage — redirect to proper homepage or show landing
function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-center">
        <h1 className="font-serif text-6xl text-stone-900 mb-4">
          par<span className="text-green-400">give</span>
        </h1>
        <p className="text-stone-500 mb-8">Golf · Charity · Prizes</p>
        <div className="flex gap-4 justify-center">
          <a href="/pricing" className="bg-green-400 text-white rounded-full px-6 py-3 text-sm font-medium hover:bg-green-600 transition-colors">
            Get started
          </a>
          <a href="/auth/login" className="bg-white border border-stone-200 rounded-full px-6 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors">
            Sign in
          </a>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { fontFamily: 'DM Sans, sans-serif', fontSize: '14px', borderRadius: '12px' }
            }}
          />
          <Routes>
            {/* Public */}
            <Route path="/" element={<HomePage />} />
            <Route path="/pricing" element={<PricingPage />} />

            {/* Auth */}
            <Route path="/auth/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
            <Route path="/auth/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />

            {/* User dashboard */}
            <Route path="/dashboard" element={<RequireAuth><AppLayout /></RequireAuth>}>
              <Route index element={<DashboardOverview />} />
              <Route path="scores" element={<ScoresPage />} />
              <Route path="draws" element={<DrawsPage />} />
              <Route path="winnings" element={<WinningsPage />} />
              <Route path="charity" element={<CharityPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Admin */}
            <Route path="/admin" element={<RequireAdmin><AppLayout admin /></RequireAdmin>}>
              <Route index element={<AdminOverview />} />
              <Route path="draws" element={<AdminDraws />} />
              <Route path="winners" element={<AdminWinners />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="charities" element={<AdminCharities />} />
              <Route path="subscriptions" element={<AdminSubscriptions />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
