import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/auth'
import { getCachedTweet, cacheTweet, freeTierLimiter } from '@/lib/redis'
import { prisma } from '@/lib/db'

const INFERENCE_API_URL = process.env.INFERENCE_API_URL!
const FREE_SCAN_LIMIT = 50

export async function POST(request: NextRequest) {
  try {
    // Get API key from header
    const apiKey = request.headers.get('x-api-key')

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      )
    }

    // Validate API key
    const user = await validateApiKey(apiKey)

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { text, tweetId } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    // Check cache first
    if (tweetId) {
      const cached = await getCachedTweet(tweetId)
      if (cached) {
        return NextResponse.json({
          ...cached,
          cached: true,
        })
      }
    }

    // Check rate limit for free users
    const isPro = user.subscription === 'pro' &&
      user.subscriptionData?.status === 'active'

    if (!isPro) {
      const { success, remaining } = await freeTierLimiter.limit(user.id)

      if (!success) {
        return NextResponse.json(
          {
            error: 'Daily limit reached',
            limit: FREE_SCAN_LIMIT,
            remaining: 0,
            upgrade: true,
          },
          { status: 429 }
        )
      }
    }

    // Call inference API
    const inferenceResponse = await fetch(`${INFERENCE_API_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    })

    if (!inferenceResponse.ok) {
      throw new Error('Inference API error')
    }

    const result = await inferenceResponse.json()

    // Cache result
    if (tweetId) {
      await cacheTweet(tweetId, result)
    }

    // Update usage stats in database (async, don't wait)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    prisma.usage.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date: today,
        },
      },
      update: {
        scanCount: { increment: 1 },
        aiDetected: result.aiProb > 0.5 ? { increment: 1 } : undefined,
      },
      create: {
        userId: user.id,
        date: today,
        scanCount: 1,
        aiDetected: result.aiProb > 0.5 ? 1 : 0,
      },
    }).catch(console.error)

    return NextResponse.json({
      aiProb: result.aiProb,
      humanProb: result.humanProb,
      cached: false,
    })
  } catch (error) {
    console.error('Detection error:', error)
    return NextResponse.json(
      { error: 'Detection failed' },
      { status: 500 }
    )
  }
}
