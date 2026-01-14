import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { feedback, email } = body

    if (!feedback || typeof feedback !== 'string') {
      return NextResponse.json(
        { error: 'Feedback is required' },
        { status: 400 }
      )
    }

    // Store feedback in database
    await prisma.feedback.create({
      data: {
        email: email || 'anonymous',
        message: feedback.slice(0, 2000), // Limit to 2000 chars
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Feedback error:', error)
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}
