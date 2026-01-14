import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getGlobalStats } from '@/lib/redis'

// Sync stats from Redis to Database as backup
// Call this periodically via cron (e.g., Vercel Cron, external service)
// GET /api/sync-stats?secret=your-secret

const STATS_USER_ID = 'redis-stats-backup'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  // Accept "cron" for Vercel cron jobs or SESSION_SECRET for manual calls
  const isValidCron = secret === 'cron'
  const isValidManual = secret === process.env.SESSION_SECRET

  if (!isValidCron && !isValidManual) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get current stats from Redis
    const redisStats = await getGlobalStats()

    if (redisStats.totalScans === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stats to sync',
        stats: redisStats
      })
    }

    // Ensure backup user exists
    await prisma.user.upsert({
      where: { id: STATS_USER_ID },
      update: {},
      create: {
        id: STATS_USER_ID,
        email: 'redis-backup@kitha.co',
        apiKey: 'redis-backup-no-key',
        subscription: 'free',
      },
    })

    // Get current date for usage tracking
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Update the backup record with Redis totals
    // We store the TOTAL in a single record (overwrite, not increment)
    await prisma.usage.upsert({
      where: {
        userId_date: {
          userId: STATS_USER_ID,
          date: today,
        },
      },
      update: {
        scanCount: redisStats.totalScans,
        aiDetected: redisStats.aiDetected,
      },
      create: {
        userId: STATS_USER_ID,
        date: today,
        scanCount: redisStats.totalScans,
        aiDetected: redisStats.aiDetected,
      },
    })

    return NextResponse.json({
      success: true,
      synced: {
        totalScans: redisStats.totalScans,
        aiDetected: redisStats.aiDetected,
        humanDetected: redisStats.humanDetected,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
