import { NextRequest, NextResponse } from 'next/server'
import { verifyMagicLink } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(
        new URL('/login?error=invalid_token', request.url)
      )
    }

    const { sessionToken } = await verifyMagicLink(token)

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url))
  } catch (error) {
    console.error('Verify error:', error)
    const message = error instanceof Error ? error.message : 'verification_failed'
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, request.url)
    )
  }
}
