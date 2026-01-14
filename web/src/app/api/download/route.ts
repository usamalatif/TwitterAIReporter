import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/db'

// GET - Get download count
export async function GET() {
  try {
    const stats = await withRetry(async () => {
      return await prisma.appStats.findUnique({
        where: { id: 'app-stats' },
      })
    })

    return NextResponse.json({
      downloads: stats?.downloads || 0,
    })
  } catch (error) {
    console.error('Error fetching download count:', error)
    return NextResponse.json({ downloads: 0 })
  }
}

// POST - Increment download count
export async function POST() {
  try {
    const stats = await withRetry(async () => {
      return await prisma.appStats.upsert({
        where: { id: 'app-stats' },
        update: {
          downloads: { increment: 1 },
        },
        create: {
          id: 'app-stats',
          downloads: 1,
        },
      })
    })

    if (!stats) {
      return NextResponse.json(
        { error: 'Failed to track download' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      downloads: stats.downloads,
    })
  } catch (error) {
    console.error('Error incrementing download count:', error)
    return NextResponse.json(
      { error: 'Failed to track download' },
      { status: 500 }
    )
  }
}
