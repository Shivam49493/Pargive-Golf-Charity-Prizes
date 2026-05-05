import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'
import { authApi, subscriptionsApi } from '../../lib/api'
import { Card, Button, Input, Badge, formatDate } from '../components/ui'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user, subscription, refreshUser } = useAuth()
  const [form, setForm] = useState({ full_name: user?.full_name || '', phone: user?.phone || '' })
  const [portalLoading, setPortalLoading] = useState(false)

  const profileMutation = useMutation({
    mutationFn: (data) => authApi.updateProfile(data),
    onSuccess: () => { refreshUser(); toast.success('Profile updated') },
    onError: (err) => toast.error(err.response?.data?.error || 'Update failed')
  })

  const handleProfileSave = (e) => {
    e.preventDefault()
    profileMutation.mutate(form)
  }

  const handleBillingPortal = async () => {
    setPortalLoading(true)
    try {
      const { url } = await subscriptionsApi.createPortal()
      window.location.href = url
    } catch (err) {
      toast.error('Could not open billing portal')
    } finally {
      setPortalLoading(false)
    }
  }

  const subStatusVariant = {
    active: 'success', inactive: 'default', cancelled: 'danger',
    lapsed: 'warning', past_due: 'danger'
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <div>
        <h1 className="font-serif text-3xl text-stone-900">Settings</h1>
        <p className="text-stone-500 text-sm mt-1">Manage your profile and subscription</p>
      </div>

      {/* Profile */}
      <Card>
        <h2 className="font-medium text-stone-800 mb-5">Profile information</h2>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <Input
            label="Full name"
            value={form.full_name}
            onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Email address</label>
            <input
              disabled
              value={user?.email || ''}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm bg-stone-50 text-stone-400 cursor-not-allowed"
            />
            <p className="text-xs text-stone-400 mt-1">Email cannot be changed here. Contact support.</p>
          </div>
          <Input
            label="Phone (optional)"
            type="tel"
            value={form.phone}
            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            placeholder="+44 7700 000000"
          />
          <Button type="submit" loading={profileMutation.isPending}>Save changes</Button>
        </form>
      </Card>

      {/* Subscription */}
      <Card>
        <h2 className="font-medium text-stone-800 mb-5">Subscription & billing</h2>
        {subscription ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-stone-50 rounded-xl p-4">
                <p className="text-xs text-stone-400 mb-1">Status</p>
                <Badge variant={subStatusVariant[subscription.status] || 'default'} className="capitalize">
                  {subscription.status}
                </Badge>
              </div>
              <div className="bg-stone-50 rounded-xl p-4">
                <p className="text-xs text-stone-400 mb-1">Plan</p>
                <p className="text-sm font-medium capitalize">{subscription.plan}</p>
              </div>
              <div className="bg-stone-50 rounded-xl p-4">
                <p className="text-xs text-stone-400 mb-1">
                  {subscription.cancel_at_period_end ? 'Cancels on' : 'Renews on'}
                </p>
                <p className="text-sm font-medium">{formatDate(subscription.current_period_end)}</p>
              </div>
              <div className="bg-stone-50 rounded-xl p-4">
                <p className="text-xs text-stone-400 mb-1">Monthly value</p>
                <p className="text-sm font-medium">
                  {subscription.plan === 'yearly' ? '£7.50' : '£9.99'}
                </p>
              </div>
            </div>
            {subscription.cancel_at_period_end && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-700 font-medium">Your subscription is set to cancel</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  You'll retain access until {formatDate(subscription.current_period_end)}.
                  Reactivate via the billing portal.
                </p>
              </div>
            )}
            <Button
              variant="secondary"
              loading={portalLoading}
              onClick={handleBillingPortal}
            >
              Manage billing & cancel →
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-stone-500 text-sm mb-4">No active subscription</p>
            <a href="/pricing">
              <Button>Subscribe now</Button>
            </a>
          </div>
        )}
      </Card>

      {/* Account */}
      <Card>
        <h2 className="font-medium text-stone-800 mb-2">Account</h2>
        <p className="text-xs text-stone-400 mb-4">Danger zone — these actions cannot be undone.</p>
        <Button
          variant="ghost"
          className="text-red-400 hover:text-red-600 hover:bg-red-50 border border-red-200"
          onClick={() => toast.error('Please contact support to delete your account.')}
        >
          Request account deletion
        </Button>
      </Card>
    </div>
  )
}
