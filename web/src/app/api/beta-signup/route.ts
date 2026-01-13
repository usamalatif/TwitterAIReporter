import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Check if already signed up
    const existing = await prisma.betaSignup.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "You're already on the list!",
      })
    }

    // Create beta signup
    await prisma.betaSignup.create({
      data: {
        email: email.toLowerCase(),
      },
    })

    return NextResponse.json({
      success: true,
      message: "You're on the list! We'll notify you when we launch.",
    })
  } catch (error) {
    console.error('Beta signup error:', error)
    return NextResponse.json(
      { error: 'Failed to sign up' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const count = await prisma.betaSignup.count()
    return NextResponse.json({ count })
  } catch (error) {
    console.error('Beta count error:', error)
    return NextResponse.json({ count: 0 })
  }
}
