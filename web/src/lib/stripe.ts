import Stripe from 'stripe'

// Only initialize Stripe if API key is available
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder'
export const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-12-15.clover',
})

export const isStripeConfigured = () => !!process.env.STRIPE_SECRET_KEY

export const PLANS = {
  pro: {
    name: 'Pro',
    price: 5,
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    features: [
      'Unlimited tweet scans',
      'Priority support',
      'Early access to new features',
    ],
  },
} as const

export async function createCheckoutSession(
  userId: string,
  email: string,
  priceId: string
) {
  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`,
    metadata: {
      userId,
    },
  })

  return session
}

export async function createBillingPortalSession(customerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  })

  return session
}
