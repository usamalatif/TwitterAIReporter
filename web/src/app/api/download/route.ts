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

// PUT - Set download count (admin only)
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (secret !== process.env.SESSION_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { downloads } = body

    if (typeof downloads !== 'number' || downloads < 0) {
      return NextResponse.json({ error: 'Invalid downloads count' }, { status: 400 })
    }

    const stats = await withRetry(async () => {
      return await prisma.appStats.upsert({
        where: { id: 'app-stats' },
        update: { downloads },
        create: {
          id: 'app-stats',
          downloads,
        },
      })
    })

    return NextResponse.json({
      success: true,
      downloads: stats?.downloads || downloads,
    })
  } catch (error) {
    console.error('Error setting download count:', error)
    return NextResponse.json(
      { error: 'Failed to set download count' },
      { status: 500 }
    )
  }
}
