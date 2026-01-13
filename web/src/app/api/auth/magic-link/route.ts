import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

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

    // Generate magic link token
    const token = uuidv4()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    // Store magic link in database
    await prisma.magicLink.create({
      data: {
        email: normalizedEmail,
        token,
        expiresAt,
      },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const magicLinkUrl = `${appUrl}/api/auth/verify?token=${token}`

    // Send email with Resend (if configured)
    if (resend) {
      try {
        const fromAddress = process.env.RESEND_FROM_EMAIL || 'Kitha <onboarding@kitha.co>'

        const result = await resend.emails.send({
          from: fromAddress,
          to: normalizedEmail,
          subject: 'Sign in to TweetGuard',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Sign in to TweetGuard</h2>
              <p>Click the button below to sign in to your TweetGuard account:</p>
              <a href="${magicLinkUrl}" style="display: inline-block; background: linear-gradient(to right, #8b5cf6, #ec4899); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Sign In
              </a>
              <p style="margin-top: 20px; color: #666; font-size: 14px;">
                This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.
              </p>
            </div>
          `,
        })

        console.log(`Magic link sent to: ${normalizedEmail}`, result)

        return NextResponse.json({
          success: true,
          message: 'Check your email for the magic link!',
        })
      } catch (emailError) {
        console.error('Resend email error:', emailError)
        // Fall through to show the link in logs
      }
    }

    {
      // Development mode - log the link
      console.log(`\n========================================`)
      console.log(`MAGIC LINK (dev mode - Resend not configured):`)
      console.log(`Email: ${normalizedEmail}`)
      console.log(`Link: ${magicLinkUrl}`)
      console.log(`========================================\n`)

      return NextResponse.json({
        success: true,
        message: 'Check your email for the magic link!',
        // Include link in dev mode for testing
        ...(process.env.NODE_ENV === 'development' && { devLink: magicLinkUrl }),
      })
    }
  } catch (error) {
    console.error('Magic link error:', error)
    return NextResponse.json(
      { error: 'Failed to send magic link' },
      { status: 500 }
    )
  }
}
