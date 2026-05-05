import { Router } from 'express'
import supabaseAdmin from '../../config/supabase.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()

// GET /api/admin/stats — platform overview stats
router.get('/stats', requireAdmin, async (req, res) => {
  const [
    { count: totalUsers },
    { count: activeSubscribers },
    { data: draws },
    { data: winners },
    { data: charityPayouts }
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('draws').select('total_pool_pence').eq('status', 'published'),
    supabaseAdmin.from('winners').select('prize_amount_pence, payment_status'),
    supabaseAdmin.from('charity_payouts').select('amount_pence')
  ])

  const totalPrizePool = draws?.reduce((acc, d) => acc + (d.total_pool_pence || 0), 0) || 0
  const totalPaid = winners?.filter(w => w.payment_status === 'paid')
    .reduce((acc, w) => acc + (w.prize_amount_pence || 0), 0) || 0
  const pendingVerification = winners?.filter(w => w.verification_status === 'pending').length || 0
  const totalCharityDonated = charityPayouts?.reduce((acc, p) => acc + (p.amount_pence || 0), 0) || 0

  res.json({
    stats: {
      total_users: totalUsers,
      active_subscribers: activeSubscribers,
      total_prize_pool_pence: totalPrizePool,
      total_paid_out_pence: totalPaid,
      pending_verification: pendingVerification,
      total_charity_donated_pence: totalCharityDonated,
      total_draws: draws?.length || 0
    }
  })
})

// GET /api/admin/users — paginated user list
router.get('/users', requireAdmin, async (req, res) => {
  const { page = 1, limit = 25, search, role } = req.query
  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('profiles')
    .select('*, subscriptions(status, plan, current_period_end)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  if (role) query = query.eq('role', role)

  const { data, error, count } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json({ users: data, total: count, page: parseInt(page), limit: parseInt(limit) })
})

// GET /api/admin/users/:id — single user detail
router.get('/users/:id', requireAdmin, async (req, res) => {
  const { data: user, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (error || !user) return res.status(404).json({ error: 'User not found' })

  const [
    { data: subscription },
    { data: scores },
    { data: charitySelection },
    { data: winnings },
    { data: drawEntries }
  ] = await Promise.all([
    supabaseAdmin.from('subscriptions').select('*').eq('user_id', req.params.id).single(),
    supabaseAdmin.from('golf_scores').select('*').eq('user_id', req.params.id).order('score_date', { ascending: false }).limit(5),
    supabaseAdmin.from('user_charities').select('*, charities(name)').eq('user_id', req.params.id).eq('is_active', true).single(),
    supabaseAdmin.from('winners').select('*').eq('user_id', req.params.id),
    supabaseAdmin.from('draw_entries').select('*, draws(draw_month)').eq('user_id', req.params.id).order('created_at', { ascending: false }).limit(10)
  ])

  res.json({ user, subscription, scores, charitySelection, winnings, drawEntries })
})

// PUT /api/admin/users/:id — update user
router.put('/users/:id', requireAdmin, async (req, res) => {
  const allowed = ['full_name', 'phone', 'role']
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ user: data })
})

// GET /api/admin/winners — all winners pending verification
router.get('/winners', requireAdmin, async (req, res) => {
  const { status = 'pending', draw_id } = req.query

  let query = supabaseAdmin
    .from('winners')
    .select('*, profiles(full_name, email), draws(draw_month, winning_numbers)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('verification_status', status)
  if (draw_id) query = query.eq('draw_id', draw_id)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json({ winners: data })
})

export default router
