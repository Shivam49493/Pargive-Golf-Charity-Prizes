import { Router } from 'express'
import supabaseAdmin from '../../config/supabase.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { validate, charitySelectionSchema, createCharitySchema } from '../middleware/validate.js'

const router = Router()

// GET /api/charities — list all active charities
router.get('/', async (req, res) => {
  const { search, category, featured } = req.query

  let query = supabaseAdmin
    .from('charities')
    .select('id, name, slug, description, logo_url, image_url, category, is_featured')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('name')

  if (search) query = query.ilike('name', `%${search}%`)
  if (category) query = query.eq('category', category)
  if (featured === 'true') query = query.eq('is_featured', true)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json({ charities: data })
})

// GET /api/charities/categories — distinct categories
router.get('/categories', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('charities')
    .select('category')
    .eq('is_active', true)
    .not('category', 'is', null)

  if (error) return res.status(500).json({ error: error.message })
  const categories = [...new Set(data.map(r => r.category))].sort()
  res.json({ categories })
})

// GET /api/charities/:slug — single charity
router.get('/:slug', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('charities')
    .select('*, charity_events(*)')
    .eq('slug', req.params.slug)
    .eq('is_active', true)
    .single()

  if (error || !data) return res.status(404).json({ error: 'Charity not found' })
  res.json({ charity: data })
})

// POST /api/charities/select — user selects a charity
router.post('/select', requireAuth, validate(charitySelectionSchema), async (req, res) => {
  const { charity_id, contribution_percentage } = req.validated.body

  // Verify charity exists
  const { data: charity } = await supabaseAdmin
    .from('charities')
    .select('id')
    .eq('id', charity_id)
    .eq('is_active', true)
    .single()

  if (!charity) return res.status(404).json({ error: 'Charity not found' })

  // Deactivate previous selection
  await supabaseAdmin
    .from('user_charities')
    .update({ is_active: false })
    .eq('user_id', req.user.id)
    .eq('is_active', true)

  // Insert new selection
  const { data, error } = await supabaseAdmin
    .from('user_charities')
    .insert({
      user_id: req.user.id,
      charity_id,
      contribution_percentage,
      is_active: true
    })
    .select('*, charities(id, name, slug, logo_url)')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ selection: data })
})

// GET /api/charities/my/selection — get user's active selection
router.get('/my/selection', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('user_charities')
    .select('*, charities(*)')
    .eq('user_id', req.user.id)
    .eq('is_active', true)
    .single()

  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message })
  res.json({ selection: data || null })
})

// ── ADMIN ────────────────────────────────────────────────────────────────────

// POST /api/charities/admin — create charity
router.post('/admin', requireAdmin, validate(createCharitySchema), async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('charities')
    .insert(req.validated.body)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ charity: data })
})

// PUT /api/charities/admin/:id — update charity
router.put('/admin/:id', requireAdmin, async (req, res) => {
  const allowed = ['name', 'description', 'long_description', 'logo_url', 'image_url', 'website_url', 'category', 'is_featured', 'is_active']
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))

  const { data, error } = await supabaseAdmin
    .from('charities')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ charity: data })
})

// DELETE /api/charities/admin/:id — soft delete
router.delete('/admin/:id', requireAdmin, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('charities')
    .update({ is_active: false })
    .eq('id', req.params.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

export default router
