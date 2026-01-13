import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // TODO: Implement when database is ready
  return NextResponse.redirect(
    new URL('/login?error=auth_not_configured', request.url)
  )
}
