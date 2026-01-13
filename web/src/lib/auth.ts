import { prisma } from './db'
import { Resend } from 'resend'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { cookies } from 'next/headers'

const resend = new Resend(process.env.RESEND_API_KEY!)

const JWT_SECRET = process.env.JWT_SECRET!
const MAGIC_LINK_EXPIRY = 15 * 60 * 1000 // 15 minutes

export async function sendMagicLink(email: string) {
  const token = uuidv4()
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY)

  await prisma.magicLink.create({
    data: {
      email,
      token,
      expiresAt,
    },
  })

  const magicLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify?token=${token}`

  await resend.emails.send({
    from: 'TweetGuard <noreply@tweetguard.ai>',
    to: email,
    subject: 'Sign in to TweetGuard',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #667eea;">Sign in to TweetGuard</h1>
        <p>Click the button below to sign in to your TweetGuard account:</p>
        <a href="${magicLink}" style="
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
        ">Sign in to TweetGuard</a>
        <p style="color: #666; margin-top: 20px; font-size: 14px;">
          This link expires in 15 minutes. If you didn't request this email, you can safely ignore it.
        </p>
      </div>
    `,
  })

  return { success: true }
}

export async function verifyMagicLink(token: string) {
  const magicLink = await prisma.magicLink.findUnique({
    where: { token },
  })

  if (!magicLink) {
    throw new Error('Invalid magic link')
  }

  if (magicLink.used) {
    throw new Error('Magic link already used')
  }

  if (new Date() > magicLink.expiresAt) {
    throw new Error('Magic link expired')
  }

  // Mark as used
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
      },
    })
  }

  // Create JWT session token
  const sessionToken = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  )

  return { user, sessionToken }
}

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value

  if (!token) {
    return null
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string
      email: string
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        subscriptionData: true,
      },
    })

    return user
  } catch {
    return null
  }
}

export async function validateApiKey(apiKey: string) {
  const user = await prisma.user.findUnique({
    where: { apiKey },
    include: {
      subscriptionData: true,
    },
  })

  return user
}

export async function regenerateApiKey(userId: string) {
  const newApiKey = uuidv4()

  await prisma.user.update({
    where: { id: userId },
    data: { apiKey: newApiKey },
  })

  return newApiKey
}
