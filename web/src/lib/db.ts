import { PrismaClient } from '@prisma/client'

// Singleton pattern for Prisma client
// In serverless environments, we need to handle connection pooling carefully
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create Prisma client - the DATABASE_URL should have pgbouncer=true for Supabase
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

// Cache the client to reuse connections within the same serverless instance
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
} else {
  // In production, also cache to avoid creating new connections per request
  globalForPrisma.prisma = prisma
}

// Helper function to safely run database operations with retry
// Uses exponential backoff to avoid hammering the connection pool
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T | null> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error: any) {
      const isConnectionError = error?.code === 'P1001' ||
        error?.code === 'P1002' ||
        error?.message?.includes('pool') ||
        error?.message?.includes('timeout') ||
        error?.message?.includes('connection')

      console.error(`[DB] Operation failed (attempt ${i + 1}/${maxRetries}):`, error?.message || error)

      if (i < maxRetries - 1 && isConnectionError) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = initialDelay * Math.pow(2, i)
        console.log(`[DB] Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else if (!isConnectionError) {
        // Don't retry non-connection errors
        break
      }
    }
  }
  return null
}
