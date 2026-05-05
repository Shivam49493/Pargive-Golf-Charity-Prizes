import { z } from 'zod'

export const validate = (schema) => (req, res, next) => {
  try {
    req.validated = schema.parse({ body: req.body, params: req.params, query: req.query })
    next()
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(422).json({
        error: 'Validation failed',
        issues: err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      })
    }
    next(err)
  }
}

// ── Schemas ──────────────────────────────────────────────────────────────────

export const scoreSchema = z.object({
  body: z.object({
    score: z.number().int().min(1).max(45),
    score_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    notes: z.string().max(200).optional()
  })
})

export const charitySelectionSchema = z.object({
  body: z.object({
    charity_id: z.string().uuid(),
    contribution_percentage: z.number().int().min(10).max(100).default(10)
  })
})

export const createDrawSchema = z.object({
  body: z.object({
    draw_month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    draw_type: z.enum(['random', 'algorithmic']).default('random'),
    notes: z.string().optional()
  })
})

export const publishDrawSchema = z.object({
  params: z.object({ drawId: z.string().uuid() })
})

export const verifyWinnerSchema = z.object({
  params: z.object({ winnerId: z.string().uuid() }),
  body: z.object({
    verification_status: z.enum(['approved', 'rejected']),
    admin_notes: z.string().optional()
  })
})

export const updatePaymentSchema = z.object({
  params: z.object({ winnerId: z.string().uuid() }),
  body: z.object({
    payment_status: z.enum(['pending', 'paid'])
  })
})

export const createCharitySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    description: z.string().max(300),
    long_description: z.string().optional(),
    website_url: z.string().url().optional(),
    category: z.string().optional(),
    is_featured: z.boolean().default(false)
  })
})
