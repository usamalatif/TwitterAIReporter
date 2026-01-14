import { NextResponse } from 'next/server'
import { getCachedTweet, cacheTweet, isRedisConfigured } from '@/lib/redis'

export async function GET() {
  const testTweetId = 'test-' + Date.now()
  const testData = { aiProb: 0.75, humanProb: 0.25 }

  try {
    // Check if Redis is configured
    if (!isRedisConfigured()) {
      return NextResponse.json({
        status: 'error',
        message: 'REDIS_URL not configured',
        configured: false,
      })
    }

    // Test write
    await cacheTweet(testTweetId, testData)

    // Test read
    const cached = await getCachedTweet(testTweetId)

    if (cached && cached.aiProb === testData.aiProb) {
      return NextResponse.json({
        status: 'success',
        message: 'Redis is working!',
        configured: true,
        testWrite: testData,
        testRead: cached,
      })
    } else {
      return NextResponse.json({
        status: 'error',
        message: 'Redis read/write test failed',
        configured: true,
        testWrite: testData,
        testRead: cached,
      })
    }
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      configured: isRedisConfigured(),
    })
  }
}
