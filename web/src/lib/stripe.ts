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

// Coupon ID for first 10 users promo (100% off first month)
const FIRST_USERS_COUPON_ID = 'FIRST10_FREE_MONTH'

// Create or get the "first 10 users" coupon
export async function getOrCreateFirstUsersCoupon(): Promise<string> {
  try {
    // Try to retrieve existing coupon
    const coupon = await stripe.coupons.retrieve(FIRST_USERS_COUPON_ID)
    return coupon.id
  } catch {
    // Coupon doesn't exist, create it
    const coupon = await stripe.coupons.create({
      id: FIRST_USERS_COUPON_ID,
      percent_off: 100,
      duration: 'once', // Applies to first invoice only
      name: 'First 10 Users - Free Month',
    })
    return coupon.id
  }
}

export async function createCheckoutSession(
  userId: string,
  email: string,
  priceId: string,
  couponId?: string
) {
  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
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
  }

  // Apply coupon if provided
  if (couponId) {
    sessionConfig.discounts = [{ coupon: couponId }]
  }

  const session = await stripe.checkout.sessions.create(sessionConfig)

  return session
}

export async function createBillingPortalSession(customerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  })

  return session
}
