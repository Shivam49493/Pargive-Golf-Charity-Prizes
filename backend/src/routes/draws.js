import { Router } from 'express'
import supabaseAdmin from '../../config/supabase.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { validate, createDrawSchema, publishDrawSchema } from '../middleware/validate.js'
import { generateWinningNumbers, processDraw, simulateDraw } from '../services/drawEngine.js'

const router = Router()

// ── PUBLIC / USER ROUTES ─────────────────────────────────────────────────────

// GET /api/draws — list published draws
router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('draws')
    .select('id, draw_month, winning_numbers, total_pool_pence, jackpot_pool_pence, four_match_pool_pence, three_match_pool_pence, published_at, status')
    .eq('status', 'published')
    .order('draw_month', { ascending: false })
    .limit(12)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ draws: data })
})

// GET /api/draws/latest — latest published draw + current user's entry
router.get('/latest', requireAuth, async (req, res) => {
  const { data: draw } = await supabaseAdmin
    .from('draws')
    .select('*')
    .eq('status', 'published')
    .order('draw_month', { ascending: false })
    .limit(1)
    .single()

  if (!draw) return res.json({ draw: null, entry: null })

  const { data: entry } = await supabaseAdmin
    .from('draw_entries')
    .select('*, winners(*)')
    .eq('draw_id', draw.id)
    .eq('user_id', req.user.id)
    .single()

  res.json({ draw, entry: entry || null })
})

// GET /api/draws/:id — single draw details
router.get('/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('draws')
    .select('*')
    .eq('id', req.params.id)
    .eq('status', 'published')
    .single()

  if (error || !data) return res.status(404).json({ error: 'Draw not found' })
  res.json({ draw: data })
})

// GET /api/draws/my/entries — current user's draw history
router.get('/my/entries', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('draw_entries')
    .select('*, draws(draw_month, winning_numbers, status), winners(match_tier, prize_amount_pence, verification_status, payment_status)')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ entries: data })
})

// GET /api/draws/my/winnings — current user's winnings
router.get('/my/winnings', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('winners')
    .select('*, draws(draw_month)')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ winnings: data })
})

// PUT /api/draws/winners/:winnerId/proof — upload proof URL
router.put('/winners/:winnerId/proof', requireAuth, async (req, res) => {
  const { proof_url } = req.body
  if (!proof_url) return res.status(400).json({ error: 'proof_url required' })

  const { data: winner } = await supabaseAdmin
    .from('winners')
    .select('user_id, verification_status')
    .eq('id', req.params.winnerId)
    .single()

  if (!winner) return res.status(404).json({ error: 'Winner record not found' })
  if (winner.user_id !== req.user.id) return res.status(403).json({ error: 'Not your record' })
  if (winner.verification_status === 'approved') {
    return res.status(400).json({ error: 'Already verified' })
  }

  const { data, error } = await supabaseAdmin
    .from('winners')
    .update({ proof_url, verification_status: 'pending' })
    .eq('id', req.params.winnerId)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ winner: data })
})

// ── ADMIN ROUTES ─────────────────────────────────────────────────────────────

// GET /api/draws/admin/all — all draws including pending
router.get('/admin/all', requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('draws')
    .select('*')
    .order('draw_month', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ draws: data })
})

// POST /api/draws/admin — create a new draw
router.post('/admin', requireAdmin, validate(createDrawSchema), async (req, res) => {
  const { draw_month, draw_type, notes } = req.validated.body

  const { data: existing } = await supabaseAdmin
    .from('draws')
    .select('id')
    .eq('draw_month', draw_month)
    .single()

  if (existing) return res.status(409).json({ error: 'Draw for this month already exists' })

  // Check for rollover from previous month
  const prevMonth = new Date(draw_month)
  prevMonth.setMonth(prevMonth.getMonth() - 1)
  const prevMonthStr = prevMonth.toISOString().substring(0, 10)

  const { data: prevDraw } = await supabaseAdmin
    .from('draws')
    .select('jackpot_rollover_pence')
    .eq('draw_month', prevMonthStr)
    .single()

  const rollover = prevDraw?.jackpot_rollover_pence || 0

  const { data, error } = await supabaseAdmin
    .from('draws')
    .insert({ draw_month, draw_type, notes, jackpot_rollover_pence: rollover })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ draw: data })
})

// POST /api/draws/admin/simulate — run simulation without persisting
router.post('/admin/simulate', requireAdmin, async (req, res) => {
  const { draw_type = 'random' } = req.body
  try {
    const result = await simulateDraw(draw_type)
    res.json({ simulation: result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/draws/admin/:drawId/generate — generate winning numbers
router.post('/admin/:drawId/generate', requireAdmin, async (req, res) => {
  const { data: draw } = await supabaseAdmin
    .from('draws')
    .select('draw_type, status')
    .eq('id', req.params.drawId)
    .single()

  if (!draw) return res.status(404).json({ error: 'Draw not found' })
  if (draw.status === 'published') return res.status(400).json({ error: 'Cannot modify published draw' })

  const winningNumbers = await generateWinningNumbers(draw.draw_type)

  await supabaseAdmin
    .from('draws')
    .update({ winning_numbers: winningNumbers, status: 'simulated' })
    .eq('id', req.params.drawId)

  // Process entries
  const result = await processDraw(req.params.drawId)

  res.json({ winning_numbers: winningNumbers, result })
})

// POST /api/draws/admin/:drawId/publish — publish draw results
router.post('/admin/:drawId/publish', requireAdmin, async (req, res) => {
  const { data: draw } = await supabaseAdmin
    .from('draws')
    .select('status, winning_numbers')
    .eq('id', req.params.drawId)
    .single()

  if (!draw) return res.status(404).json({ error: 'Draw not found' })
  if (draw.status === 'published') return res.status(400).json({ error: 'Already published' })
  if (!draw.winning_numbers?.length) return res.status(400).json({ error: 'Generate numbers first' })

  const { data, error } = await supabaseAdmin
    .from('draws')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', req.params.drawId)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ draw: data })
})

// GET /api/draws/admin/:drawId/winners — all winners for a draw
router.get('/admin/:drawId/winners', requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('winners')
    .select('*, profiles(full_name, email), draws(draw_month)')
    .eq('draw_id', req.params.drawId)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ winners: data })
})

// PUT /api/draws/admin/winners/:winnerId/verify — verify a winner
router.put('/admin/winners/:winnerId/verify', requireAdmin, async (req, res) => {
  const { verification_status, admin_notes } = req.body
  if (!['approved', 'rejected'].includes(verification_status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }

  const { data, error } = await supabaseAdmin
    .from('winners')
    .update({
      verification_status,
      admin_notes,
      verified_at: new Date().toISOString()
    })
    .eq('id', req.params.winnerId)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ winner: data })
})

// PUT /api/draws/admin/winners/:winnerId/payment — mark as paid
router.put('/admin/winners/:winnerId/payment', requireAdmin, async (req, res) => {
  const { payment_status } = req.body
  if (!['pending', 'paid'].includes(payment_status)) {
    return res.status(400).json({ error: 'Invalid payment status' })
  }

  const { data, error } = await supabaseAdmin
    .from('winners')
    .update({
      payment_status,
      paid_at: payment_status === 'paid' ? new Date().toISOString() : null
    })
    .eq('id', req.params.winnerId)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ winner: data })
})

export default router
