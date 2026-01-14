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
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 2,
  delay = 500
): Promise<T | null> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      console.error(`[DB] Operation failed (attempt ${i + 1}/${maxRetries}):`, error)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  return null
}
