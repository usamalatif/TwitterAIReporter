import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

// Helper to get current user from session
async function getCurrentUser() {
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

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
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
    })
  } catch (error) {
    console.error('User GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'logout': {
        const cookieStore = await cookies()
        cookieStore.delete('session')
        return NextResponse.json({ success: true })
      }

      case 'regenerate-api-key': {
        if (!user) {
          return NextResponse.json(
            { error: 'Not authenticated' },
            { status: 401 }
          )
        }

        const newApiKey = uuidv4()
        await prisma.user.update({
          where: { id: user.id },
          data: { apiKey: newApiKey },
        })

        return NextResponse.json({ success: true, apiKey: newApiKey })
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('User POST error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
