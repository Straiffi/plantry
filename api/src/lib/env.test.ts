import { describe, expect, it } from 'vitest'

import { resolveEnv } from './env.js'

describe('resolveEnv', () => {
  it('uses development fallbacks outside production', () => {
    expect(resolveEnv({ NODE_ENV: 'test' })).toEqual({
      betterAuthSecret: 'development-secret-change-me-before-production-1234',
      betterAuthUrl: 'http://localhost:5173',
      databaseUrl: 'postgres://postgres:postgres@localhost:5432/recipe_app',
      googleClientId: 'development-google-client-id',
      googleClientSecret: 'development-google-client-secret',
    })
  })

  it('rejects missing production secrets and OAuth settings', () => {
    expect(() => resolveEnv({ NODE_ENV: 'production' })).toThrowError('BETTER_AUTH_SECRET must be set in production')
  })

  it('rejects localhost better auth urls in production', () => {
    expect(() => resolveEnv({
      BETTER_AUTH_SECRET: 'secret-value',
      BETTER_AUTH_URL: 'http://localhost:5173',
      DATABASE_URL: 'postgres://user:pass@db.example.com:5432/recipe_app',
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
      NODE_ENV: 'production',
    })).toThrowError('BETTER_AUTH_URL must not point to localhost in production')
  })

  it('rejects better auth urls that include a path', () => {
    expect(() => resolveEnv({
      BETTER_AUTH_URL: 'https://recipe-app.example.com/app',
      NODE_ENV: 'test',
    })).toThrowError('BETTER_AUTH_URL must be the app origin without a path, query, or hash')
  })

  it('returns configured production values when present', () => {
    expect(resolveEnv({
      BETTER_AUTH_SECRET: 'secret-value',
      BETTER_AUTH_URL: 'https://recipe-app.example.com',
      DATABASE_URL: 'postgres://user:pass@db.example.com:5432/recipe_app',
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
      NODE_ENV: 'production',
    })).toEqual({
      betterAuthSecret: 'secret-value',
      betterAuthUrl: 'https://recipe-app.example.com',
      databaseUrl: 'postgres://user:pass@db.example.com:5432/recipe_app',
      googleClientId: 'google-client-id',
      googleClientSecret: 'google-client-secret',
    })
  })
})
