import Redis from 'ioredis'

// Railway Redis connection
// Set REDIS_URL in environment variables (e.g., redis://default:password@host:port)
const redisUrl = process.env.REDIS_URL

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (!redisUrl) {
    console.warn('REDIS_URL not configured - caching disabled')
    return null
  }

  if (!redis) {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })

    redis.on('error', (err) => {
      console.error('Redis connection error:', err)
    })

    redis.on('connect', () => {
      console.log('Redis connected')
    })
  }

  return redis
}

// Check if Redis is available
export function isRedisConfigured(): boolean {
  return !!redisUrl
}

// Cache helpers for tweet results
export async function getCachedTweet(tweetId: string): Promise<{
  aiProb: number
  humanProb: number
  timestamp: number
} | null> {
  const client = getRedis()
  if (!client) return null

  try {
    const cached = await client.get(`tweet:${tweetId}`)
    if (cached) {
      return JSON.parse(cached)
    }
  } catch (error) {
    console.error('Redis get error:', error)
  }
  return null
}

export async function cacheTweet(
  tweetId: string,
  result: { aiProb: number; humanProb: number }
): Promise<void> {
  const client = getRedis()
  if (!client) return

  try {
    const data = JSON.stringify({
      ...result,
      timestamp: Date.now(),
    })
    // Cache for 24 hours
    await client.setex(`tweet:${tweetId}`, 86400, data)
  } catch (error) {
    console.error('Redis set error:', error)
  }
}

// Usage tracking with Redis (for rate limiting)
export async function incrementUsage(userId: string): Promise<number> {
  const client = getRedis()
  if (!client) return 0

  try {
    const today = new Date().toISOString().split('T')[0]
    const key = `usage:${userId}:${today}`
    const count = await client.incr(key)
    // Set expiry if this is the first increment
    if (count === 1) {
      await client.expire(key, 86400) // 24 hours
    }
    return count
  } catch (error) {
    console.error('Redis incr error:', error)
    return 0
  }
}

export async function getUsage(userId: string): Promise<number> {
  const client = getRedis()
  if (!client) return 0

  try {
    const today = new Date().toISOString().split('T')[0]
    const key = `usage:${userId}:${today}`
    const count = await client.get(key)
    return count ? parseInt(count, 10) : 0
  } catch (error) {
    console.error('Redis get usage error:', error)
    return 0
  }
}

// Cache API key validation results (avoids slow DB lookups)
export async function getCachedApiKey(apiKey: string): Promise<{
  userId: string
  subscription: string
  status: string | null
} | null> {
  const client = getRedis()
  if (!client) return null

  try {
    const cached = await client.get(`apikey:${apiKey}`)
    if (cached) {
      return JSON.parse(cached)
    }
  } catch (error) {
    console.error('Redis get apikey error:', error)
  }
  return null
}

export async function cacheApiKey(
  apiKey: string,
  data: { userId: string; subscription: string; status: string | null }
): Promise<void> {
  const client = getRedis()
  if (!client) return

  try {
    // Cache for 1 hour (user can change subscription, so don't cache too long)
    await client.setex(`apikey:${apiKey}`, 3600, JSON.stringify(data))
  } catch (error) {
    console.error('Redis set apikey error:', error)
  }
}

// Clean up connection on shutdown
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
  }
}
