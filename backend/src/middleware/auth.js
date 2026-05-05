import { supabaseAdmin } from '../../config/supabase.js'

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' })
  }

  const token = authHeader.split(' ')[1]
  if (!token || token === 'undefined' || token === 'null') {
    return res.status(401).json({ error: 'Invalid token' })
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      // Profile missing — auto-create it
      const { data: newProfile } = await supabaseAdmin
        .from('profiles')
        .insert({ id: user.id, email: user.email, full_name: user.user_metadata?.full_name || '', role: 'subscriber' })
        .select()
        .single()
      req.user = { ...user, profile: newProfile }
    } else {
      req.user = { ...user, profile }
    }

    next()
  } catch (err) {
    console.error('Auth error:', err.message)
    return res.status(401).json({ error: 'Token verification failed' })
  }
}

export const requireAdmin = async (req, res, next) => {
  await requireAuth(req, res, () => {
    if (req.user?.profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }
    next()
  })
}

export const requireActiveSubscription = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthenticated' })

  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('status')
    .eq('user_id', req.user.id)
    .single()

  if (!subscription || subscription.status !== 'active') {
    return res.status(403).json({ error: 'Active subscription required' })
  }

  req.subscription = subscription
  next()
}