import { NextResponse } from 'next/server'
import { getGlobalStats } from '@/lib/redis'

// Stats are now served from Redis to avoid DB connection issues
// This is much faster and more reliable for high-traffic stats queries

export async function GET() {
  try {
    // Get stats directly from Redis (fast, no DB connection needed)
    const stats = await getGlobalStats()

    return NextResponse.json({
      totalScans: stats.totalScans,
      aiDetected: stats.aiDetected,
      humanDetected: stats.humanDetected,
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
