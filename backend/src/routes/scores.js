import { Router } from 'express'
import supabaseAdmin from '../../config/supabase.js'
import { requireAuth, requireActiveSubscription } from '../middleware/auth.js'
import { validate, scoreSchema } from '../middleware/validate.js'

const router = Router()

// GET /api/scores — get current user's scores (latest 5)
router.get('/', requireAuth, requireActiveSubscription, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('golf_scores')
    .select('*')
    .eq('user_id', req.user.id)
    .order('score_date', { ascending: false })
    .limit(5)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ scores: data })
})

// POST /api/scores — add a score
router.post('/', requireAuth, requireActiveSubscription, validate(scoreSchema), async (req, res) => {
  const { score, score_date, notes } = req.validated.body

  // Check for duplicate date
  const { data: existing } = await supabaseAdmin
    .from('golf_scores')
    .select('id')
    .eq('user_id', req.user.id)
    .eq('score_date', score_date)
    .single()

  if (existing) {
    return res.status(409).json({ error: 'A score already exists for this date. Edit or delete it instead.' })
  }

  const { data, error } = await supabaseAdmin
    .from('golf_scores')
    .insert({ user_id: req.user.id, score, score_date, notes })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  // Return all 5 scores after insert (trigger handles rolling window)
  const { data: allScores } = await supabaseAdmin
    .from('golf_scores')
    .select('*')
    .eq('user_id', req.user.id)
    .order('score_date', { ascending: false })
    .limit(5)

  res.status(201).json({ score: data, scores: allScores })
})

// PUT /api/scores/:id — update a score
router.put('/:id', requireAuth, requireActiveSubscription, validate(scoreSchema), async (req, res) => {
  const { score, score_date, notes } = req.validated.body

  // Confirm ownership
  const { data: existing } = await supabaseAdmin
    .from('golf_scores')
    .select('id, user_id')
    .eq('id', req.params.id)
    .single()

  if (!existing) return res.status(404).json({ error: 'Score not found' })
  if (existing.user_id !== req.user.id) return res.status(403).json({ error: 'Not your score' })

  // Check date conflict with another entry
  const { data: dateConflict } = await supabaseAdmin
    .from('golf_scores')
    .select('id')
    .eq('user_id', req.user.id)
    .eq('score_date', score_date)
    .neq('id', req.params.id)
    .single()

  if (dateConflict) {
    return res.status(409).json({ error: 'Another score already exists for that date' })
  }

  const { data, error } = await supabaseAdmin
    .from('golf_scores')
    .update({ score, score_date, notes })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ score: data })
})

// DELETE /api/scores/:id
router.delete('/:id', requireAuth, requireActiveSubscription, async (req, res) => {
  const { data: existing } = await supabaseAdmin
    .from('golf_scores')
    .select('id, user_id')
    .eq('id', req.params.id)
    .single()

  if (!existing) return res.status(404).json({ error: 'Score not found' })
  if (existing.user_id !== req.user.id) return res.status(403).json({ error: 'Not your score' })

  const { error } = await supabaseAdmin
    .from('golf_scores')
    .delete()
    .eq('id', req.params.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

export default router
