import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(
        new URL('/login?error=invalid_token', request.url)
      )
    }

    // Find the magic link
    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
    })

    if (!magicLink) {
      return NextResponse.redirect(
        new URL('/login?error=invalid_token', request.url)
      )
    }

    // Check if expired
    if (new Date() > magicLink.expiresAt) {
      return NextResponse.redirect(
        new URL('/login?error=Magic link expired', request.url)
      )
    }

    // Check if already used
    if (magicLink.used) {
      return NextResponse.redirect(
        new URL('/login?error=Magic link already used', request.url)
      )
    }

    // Mark magic link as used
    await prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { used: true },
    })

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: magicLink.email },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: magicLink.email,
          apiKey: uuidv4(),
        },
      })
      console.log(`New user created: ${user.email}`)
    }

    // Create session token
    const sessionToken = uuidv4()

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('session', `${user.id}:${sessionToken}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })

    console.log(`User logged in: ${user.email}`)

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url))
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.redirect(
      new URL('/login?error=verification_failed', request.url)
    )
  }
}
