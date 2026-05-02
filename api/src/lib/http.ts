import type { Context } from 'hono'

import type { AppEnv } from '../middleware/auth-session.js'

type JsonBody = Record<string, unknown>

export const readJsonBody = async (context: Context<AppEnv>) => {
  try {
    const body = await context.req.json()

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return null
    }

    return body as JsonBody
  } catch {
    return null
  }
}

export const getAuthenticatedUser = (context: Context<AppEnv>) => {
  return context.get('user')
}

export const getCurrentHouseholdFromContext = (context: Context<AppEnv>) => {
  const household = context.get('household')
  const membership = context.get('householdMembership')

  if (!household || !membership) {
    return null
  }

  return {
    household,
    membership,
  }
}
