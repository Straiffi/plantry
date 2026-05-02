import type { MiddlewareHandler } from 'hono'
import { householdMembers, households } from '@recipe-app/db'

import { auth } from '../lib/auth.js'
import { householdService } from '../services/household.js'

type Household = typeof households.$inferSelect
type HouseholdMember = typeof householdMembers.$inferSelect

export type AppVariables = {
  household: Household | null
  householdMembership: HouseholdMember | null
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
    context.set('household', null)
    context.set('householdMembership', null)
    context.set('session', null)
    context.set('user', null)
    await next()
    return
  }

  const currentHousehold = await householdService.getCurrentHouseholdForUser(currentSession.user.id)

  context.set('household', currentHousehold?.household ?? null)
  context.set('householdMembership', currentHousehold?.membership ?? null)
  context.set('session', currentSession.session)
  context.set('user', currentSession.user)
  await next()
}
