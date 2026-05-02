import { Hono } from 'hono'

import type { AppEnv } from '../middleware/auth-session.js'

export const meRoute = new Hono<AppEnv>()

meRoute.get('/', (context) => {
  const household = context.get('household')
  const householdMembership = context.get('householdMembership')
  const session = context.get('session')
  const user = context.get('user')

  if (!session || !user) {
    return context.json({
      message: 'Unauthorized',
    }, 401)
  }

  return context.json({
    household,
    householdMembership,
    session,
    user,
  })
})
