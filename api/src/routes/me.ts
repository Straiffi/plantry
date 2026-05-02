import { Hono } from 'hono'

import type { AppEnv } from '../middleware/auth-session.js'

export const meRoute = new Hono<AppEnv>()

meRoute.get('/', (context) => {
  const session = context.get('session')
  const user = context.get('user')

  if (!session || !user) {
    return context.json({
      message: 'Unauthorized',
    }, 401)
  }

  return context.json({
    session,
    user,
  })
})
