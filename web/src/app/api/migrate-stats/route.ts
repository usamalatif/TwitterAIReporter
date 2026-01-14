import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import Redis from 'ioredis'

// One-time migration endpoint to copy DB stats to Redis
// Call this once after deploying: GET /api/migrate-stats?secret=your-secret
// Or use POST with JSON body: { "secret": "your-secret" }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  // URL decode the secret in case it has special characters
  const decodedSecret = secret ? decodeURIComponent(secret) : null

  // Simple secret check to prevent abuse
  if (decodedSecret !== process.env.SESSION_SECRET) {
    console.log('Secret mismatch:', { provided: decodedSecret?.substring(0, 10), expected: process.env.SESSION_SECRET?.substring(0, 10) })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get current stats from database
    const dbStats = await prisma.usage.aggregate({
      _sum: {
        scanCount: true,
        aiDetected: true,
      },
    })

    const totalScans = dbStats._sum.scanCount || 0
    const aiDetected = dbStats._sum.aiDetected || 0

    // Connect to Redis and set the stats
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) {
      return NextResponse.json({ error: 'REDIS_URL not configured' }, { status: 500 })
    }

    const redis = new Redis(redisUrl)

    // Set the stats in Redis
    await redis.set('stats:totalScans', totalScans.toString())
    await redis.set('stats:aiDetected', aiDetected.toString())

    await redis.quit()

    return NextResponse.json({
      success: true,
      migrated: {
        totalScans,
        aiDetected,
        humanDetected: totalScans - aiDetected,
      },
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 })
  }
}

// POST handler - easier to use with special characters in secret
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { secret } = body

    if (secret !== process.env.SESSION_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current stats from database
    const dbStats = await prisma.usage.aggregate({
      _sum: {
        scanCount: true,
        aiDetected: true,
      },
    })

    const totalScans = dbStats._sum.scanCount || 0
    const aiDetected = dbStats._sum.aiDetected || 0

    // Connect to Redis and set the stats
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) {
      return NextResponse.json({ error: 'REDIS_URL not configured' }, { status: 500 })
    }

    const redis = new Redis(redisUrl)

    // Set the stats in Redis
    await redis.set('stats:totalScans', totalScans.toString())
    await redis.set('stats:aiDetected', aiDetected.toString())

    await redis.quit()

    return NextResponse.json({
      success: true,
      migrated: {
        totalScans,
        aiDetected,
        humanDetected: totalScans - aiDetected,
      },
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 })
  }
}
