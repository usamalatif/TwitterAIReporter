import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCachedTweet, cacheTweet, getCachedApiKey, cacheApiKey, getUsage, incrementUsage } from '@/lib/redis'

const INFERENCE_API_URL = process.env.INFERENCE_API_URL || 'https://twitteraireporter-production.up.railway.app'
const FREE_LIMIT = 50

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

    let userId: string | null = null
    let isPro = false
    let isAnonymous = false

    // Handle authenticated vs anonymous requests
    if (apiKey) {
      // Check all caches in parallel (Redis is fast, DB is slow)
      const cacheStart = Date.now()
      const [cachedUser, cached] = await Promise.all([
        getCachedApiKey(apiKey),
        tweetId ? getCachedTweet(tweetId) : Promise.resolve(null),
      ])
      console.log(`[Detect] Redis cache check: ${Date.now() - cacheStart}ms`)

      if (cachedUser) {
        // Fast path: user info cached in Redis
        console.log(`[Detect] API key cache HIT`)
        userId = cachedUser.userId
        isPro = cachedUser.subscription === 'pro' && cachedUser.status === 'active'
      } else {
        // Slow path: need to query database
        console.log(`[Detect] API key cache MISS - querying DB`)
        const dbStart = Date.now()
        const user = await prisma.user.findUnique({
          where: { apiKey },
          include: { subscriptionData: true },
        })
        console.log(`[Detect] DB query: ${Date.now() - dbStart}ms`)

        if (!user) {
          return NextResponse.json(
            { error: 'Invalid API key' },
            { status: 401, headers: corsHeaders }
          )
        }

        userId = user.id
        isPro = user.subscription === 'pro' && user.subscriptionData?.status === 'active'

        // Cache user info in Redis for next time
        cacheApiKey(apiKey, {
          userId: user.id,
          subscription: user.subscription,
          status: user.subscriptionData?.status || null,
        }).catch(console.error)
      }

      // Check rate limits using Redis (fast) instead of DB
      if (!isPro) {
        const usageCount = await getUsage(userId)
        if (usageCount >= FREE_LIMIT) {
          return NextResponse.json(
            { error: 'Daily limit reached. Upgrade to Pro for unlimited scans.' },
            { status: 429, headers: corsHeaders }
          )
        }
      }

      // Return cached result if available (for authenticated users)
      if (cached) {
        console.log(`[Detect] Cache HIT for tweet ${tweetId}`)
        // Track usage in Redis (fast) and DB (background)
        incrementUsage(userId).catch(console.error)
        trackUsageInDB(userId, cached.aiProb > 0.5).catch(console.error)
        console.log(`[Detect] Total time (cached): ${Date.now() - startTime}ms`)
        return NextResponse.json({
          aiProb: cached.aiProb,
          humanProb: cached.humanProb,
          cached: true,
        }, { headers: corsHeaders })
      }
    } else {
      // Anonymous user (no API key) - still track for stats
      isAnonymous = true
      console.log(`[Detect] Anonymous request - will track for stats`)

      // Check tweet cache for anonymous users too
      if (tweetId) {
        const cached = await getCachedTweet(tweetId)
        if (cached) {
          console.log(`[Detect] Cache HIT for anonymous tweet ${tweetId}`)
          // Track anonymous usage
          trackAnonymousUsageInDB(cached.aiProb > 0.5).catch(console.error)
          return NextResponse.json({
            aiProb: cached.aiProb,
            humanProb: cached.humanProb,
            cached: true,
          }, { headers: corsHeaders })
        }
      }
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

    // Cache tweet result
    if (tweetId) {
      cacheTweet(tweetId, {
        aiProb: result.aiProb,
        humanProb: result.humanProb,
      }).catch(console.error)
    }

    // Track usage - either for authenticated user or anonymous
    if (userId) {
      incrementUsage(userId).catch(console.error)
      trackUsageInDB(userId, result.aiProb > 0.5).catch(console.error)
    } else {
      trackAnonymousUsageInDB(result.aiProb > 0.5).catch(console.error)
    }

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

// Helper function to track usage in database (runs in background)
async function trackUsageInDB(userId: string, isAI: boolean) {
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

// Track anonymous usage (for users without API key)
// Uses a special "anonymous" user ID for aggregation
const ANONYMOUS_USER_ID = 'anonymous-stats-tracker'

async function trackAnonymousUsageInDB(isAI: boolean) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Ensure anonymous user exists
  await prisma.user.upsert({
    where: { id: ANONYMOUS_USER_ID },
    update: {},
    create: {
      id: ANONYMOUS_USER_ID,
      email: 'anonymous@kitha.co',
      apiKey: 'anonymous-no-key',
      subscription: 'free',
    },
  })

  await prisma.usage.upsert({
    where: {
      userId_date: {
        userId: ANONYMOUS_USER_ID,
        date: today,
      },
    },
    update: {
      scanCount: { increment: 1 },
      aiDetected: isAI ? { increment: 1 } : undefined,
    },
    create: {
      userId: ANONYMOUS_USER_ID,
      date: today,
      scanCount: 1,
      aiDetected: isAI ? 1 : 0,
    },
  })
}
