import { Hono } from 'hono'

import { getAuthenticatedUser, getCurrentHouseholdFromContext } from '../lib/http.js'
import type { AppEnv } from '../middleware/auth-session.js'
import { menuService, MenuServiceError } from '../services/menu.js'

const mapMenuError = (error: MenuServiceError) => {
  if (error.code === 'MENU_ITEM_NOT_FOUND' || error.code === 'RECIPE_NOT_FOUND') {
    return 404
  }

  return 400
}

export const menuRoute = new Hono<AppEnv>()

menuRoute.get('/', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  const menu = await menuService.getMenu(currentHousehold.household.id)

  return context.json(menu)
})

menuRoute.post('/items/:menuItemId/toggle-checked', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  try {
    const item = await menuService.toggleMenuItemChecked(currentHousehold.household.id, context.req.param('menuItemId'))

    return context.json({ item })
  } catch (error) {
    if (error instanceof MenuServiceError) {
      return context.json({ message: error.message }, mapMenuError(error))
    }

    throw error
  }
})

menuRoute.post('/delete-checked', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  const result = await menuService.deleteCheckedMenuItems(currentHousehold.household.id)

  return context.json(result)
})

menuRoute.post('/items/:menuItemId/add-to-shopping-list', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  try {
    const result = await menuService.addMenuItemToShoppingList(
      currentHousehold.household.id,
      context.req.param('menuItemId'),
      user.id,
    )

    return context.json(result)
  } catch (error) {
    if (error instanceof MenuServiceError) {
      return context.json({ message: error.message }, mapMenuError(error))
    }

    throw error
  }
})

menuRoute.post('/add-to-shopping-list', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  const result = await menuService.addUncheckedMenuToShoppingList(currentHousehold.household.id, user.id)

  return context.json(result)
})
