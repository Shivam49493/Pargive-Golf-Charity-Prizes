import Stripe from 'stripe'
import supabaseAdmin from '../../config/supabase.js'
import dotenv from 'dotenv'
dotenv.config()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function createCheckoutSession(userId, userEmail, plan) {
  const priceId = plan === 'yearly'
    ? process.env.STRIPE_YEARLY_PRICE_ID
    : process.env.STRIPE_MONTHLY_PRICE_ID

  // Get or create Stripe customer
  let { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single()

  let customerId = subscription?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { supabase_user_id: userId }
    })
    customerId = customer.id
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${process.env.FRONTEND_URL}/dashboard?subscribed=true`,
    cancel_url: `${process.env.FRONTEND_URL}/pricing?cancelled=true`,
    metadata: { supabase_user_id: userId, plan }
  })

  return { url: session.url, session_id: session.id }
}

export async function createPortalSession(userId) {
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single()

  if (!subscription?.stripe_customer_id) {
    throw new Error('No billing account found')
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${process.env.FRONTEND_URL}/dashboard/settings`
  })

  return { url: session.url }
}

export async function handleWebhook(rawBody, signature) {
  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err.message}`)
  }

  const stripeSubscription = event.data.object

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const userId = session.metadata.supabase_user_id
      const plan = session.metadata.plan

      const stripeSub = await stripe.subscriptions.retrieve(session.subscription)

      await upsertSubscription(userId, {
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        plan,
        status: 'active',
        current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
        monthly_amount_pence: plan === 'yearly' ? Math.floor(8999 / 12) : 999
      })
      break
    }

    case 'invoice.payment_succeeded': {
      const sub = await stripe.subscriptions.retrieve(stripeSubscription.subscription)
      const { data: dbSub } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', sub.id)
        .single()

      if (dbSub) {
        await upsertSubscription(dbSub.user_id, {
          status: 'active',
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString()
        })
      }
      break
    }

    case 'invoice.payment_failed': {
      const { data: dbSub } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', stripeSubscription.subscription)
        .single()

      if (dbSub) {
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('user_id', dbSub.user_id)
      }
      break
    }

    case 'customer.subscription.deleted': {
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'cancelled', cancel_at_period_end: false })
        .eq('stripe_subscription_id', stripeSubscription.id)
      break
    }

    case 'customer.subscription.updated': {
      const { data: dbSub } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', stripeSubscription.id)
        .single()

      if (dbSub) {
        await supabaseAdmin.from('subscriptions').update({
          status: stripeSubscription.status === 'active' ? 'active' : 'lapsed',
          cancel_at_period_end: stripeSubscription.cancel_at_period_end,
          current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString()
        }).eq('user_id', dbSub.user_id)
      }
      break
    }
  }

  return { received: true }
}

async function upsertSubscription(userId, data) {
  const { data: existing } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (existing) {
    await supabaseAdmin.from('subscriptions').update(data).eq('user_id', userId)
  } else {
    await supabaseAdmin.from('subscriptions').insert({ user_id: userId, ...data })
  }
}
