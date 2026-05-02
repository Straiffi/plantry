import { Hono } from 'hono'

import { getAuthenticatedUser, getCurrentHouseholdFromContext, readJsonBody } from '../lib/http.js'
import type { AppEnv } from '../middleware/auth-session.js'
import { ItemCatalogServiceError, itemCatalogService } from '../services/item-catalog.js'

const parseOptionalCategoryId = (value: unknown) => {
  if (value === null) {
    return null
  }

  return typeof value === 'string' ? value : undefined
}

const parsePositiveLimit = (value: string | undefined) => {
  if (!value) {
    return undefined
  }

  const parsed = Number.parseInt(value, 10)

  return Number.isNaN(parsed) ? undefined : parsed
}

export const itemsRoute = new Hono<AppEnv>()

itemsRoute.get('/', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  const includeArchived = context.req.query('includeArchived') === 'true'
  const catalogItems = await itemCatalogService.listItems(currentHousehold.household.id, includeArchived)

  return context.json({ items: catalogItems })
})

itemsRoute.get('/search', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  const foundItems = await itemCatalogService.searchItems({
    householdId: currentHousehold.household.id,
    limit: parsePositiveLimit(context.req.query('limit')),
    query: context.req.query('q') ?? '',
  })

  return context.json({ items: foundItems })
})

itemsRoute.post('/', async (context) => {
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
  const categoryId = parseOptionalCategoryId(body?.categoryId)

  try {
    const item = await itemCatalogService.createItem({
      categoryId,
      householdId: currentHousehold.household.id,
      name,
      userId: user.id,
    })

    return context.json({ item }, 201)
  } catch (error) {
    if (error instanceof ItemCatalogServiceError && (error.code === 'INVALID_CATEGORY' || error.code === 'INVALID_NAME')) {
      return context.json({ message: error.message }, 400)
    }

    if (error instanceof ItemCatalogServiceError && error.code === 'DUPLICATE_ITEM_NAME') {
      return context.json({ message: error.message }, 409)
    }

    throw error
  }
})

itemsRoute.patch('/:id', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  const body = await readJsonBody(context)
  const itemId = context.req.param('id')
  const name = typeof body?.name === 'string' ? body.name : undefined
  const categoryId = parseOptionalCategoryId(body?.categoryId)

  if (name === undefined && categoryId === undefined) {
    return context.json({ message: 'At least one item field is required' }, 400)
  }

  try {
    const item = await itemCatalogService.updateItem({
      categoryId,
      householdId: currentHousehold.household.id,
      itemId,
      name,
    })

    return context.json({ item })
  } catch (error) {
    if (error instanceof ItemCatalogServiceError && (error.code === 'INVALID_CATEGORY' || error.code === 'INVALID_NAME')) {
      return context.json({ message: error.message }, 400)
    }

    if (error instanceof ItemCatalogServiceError && error.code === 'ITEM_NOT_FOUND') {
      return context.json({ message: error.message }, 404)
    }

    if (error instanceof ItemCatalogServiceError && error.code === 'DUPLICATE_ITEM_NAME') {
      return context.json({ message: error.message }, 409)
    }

    throw error
  }
})

itemsRoute.post('/:id/archive', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  try {
    const item = await itemCatalogService.archiveItem(currentHousehold.household.id, context.req.param('id'))

    return context.json({ item })
  } catch (error) {
    if (error instanceof ItemCatalogServiceError && error.code === 'ITEM_NOT_FOUND') {
      return context.json({ message: error.message }, 404)
    }

    throw error
  }
})

itemsRoute.post('/:id/restore', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  try {
    const item = await itemCatalogService.restoreItem(currentHousehold.household.id, context.req.param('id'))

    return context.json({ item })
  } catch (error) {
    if (error instanceof ItemCatalogServiceError && error.code === 'ITEM_NOT_FOUND') {
      return context.json({ message: error.message }, 404)
    }

    throw error
  }
})

itemsRoute.post('/:id/tags', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  const body = await readJsonBody(context)
  const tag = typeof body?.tag === 'string' ? body.tag : ''

  try {
    const item = await itemCatalogService.addItemTag({
      householdId: currentHousehold.household.id,
      itemId: context.req.param('id'),
      tag,
    })

    return context.json({ item }, 201)
  } catch (error) {
    if (error instanceof ItemCatalogServiceError && (error.code === 'INVALID_TAG' || error.code === 'ITEM_NOT_FOUND')) {
      return context.json({ message: error.message }, error.code === 'ITEM_NOT_FOUND' ? 404 : 400)
    }

    if (error instanceof ItemCatalogServiceError && error.code === 'DUPLICATE_TAG') {
      return context.json({ message: error.message }, 409)
    }

    throw error
  }
})

itemsRoute.delete('/:id/tags/:tag', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  try {
    await itemCatalogService.deleteItemTag(
      currentHousehold.household.id,
      context.req.param('id'),
      context.req.param('tag'),
    )

    return context.body(null, 204)
  } catch (error) {
    if (error instanceof ItemCatalogServiceError && (error.code === 'ITEM_NOT_FOUND' || error.code === 'TAG_NOT_FOUND')) {
      return context.json({ message: error.message }, 404)
    }

    throw error
  }
})
