import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'
import { createCheckoutSession, createBillingPortalSession, PLANS, isStripeConfigured, getOrCreateFirstUsersCoupon } from '@/lib/stripe'

// First 10 users promo config
const FIRST_10_PROMO_CODE = 'FIRST10_FREE'
const FIRST_10_MAX_USES = 10

// CORS headers for extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// Helper to get current user from session cookie
async function getCurrentUserFromSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value

  if (!session) {
    return null
  }

  const [userId] = session.split(':')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscriptionData: true,
    },
  })

  return user
}

// Helper to get current user from API key
async function getCurrentUserFromApiKey(apiKey: string) {
  const user = await prisma.user.findUnique({
    where: { apiKey },
    include: {
      subscriptionData: true,
    },
  })

  return user
}

export async function GET(request: NextRequest) {
  try {
    // Check for API key header first (for extension)
    const apiKey = request.headers.get('X-API-Key')

    let user
    if (apiKey) {
      user = await getCurrentUserFromApiKey(apiKey)
    } else {
      user = await getCurrentUserFromSession()
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Get usage stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayUsage = await prisma.usage.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: today,
        },
      },
    })

    const totalUsage = await prisma.usage.aggregate({
      where: { userId: user.id },
      _sum: {
        scanCount: true,
        aiDetected: true,
      },
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      subscription: user.subscription,
      apiKey: user.apiKey,
      createdAt: user.createdAt.toISOString(),
      subscriptionStatus: user.subscriptionData?.status,
      currentPeriodEnd: user.subscriptionData?.currentPeriodEnd?.toISOString(),
      usage: {
        today: {
          scanCount: todayUsage?.scanCount || 0,
          aiDetected: todayUsage?.aiDetected || 0,
        },
        total: {
          scanCount: totalUsage._sum.scanCount || 0,
          aiDetected: totalUsage._sum.aiDetected || 0,
        },
      },
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('User GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromSession()
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'logout': {
        const cookieStore = await cookies()
        cookieStore.delete('session')
        return NextResponse.json({ success: true }, { headers: corsHeaders })
      }

      case 'regenerate-api-key': {
        if (!user) {
          return NextResponse.json(
            { error: 'Not authenticated' },
            { status: 401, headers: corsHeaders }
          )
        }

        const newApiKey = uuidv4()
        await prisma.user.update({
          where: { id: user.id },
          data: { apiKey: newApiKey },
        })

        return NextResponse.json({ success: true, apiKey: newApiKey }, { headers: corsHeaders })
      }

      case 'create-checkout': {
        if (!user) {
          return NextResponse.json(
            { error: 'Not authenticated' },
            { status: 401, headers: corsHeaders }
          )
        }

        if (!isStripeConfigured()) {
          return NextResponse.json(
            { error: 'Stripe is not configured' },
            { status: 500, headers: corsHeaders }
          )
        }

        // Check if user is eligible for first 10 users promo
        let couponId: string | undefined

        // Get or create the promo in DB
        let promo = await prisma.promotion.findUnique({
          where: { code: FIRST_10_PROMO_CODE },
        })

        if (!promo) {
          // Create the promo if it doesn't exist
          promo = await prisma.promotion.create({
            data: {
              code: FIRST_10_PROMO_CODE,
              description: 'First 10 users get 1 month free',
              maxUses: FIRST_10_MAX_USES,
              discountPercent: 100,
              durationMonths: 1,
            },
          })
        }

        // Check if user already claimed this promo
        const existingClaim = await prisma.promotionClaim.findUnique({
          where: { userId: user.id },
        })

        // If promo is available and user hasn't claimed it
        if (promo.active && promo.usedCount < promo.maxUses && !existingClaim) {
          // Get Stripe coupon
          couponId = await getOrCreateFirstUsersCoupon()

          // Record the claim and increment count
          await prisma.$transaction([
            prisma.promotionClaim.create({
              data: {
                promotionId: promo.id,
                userId: user.id,
              },
            }),
            prisma.promotion.update({
              where: { id: promo.id },
              data: { usedCount: { increment: 1 } },
            }),
          ])

          console.log(`[Promo] User ${user.email} claimed FIRST10_FREE (${promo.usedCount + 1}/${FIRST_10_MAX_USES})`)
        }

        const session = await createCheckoutSession(
          user.id,
          user.email,
          PLANS.pro.priceId,
          couponId
        )

        return NextResponse.json({
          url: session.url,
          promoApplied: !!couponId,
        }, { headers: corsHeaders })
      }

      case 'manage-billing': {
        if (!user) {
          return NextResponse.json(
            { error: 'Not authenticated' },
            { status: 401, headers: corsHeaders }
          )
        }

        if (!isStripeConfigured()) {
          return NextResponse.json(
            { error: 'Stripe is not configured' },
            { status: 500, headers: corsHeaders }
          )
        }

        if (!user.stripeCustomerId) {
          return NextResponse.json(
            { error: 'No billing account found' },
            { status: 400, headers: corsHeaders }
          )
        }

        const session = await createBillingPortalSession(user.stripeCustomerId)

        return NextResponse.json({ url: session.url }, { headers: corsHeaders })
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400, headers: corsHeaders }
        )
    }
  } catch (error) {
    console.error('User POST error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500, headers: corsHeaders }
    )
  }
}
