import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { createCheckoutSession, createPortalSession, handleWebhook } from '../services/stripeService.js'
import supabaseAdmin from '../../config/supabase.js'
import express from 'express'

const router = Router()

// POST /api/subscriptions/checkout — create Stripe checkout session
router.post('/checkout', requireAuth, async (req, res) => {
  const { plan } = req.body
  if (!['monthly', 'yearly'].includes(plan)) {
    return res.status(400).json({ error: 'Plan must be monthly or yearly' })
  }

  try {
    const session = await createCheckoutSession(req.user.id, req.user.email, plan)
    res.json(session)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/subscriptions/portal — billing portal
router.post('/portal', requireAuth, async (req, res) => {
  try {
    const session = await createPortalSession(req.user.id)
    res.json(session)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/subscriptions/status — check subscription status
router.get('/status', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', req.user.id)
    .single()

  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message })
  res.json({ subscription: data || null })
})

// POST /api/subscriptions/webhook — Stripe webhook (raw body needed)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  try {
    const result = await handleWebhook(req.body, sig)
    res.json(result)
  } catch (err) {
    console.error('Webhook error:', err.message)
    res.status(400).json({ error: err.message })
  }
})

// ── ADMIN ────────────────────────────────────────────────────────────────────

// GET /api/subscriptions/admin/all
router.get('/admin/all', requireAdmin, async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query
  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('subscriptions')
    .select('*, profiles(full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)

  const { data, error, count } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json({ subscriptions: data, total: count, page: parseInt(page), limit: parseInt(limit) })
})

// PUT /api/subscriptions/admin/:userId — manually update subscription
router.put('/admin/:userId', requireAdmin, async (req, res) => {
  const { status, plan } = req.body
  const allowed = {}
  if (status) allowed.status = status
  if (plan) allowed.plan = plan

  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .update(allowed)
    .eq('user_id', req.params.userId)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ subscription: data })
})

export default router
