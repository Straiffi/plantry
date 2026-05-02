const fallbackBetterAuthSecret = 'development-secret-change-me-before-production-1234'

const createOrigin = (url: string) => {
  try {
    return new URL(url).origin
  } catch {
    return 'http://localhost:5173'
  }
}

export const env = {
  betterAuthSecret: process.env.BETTER_AUTH_SECRET ?? fallbackBetterAuthSecret,
  betterAuthUrl: process.env.BETTER_AUTH_URL ?? 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/recipe_app',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? 'development-google-client-id',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? 'development-google-client-secret',
} as const

export const appOrigin = createOrigin(env.betterAuthUrl)
