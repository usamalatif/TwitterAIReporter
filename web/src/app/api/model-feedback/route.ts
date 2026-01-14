import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// CORS headers for extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tweetId, tweetText, aiProb, prediction, isCorrect } = body

    // Validate required fields
    if (!tweetId || !tweetText || aiProb === undefined || !prediction || isCorrect === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate prediction value
    if (!['human', 'uncertain', 'ai'].includes(prediction)) {
      return NextResponse.json(
        { error: 'Invalid prediction value' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Store feedback
    await prisma.modelFeedback.create({
      data: {
        tweetId: String(tweetId),
        tweetText: String(tweetText).substring(0, 1000), // Limit text length
        aiProb: Number(aiProb),
        prediction: String(prediction),
        isCorrect: Boolean(isCorrect),
      },
    })

    console.log(`[ModelFeedback] Received: ${prediction} ${isCorrect ? 'correct' : 'wrong'} (aiProb: ${aiProb})`)

    return NextResponse.json(
      { success: true },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('Model feedback error:', error)
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// GET endpoint to view feedback stats (for admin use)
export async function GET() {
  try {
    const stats = await prisma.modelFeedback.groupBy({
      by: ['prediction', 'isCorrect'],
      _count: true,
    })

    const total = await prisma.modelFeedback.count()
    const correct = await prisma.modelFeedback.count({ where: { isCorrect: true } })
    const incorrect = await prisma.modelFeedback.count({ where: { isCorrect: false } })

    // Get recent incorrect predictions for training data
    const recentIncorrect = await prisma.modelFeedback.findMany({
      where: { isCorrect: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        tweetText: true,
        aiProb: true,
        prediction: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      total,
      correct,
      incorrect,
      accuracy: total > 0 ? ((correct / total) * 100).toFixed(1) + '%' : 'N/A',
      breakdown: stats,
      recentIncorrect,
    })
  } catch (error) {
    console.error('Model feedback stats error:', error)
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    )
  }
}
