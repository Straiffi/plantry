import { Hono } from 'hono'

import { getAuthenticatedUser, getCurrentHouseholdFromContext, readJsonBody } from '../lib/http.js'
import type { AppEnv } from '../middleware/auth-session.js'
import { shoppingListService, ShoppingListServiceError } from '../services/shopping-list.js'

const parseQuantity = (value: unknown, defaultValue?: number) => {
  if (value === undefined) {
    return defaultValue
  }

  return typeof value === 'number' && Number.isInteger(value) ? value : NaN
}

const parseOptionalCategoryId = (value: unknown) => {
  if (value === null) {
    return null
  }

  return typeof value === 'string' ? value : undefined
}

export const shoppingListRoute = new Hono<AppEnv>()

shoppingListRoute.get('/', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  const shoppingList = await shoppingListService.getShoppingList(currentHousehold.household.id)

  return context.json(shoppingList)
})

shoppingListRoute.post('/items', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  const body = await readJsonBody(context)
  const categoryId = parseOptionalCategoryId(body?.categoryId)
  const itemId = typeof body?.itemId === 'string' ? body.itemId : undefined
  const name = typeof body?.name === 'string' ? body.name : undefined
  const quantity = parseQuantity(body?.quantity, 1)

  try {
    const item = await shoppingListService.addItemToShoppingList({
      categoryId,
      householdId: currentHousehold.household.id,
      itemId,
      name,
      quantity: quantity ?? 1,
      userId: user.id,
    })

    return context.json({ item }, 201)
  } catch (error) {
    if (error instanceof ShoppingListServiceError) {
      const status = error.code === 'ITEM_NOT_FOUND' ? 404 : 400

      return context.json({ message: error.message }, status)
    }

    throw error
  }
})

shoppingListRoute.patch('/items/:shoppingListItemId', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  const body = await readJsonBody(context)
  const quantity = parseQuantity(body?.quantity)

  try {
    const item = await shoppingListService.updateShoppingListItem({
      householdId: currentHousehold.household.id,
      quantity: quantity ?? NaN,
      shoppingListItemId: context.req.param('shoppingListItemId'),
    })

    return context.json({ item })
  } catch (error) {
    if (error instanceof ShoppingListServiceError) {
      const status = error.code === 'SHOPPING_LIST_ITEM_NOT_FOUND' ? 404 : 400

      return context.json({ message: error.message }, status)
    }

    throw error
  }
})

shoppingListRoute.post('/items/:shoppingListItemId/toggle-checked', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  try {
    const item = await shoppingListService.toggleShoppingListItemChecked(
      currentHousehold.household.id,
      context.req.param('shoppingListItemId'),
    )

    return context.json({ item })
  } catch (error) {
    if (error instanceof ShoppingListServiceError && error.code === 'SHOPPING_LIST_ITEM_NOT_FOUND') {
      return context.json({ message: error.message }, 404)
    }

    throw error
  }
})

shoppingListRoute.post('/delete-checked', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  const result = await shoppingListService.deleteCheckedShoppingListItems(currentHousehold.household.id)

  return context.json(result)
})

shoppingListRoute.delete('/items/:shoppingListItemId', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  try {
    await shoppingListService.deleteShoppingListItem(
      currentHousehold.household.id,
      context.req.param('shoppingListItemId'),
    )

    return context.body(null, 204)
  } catch (error) {
    if (error instanceof ShoppingListServiceError && error.code === 'SHOPPING_LIST_ITEM_NOT_FOUND') {
      return context.json({ message: error.message }, 404)
    }

    throw error
  }
})
