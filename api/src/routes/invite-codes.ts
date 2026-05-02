import { Hono } from 'hono'

import { getAuthenticatedUser, getCurrentHouseholdFromContext } from '../lib/http.js'
import type { AppEnv } from '../middleware/auth-session.js'
import { HouseholdServiceError, householdService } from '../services/household.js'

export const inviteCodesRoute = new Hono<AppEnv>()

inviteCodesRoute.get('/', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({
      message: 'Unauthorized',
    }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({
      message: 'Household not found',
    }, 404)
  }

  const codes = await householdService.listInviteCodes(currentHousehold.household.id)

  return context.json({
    inviteCodes: codes,
  })
})

inviteCodesRoute.post('/', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({
      message: 'Unauthorized',
    }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({
      message: 'Household not found',
    }, 404)
  }

  try {
    const inviteCode = await householdService.createInviteCode({
      householdId: currentHousehold.household.id,
      userId: user.id,
    })

    return context.json({
      inviteCode,
    }, 201)
  } catch (error) {
    if (error instanceof HouseholdServiceError && error.code === 'INVITE_CODE_GENERATION_FAILED') {
      return context.json({
        message: error.message,
      }, 500)
    }

    throw error
  }
})
