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
  const startTime = Date.now()

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

    // Run user lookup and cache check in parallel for speed
    const cacheStart = Date.now()
    const [user, cached] = await Promise.all([
      prisma.user.findUnique({
        where: { apiKey },
        include: { subscriptionData: true },
      }),
      tweetId ? getCachedTweet(tweetId) : Promise.resolve(null),
    ])
    console.log(`[Detect] User lookup + cache check: ${Date.now() - cacheStart}ms`)

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

      const usageStart = Date.now()
      const todayUsage = await prisma.usage.findUnique({
        where: {
          userId_date: {
            userId: user.id,
            date: today,
          },
        },
      })
      console.log(`[Detect] Usage check: ${Date.now() - usageStart}ms`)

      const scanCount = todayUsage?.scanCount || 0
      if (scanCount >= 50) {
        return NextResponse.json(
          { error: 'Daily limit reached. Upgrade to Pro for unlimited scans.' },
          { status: 429, headers: corsHeaders }
        )
      }
    }

    // Return cached result if available (cache was fetched in parallel above)
    if (cached) {
      console.log(`[Detect] Cache HIT for tweet ${tweetId}`)
      // Track usage in background - don't await
      trackUsage(user.id, cached.aiProb > 0.5).catch(console.error)
      console.log(`[Detect] Total time (cached): ${Date.now() - startTime}ms`)
      return NextResponse.json({
        aiProb: cached.aiProb,
        humanProb: cached.humanProb,
        cached: true,
      }, { headers: corsHeaders })
    }

    console.log(`[Detect] Cache MISS for tweet ${tweetId}`)

    // Call inference API
    const inferenceStart = Date.now()
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
    console.log(`[Detect] Inference API: ${Date.now() - inferenceStart}ms`)

    // Cache and track usage in background - don't await
    if (tweetId) {
      cacheTweet(tweetId, {
        aiProb: result.aiProb,
        humanProb: result.humanProb,
      }).catch(console.error)
    }
    trackUsage(user.id, result.aiProb > 0.5).catch(console.error)

    console.log(`[Detect] Total time (uncached): ${Date.now() - startTime}ms`)
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
