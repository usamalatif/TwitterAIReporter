import { NextResponse } from 'next/server'

// Simplified user endpoint - no database for now
// TODO: Add database when Postgres is set up

export async function GET() {
  // Return mock data for now
  return NextResponse.json({
    message: 'User endpoint - database not configured yet',
    subscription: 'free',
  })
}

export async function POST(request: Request) {
  const body = await request.json()
  const { action } = body

  switch (action) {
    case 'logout':
      return NextResponse.json({ success: true })
    default:
      return NextResponse.json(
        { error: 'Database not configured yet' },
        { status: 501 }
      )
  }
}
