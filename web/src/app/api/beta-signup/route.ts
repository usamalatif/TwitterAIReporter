import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for beta signups (will reset on deploy)
// TODO: Replace with database when Postgres is set up
const betaSignups = new Set<string>()

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

    const normalizedEmail = email.toLowerCase()

    if (betaSignups.has(normalizedEmail)) {
      return NextResponse.json({
        success: true,
        message: "You're already on the list!",
      })
    }

    betaSignups.add(normalizedEmail)
    console.log(`Beta signup: ${normalizedEmail} (total: ${betaSignups.size})`)

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
  return NextResponse.json({ count: betaSignups.size })
}
