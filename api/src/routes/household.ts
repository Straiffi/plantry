import { Hono } from 'hono'

import { getAuthenticatedUser, getCurrentHouseholdFromContext, readJsonBody } from '../lib/http.js'
import type { AppEnv } from '../middleware/auth-session.js'
import { HouseholdServiceError, householdService } from '../services/household.js'

export const householdRoute = new Hono<AppEnv>()

householdRoute.get('/', (context) => {
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

  return context.json(currentHousehold)
})

householdRoute.get('/members', async (context) => {
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

  const members = await householdService.listHouseholdMembers(currentHousehold.household.id)

  return context.json({
    members,
  })
})

householdRoute.post('/create', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({
      message: 'Unauthorized',
    }, 401)
  }

  const body = await readJsonBody(context)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''

  if (!name) {
    return context.json({
      message: 'Household name is required',
    }, 400)
  }

  try {
    const result = await householdService.createHousehold({
      name,
      userId: user.id,
    })

    return context.json(result, 201)
  } catch (error) {
    if (error instanceof HouseholdServiceError && error.code === 'HOUSEHOLD_EXISTS') {
      return context.json({
        message: error.message,
      }, 409)
    }

    throw error
  }
})

householdRoute.post('/join', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({
      message: 'Unauthorized',
    }, 401)
  }

  const body = await readJsonBody(context)
  const code = typeof body?.code === 'string' ? body.code.trim() : ''

  if (!code) {
    return context.json({
      message: 'Invite code is required',
    }, 400)
  }

  try {
    const result = await householdService.joinHouseholdByInviteCode({
      code,
      userId: user.id,
    })

    return context.json(result)
  } catch (error) {
    if (error instanceof HouseholdServiceError && error.code === 'HOUSEHOLD_EXISTS') {
      return context.json({
        message: error.message,
      }, 409)
    }

    if (error instanceof HouseholdServiceError && error.code === 'INVALID_INVITE_CODE') {
      return context.json({
        message: error.message,
      }, 404)
    }

    throw error
  }
})
