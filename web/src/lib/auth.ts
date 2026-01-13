// Simplified auth - database not configured yet
// TODO: Add full auth when Postgres is set up

export async function sendMagicLink(email: string) {
  console.log('Magic link requested for:', email)
  // TODO: Implement when database is ready
  return { success: true, message: 'Database not configured' }
}

export async function verifyMagicLink(token: string) {
  // TODO: Implement when database is ready
  throw new Error('Database not configured')
}

export async function getSession() {
  // TODO: Implement when database is ready
  return null
}

export async function validateApiKey(apiKey: string) {
  // TODO: Implement when database is ready
  return null
}

export async function regenerateApiKey(userId: string) {
  // TODO: Implement when database is ready
  return null
}
