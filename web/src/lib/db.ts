import { PrismaClient } from '@prisma/client'

// Singleton pattern for Prisma client
// Critical for serverless: reuse connections across requests
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create Prisma client with minimal logging in production
// The DATABASE_URL should have pgbouncer=true and connection_limit=1 for Supabase
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  // Datasource configuration is handled via DATABASE_URL
})

// ALWAYS cache the client - critical for serverless to prevent connection exhaustion
globalForPrisma.prisma = prisma

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
