import type { MiddlewareHandler } from 'hono'

import { auth } from '../lib/auth.js'

export type AppVariables = {
  session: typeof auth.$Infer.Session.session | null
  user: typeof auth.$Infer.Session.user | null
}

export type AppEnv = {
  Variables: AppVariables
}

export const authSessionMiddleware: MiddlewareHandler<AppEnv> = async (context, next) => {
  const currentSession = await auth.api.getSession({
    headers: context.req.raw.headers,
  })

  if (!currentSession) {
    context.set('session', null)
    context.set('user', null)
    await next()
    return
  }

  context.set('session', currentSession.session)
  context.set('user', currentSession.user)
  await next()
}
