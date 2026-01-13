import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Rate limiter for free tier: 50 requests per day
export const freeTierLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(50, '24 h'),
  analytics: true,
  prefix: 'tweetguard:free',
})

// Cache helpers
export async function getCachedTweet(tweetId: string) {
  const cached = await redis.get<{
    aiProb: number
    humanProb: number
    timestamp: number
  }>(`tweet:${tweetId}`)
  return cached
}

export async function cacheTweet(
  tweetId: string,
  result: { aiProb: number; humanProb: number }
) {
  await redis.setex(
    `tweet:${tweetId}`,
    86400, // 24 hours
    JSON.stringify({
      ...result,
      timestamp: Date.now(),
    })
  )
}

// Usage tracking
export async function incrementUsage(userId: string) {
  const today = new Date().toISOString().split('T')[0]
  const key = `usage:${userId}:${today}`
  const count = await redis.incr(key)
  await redis.expire(key, 86400)
  return count
}

export async function getUsage(userId: string) {
  const today = new Date().toISOString().split('T')[0]
  const key = `usage:${userId}:${today}`
  const count = await redis.get<number>(key)
  return count || 0
}
