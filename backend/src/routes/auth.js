import { Router } from 'express'
import { supabaseAdmin } from '../../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const { profile } = req.user

  // Include subscription status
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('status, plan, current_period_end, cancel_at_period_end')
    .eq('user_id', profile.id)
    .single()

  // Include active charity selection
  const { data: charitySelection } = await supabaseAdmin
    .from('user_charities')
    .select('contribution_percentage, charities(id, name, slug, logo_url)')
    .eq('user_id', profile.id)
    .eq('is_active', true)
    .single()

  res.json({
    user: {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      avatar_url: profile.avatar_url
    },
    subscription: subscription || null,
    charity_selection: charitySelection || null
  })
})

// PUT /api/auth/profile
router.put('/profile', requireAuth, async (req, res) => {
  const { full_name, phone, avatar_url } = req.body
  const allowedFields = {}
  if (full_name !== undefined) allowedFields.full_name = full_name
  if (phone !== undefined) allowedFields.phone = phone
  if (avatar_url !== undefined) allowedFields.avatar_url = avatar_url

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(allowedFields)
    .eq('id', req.user.id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json({ user: data })
})

export default router
