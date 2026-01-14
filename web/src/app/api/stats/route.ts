import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/db'

// Cache stats for 5 minutes to reduce DB load
let cachedStats: { totalScans: number; aiDetected: number; humanDetected: number; timestamp: number } | null = null
const CACHE_TTL = 1 * 60 * 1000 // 1 minute for more real-time updates

export async function GET() {
  try {
    // Return cached stats if still valid
    if (cachedStats && Date.now() - cachedStats.timestamp < CACHE_TTL) {
      return NextResponse.json({
        totalScans: cachedStats.totalScans,
        aiDetected: cachedStats.aiDetected,
        humanDetected: cachedStats.humanDetected,
      })
    }

    // Aggregate all usage data with retry for connection issues
    const stats = await withRetry(async () => {
      return await prisma.usage.aggregate({
        _sum: {
          scanCount: true,
          aiDetected: true,
        },
      })
    })

    // If DB failed after retries, return cached or zeros
    if (!stats) {
      if (cachedStats) {
        return NextResponse.json({
          totalScans: cachedStats.totalScans,
          aiDetected: cachedStats.aiDetected,
          humanDetected: cachedStats.humanDetected,
        })
      }
      return NextResponse.json({
        totalScans: 0,
        aiDetected: 0,
        humanDetected: 0,
      })
    }

    const totalScans = stats._sum.scanCount || 0
    const aiDetected = stats._sum.aiDetected || 0
    const humanDetected = totalScans - aiDetected

    // Cache the results
    cachedStats = {
      totalScans,
      aiDetected,
      humanDetected,
      timestamp: Date.now(),
    }

    return NextResponse.json({
      totalScans,
      aiDetected,
      humanDetected,
    })
  } catch (error) {
    console.error('Stats error:', error)
    // Return zeros on error
    return NextResponse.json({
      totalScans: 0,
      aiDetected: 0,
      humanDetected: 0,
    })
  }
}
