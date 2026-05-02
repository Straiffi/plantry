import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { authSchema, db } from '@recipe-app/db'
import { betterAuth } from 'better-auth'

import { env } from './env.js'

export const auth = betterAuth({
  baseURL: env.betterAuthUrl,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: authSchema,
  }),
  secret: env.betterAuthSecret,
  socialProviders: {
    google: {
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
    },
  },
})
