import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCachedTweet, cacheTweet } from '@/lib/redis'

const INFERENCE_API_URL = process.env.INFERENCE_API_URL || 'https://twitteraireporter-production.up.railway.app'

// CORS headers for extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-API-Key')
    const body = await request.json()
    const { text, tweetId } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate API key
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Find user by API key
    const user = await prisma.user.findUnique({
      where: { apiKey },
      include: { subscriptionData: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Check rate limits for free users
    const isPro = user.subscription === 'pro' && user.subscriptionData?.status === 'active'

    if (!isPro) {
      // Check daily usage for free tier
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

      const scanCount = todayUsage?.scanCount || 0
      if (scanCount >= 50) {
        return NextResponse.json(
          { error: 'Daily limit reached. Upgrade to Pro for unlimited scans.' },
          { status: 429, headers: corsHeaders }
        )
      }
    }

    // Check Redis cache first (if tweetId provided)
    if (tweetId) {
      const cached = await getCachedTweet(tweetId)
      if (cached) {
        console.log(`Cache hit for tweet ${tweetId}`)
        // Still track usage even for cached results
        await trackUsage(user.id, cached.aiProb > 0.5)
        return NextResponse.json({
          aiProb: cached.aiProb,
          humanProb: cached.humanProb,
          cached: true,
        }, { headers: corsHeaders })
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

    // Cache the result (if tweetId provided)
    if (tweetId) {
      await cacheTweet(tweetId, {
        aiProb: result.aiProb,
        humanProb: result.humanProb,
      })
      console.log(`Cached result for tweet ${tweetId}`)
    }

    // Track usage
    await trackUsage(user.id, result.aiProb > 0.5)

    return NextResponse.json({
      aiProb: result.aiProb,
      humanProb: result.humanProb,
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('Detection error:', error)
    return NextResponse.json(
      { error: 'Detection failed' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// Helper function to track usage in database
async function trackUsage(userId: string, isAI: boolean) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  await prisma.usage.upsert({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
    update: {
      scanCount: { increment: 1 },
      aiDetected: isAI ? { increment: 1 } : undefined,
    },
    create: {
      userId,
      date: today,
      scanCount: 1,
      aiDetected: isAI ? 1 : 0,
    },
  })
}
