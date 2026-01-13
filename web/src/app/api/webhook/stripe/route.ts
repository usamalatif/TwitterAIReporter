import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId

        if (userId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )

          await prisma.user.update({
            where: { id: userId },
            data: {
              subscription: 'pro',
              stripeCustomerId: session.customer as string,
            },
          })

          await prisma.subscription.upsert({
            where: { userId },
            update: {
              stripeSubscriptionId: subscription.id,
              status: 'active',
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            },
            create: {
              userId,
              stripeSubscriptionId: subscription.id,
              status: 'active',
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            },
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        const existingSub = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        })

        if (existingSub) {
          let status: 'active' | 'canceled' | 'past_due' = 'active'
          if (subscription.status === 'canceled') status = 'canceled'
          if (subscription.status === 'past_due') status = 'past_due'

          await prisma.subscription.update({
            where: { stripeSubscriptionId: subscription.id },
            data: {
              status,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            },
          })

          // Update user subscription tier
          await prisma.user.update({
            where: { id: existingSub.userId },
            data: {
              subscription: status === 'active' ? 'pro' : 'free',
            },
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        const existingSub = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        })

        if (existingSub) {
          await prisma.subscription.update({
            where: { stripeSubscriptionId: subscription.id },
            data: { status: 'canceled' },
          })

          await prisma.user.update({
            where: { id: existingSub.userId },
            data: { subscription: 'free' },
          })
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
