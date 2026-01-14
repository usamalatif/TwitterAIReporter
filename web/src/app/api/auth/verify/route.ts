import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

// Use consistent base URL for redirects
const getBaseUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl()

  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(`${baseUrl}/login?error=invalid_token`)
    }

    // Find the magic link
    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
    })

    if (!magicLink) {
      return NextResponse.redirect(`${baseUrl}/login?error=invalid_token`)
    }

    // Check if expired
    if (new Date() > magicLink.expiresAt) {
      return NextResponse.redirect(`${baseUrl}/login?error=expired`)
    }

    // Check if already used
    if (magicLink.used) {
      return NextResponse.redirect(`${baseUrl}/login?error=already_used`)
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

    // Set session cookie - use domain without www for cross-subdomain support
    const cookieStore = await cookies()
    cookieStore.set('session', `${user.id}:${sessionToken}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })

    console.log(`User logged in: ${user.email}`)

    // Redirect to dashboard using consistent base URL
    return NextResponse.redirect(`${baseUrl}/dashboard`)
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.redirect(`${baseUrl}/login?error=verification_failed`)
  }
}
