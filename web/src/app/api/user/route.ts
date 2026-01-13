import { NextResponse } from 'next/server'
import { getSession, regenerateApiKey } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createCheckoutSession, createBillingPortalSession, PLANS } from '@/lib/stripe'
import { cookies } from 'next/headers'

// GET /api/user - Get current user info
export async function GET() {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get usage stats for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const usage = await prisma.usage.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: today,
        },
      },
    })

    // Get total stats
    const totalStats = await prisma.usage.aggregate({
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
      createdAt: user.createdAt,
      subscriptionStatus: user.subscriptionData?.status,
      currentPeriodEnd: user.subscriptionData?.currentPeriodEnd,
      usage: {
        today: {
          scanCount: usage?.scanCount || 0,
          aiDetected: usage?.aiDetected || 0,
        },
        total: {
          scanCount: totalStats._sum.scanCount || 0,
          aiDetected: totalStats._sum.aiDetected || 0,
        },
      },
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    )
  }
}

// POST /api/user - Actions (regenerate key, upgrade, manage billing)
export async function POST(request: Request) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'regenerate-api-key': {
        const newApiKey = await regenerateApiKey(user.id)
        return NextResponse.json({ apiKey: newApiKey })
      }

      case 'create-checkout': {
        const session = await createCheckoutSession(
          user.id,
          user.email,
          PLANS.pro.priceId
        )
        return NextResponse.json({ url: session.url })
      }

      case 'manage-billing': {
        if (!user.stripeCustomerId) {
          return NextResponse.json(
            { error: 'No subscription found' },
            { status: 400 }
          )
        }
        const session = await createBillingPortalSession(user.stripeCustomerId)
        return NextResponse.json({ url: session.url })
      }

      case 'logout': {
        const cookieStore = await cookies()
        cookieStore.delete('session')
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('User action error:', error)
    return NextResponse.json(
      { error: 'Action failed' },
      { status: 500 }
    )
  }
}
