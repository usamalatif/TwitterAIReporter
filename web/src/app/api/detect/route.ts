import { NextRequest, NextResponse } from 'next/server'

const INFERENCE_API_URL = process.env.INFERENCE_API_URL || 'https://twitteraireporter-production.up.railway.app'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    // Call inference API directly
    const inferenceResponse = await fetch(`${INFERENCE_API_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    })

    if (!inferenceResponse.ok) {
      throw new Error('Inference API error')
    }

    const result = await inferenceResponse.json()

    return NextResponse.json({
      aiProb: result.aiProb,
      humanProb: result.humanProb,
    })
  } catch (error) {
    console.error('Detection error:', error)
    return NextResponse.json(
      { error: 'Detection failed' },
      { status: 500 }
    )
  }
}
