import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  console.log(`Received Stripe event: ${event.type}`)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        console.log('Checkout completed for userId:', userId, 'customerId:', customerId)

        if (!userId) {
          console.error('No userId in session metadata')
          break
        }

        // Get subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)

        // Update user with Stripe customer ID and subscription
        await prisma.user.update({
          where: { id: userId },
          data: {
            stripeCustomerId: customerId,
            subscription: 'pro',
          },
        })

        // Create or update subscription record
        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            stripeSubscriptionId: subscriptionId,
            status: 'active',
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
          update: {
            stripeSubscriptionId: subscriptionId,
            status: 'active',
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        })

        console.log('User upgraded to pro:', userId)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const subscriptionId = subscription.id
        const status = subscription.status

        console.log('Subscription updated:', subscriptionId, 'Status:', status)

        // Find subscription in database
        const existingSubscription = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: subscriptionId },
        })

        if (existingSubscription) {
          // Map Stripe status to our status
          let dbStatus: 'active' | 'canceled' | 'past_due' = 'active'
          if (status === 'canceled' || status === 'unpaid') {
            dbStatus = 'canceled'
          } else if (status === 'past_due') {
            dbStatus = 'past_due'
          }

          await prisma.subscription.update({
            where: { stripeSubscriptionId: subscriptionId },
            data: {
              status: dbStatus,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            },
          })

          // If canceled, downgrade user to free
          if (dbStatus === 'canceled') {
            await prisma.user.update({
              where: { id: existingSubscription.userId },
              data: { subscription: 'free' },
            })
            console.log('User downgraded to free:', existingSubscription.userId)
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const subscriptionId = subscription.id

        console.log('Subscription deleted:', subscriptionId)

        // Find and update subscription
        const existingSubscription = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: subscriptionId },
        })

        if (existingSubscription) {
          // Update subscription status
          await prisma.subscription.update({
            where: { stripeSubscriptionId: subscriptionId },
            data: { status: 'canceled' },
          })

          // Downgrade user to free
          await prisma.user.update({
            where: { id: existingSubscription.userId },
            data: { subscription: 'free' },
          })

          console.log('User downgraded to free after subscription deletion:', existingSubscription.userId)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string

        console.log('Payment failed for subscription:', subscriptionId)

        if (subscriptionId) {
          const existingSubscription = await prisma.subscription.findUnique({
            where: { stripeSubscriptionId: subscriptionId },
          })

          if (existingSubscription) {
            await prisma.subscription.update({
              where: { stripeSubscriptionId: subscriptionId },
              data: { status: 'past_due' },
            })
          }
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
