import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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

    // Aggregate all usage data
    const stats = await prisma.usage.aggregate({
      _sum: {
        scanCount: true,
        aiDetected: true,
      },
    })

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
