import { Hono } from 'hono'

import { getAuthenticatedUser, getCurrentHouseholdFromContext, readJsonBody } from '../lib/http.js'
import type { AppEnv } from '../middleware/auth-session.js'
import { ItemCatalogServiceError, itemCatalogService } from '../services/item-catalog.js'

const parseSortOrder = (value: unknown) => {
  return typeof value === 'number' && Number.isInteger(value) ? value : undefined
}

export const categoriesRoute = new Hono<AppEnv>()

categoriesRoute.get('/', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  const categories = await itemCatalogService.listCategories(currentHousehold.household.id)

  return context.json({ categories })
})

categoriesRoute.post('/', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  const body = await readJsonBody(context)
  const name = typeof body?.name === 'string' ? body.name : ''
  const sortOrder = parseSortOrder(body?.sortOrder)

  try {
    const category = await itemCatalogService.createCategory({
      householdId: currentHousehold.household.id,
      name,
      sortOrder,
    })

    return context.json({ category }, 201)
  } catch (error) {
    if (error instanceof ItemCatalogServiceError && error.code === 'INVALID_NAME') {
      return context.json({ message: error.message }, 400)
    }

    if (error instanceof ItemCatalogServiceError && error.code === 'DUPLICATE_CATEGORY_NAME') {
      return context.json({ message: error.message }, 409)
    }

    throw error
  }
})

categoriesRoute.patch('/:id', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  const body = await readJsonBody(context)
  const categoryId = context.req.param('id')
  const name = typeof body?.name === 'string' ? body.name : undefined
  const sortOrder = parseSortOrder(body?.sortOrder)

  if (name === undefined && sortOrder === undefined) {
    return context.json({ message: 'At least one category field is required' }, 400)
  }

  try {
    const category = await itemCatalogService.updateCategory({
      categoryId,
      householdId: currentHousehold.household.id,
      name,
      sortOrder,
    })

    return context.json({ category })
  } catch (error) {
    if (error instanceof ItemCatalogServiceError && error.code === 'INVALID_NAME') {
      return context.json({ message: error.message }, 400)
    }

    if (error instanceof ItemCatalogServiceError && error.code === 'CATEGORY_NOT_FOUND') {
      return context.json({ message: error.message }, 404)
    }

    if (error instanceof ItemCatalogServiceError && error.code === 'DUPLICATE_CATEGORY_NAME') {
      return context.json({ message: error.message }, 409)
    }

    throw error
  }
})

categoriesRoute.delete('/:id', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  try {
    await itemCatalogService.deleteCategory(context.req.param('id'), currentHousehold.household.id)

    return context.body(null, 204)
  } catch (error) {
    if (error instanceof ItemCatalogServiceError && error.code === 'CATEGORY_NOT_FOUND') {
      return context.json({ message: error.message }, 404)
    }

    if (error instanceof ItemCatalogServiceError && error.code === 'CATEGORY_IN_USE') {
      return context.json({ message: error.message }, 409)
    }

    throw error
  }
})
