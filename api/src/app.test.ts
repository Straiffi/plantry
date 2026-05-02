import { afterEach, describe, expect, it, vi } from 'vitest'

import { app } from './app.js'
import { auth } from './lib/auth.js'
import { householdService } from './services/household.js'
import { ItemCatalogServiceError, itemCatalogService } from './services/item-catalog.js'
import { recipeService, RecipeServiceError } from './services/recipes.js'
import { shoppingListService, ShoppingListServiceError } from './services/shopping-list.js'

type ProtectedRouteCase = {
  init?: RequestInit
  method: string
  path: string
}

const authenticatedSession = {
  session: {
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    expiresAt: new Date('2026-02-01T00:00:00.000Z'),
    id: 'session-1',
    ipAddress: null,
    token: 'token-1',
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    userAgent: 'vitest',
    userId: 'user-1',
  },
  user: {
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    email: 'user@example.com',
    emailVerified: true,
    id: 'user-1',
    image: null,
    name: 'Test User',
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
} satisfies NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

const currentHousehold = {
  household: {
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    id: 'household-1',
    name: 'Home',
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  membership: {
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    householdId: 'household-1',
    id: 'membership-1',
    role: 'owner',
    userId: 'user-1',
  },
}

const catalogItem = {
  archivedAt: null,
  category: null,
  categoryId: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdByUserId: 'user-1',
  householdId: 'household-1',
  id: 'item-1',
  name: 'Tomato',
  normalizedName: 'tomato',
  tags: ['fresh'],
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

const shoppingListItem = {
  checked: false,
  checkedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  householdId: 'household-1',
  id: 'shopping-list-item-1',
  item: {
    archivedAt: null,
    category: null,
    categoryId: null,
    id: 'item-1',
    name: 'Tomato',
  },
  itemId: 'item-1',
  quantity: 2,
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

const recipe = {
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdByUserId: 'user-1',
  householdId: 'household-1',
  id: 'recipe-1',
  items: [
    {
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      id: 'recipe-item-1',
      item: {
        archivedAt: null,
        category: null,
        categoryId: null,
        id: 'item-1',
        name: 'Tomato',
      },
      itemId: 'item-1',
      quantity: 2,
      recipeId: 'recipe-1',
      sortOrder: 0,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  ],
  notes: 'Fresh pasta sauce',
  recipeItems: [],
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  name: 'Tomato Pasta',
}

const protectedRouteCases: ProtectedRouteCase[] = [
  { method: 'GET', path: 'http://localhost/api/household' },
  { method: 'GET', path: 'http://localhost/api/invite-codes' },
  { init: { method: 'POST' }, method: 'POST', path: 'http://localhost/api/invite-codes' },
  { method: 'GET', path: 'http://localhost/api/categories' },
  { init: { method: 'POST' }, method: 'POST', path: 'http://localhost/api/categories' },
  { init: { method: 'PATCH' }, method: 'PATCH', path: 'http://localhost/api/categories/reorder' },
  { init: { method: 'PATCH' }, method: 'PATCH', path: 'http://localhost/api/categories/category-1' },
  { init: { method: 'DELETE' }, method: 'DELETE', path: 'http://localhost/api/categories/category-1' },
  { method: 'GET', path: 'http://localhost/api/items' },
  { method: 'GET', path: 'http://localhost/api/items/search?q=to&limit=5' },
  { init: { method: 'POST' }, method: 'POST', path: 'http://localhost/api/items' },
  { init: { method: 'PATCH' }, method: 'PATCH', path: 'http://localhost/api/items/item-1' },
  { init: { method: 'POST' }, method: 'POST', path: 'http://localhost/api/items/item-1/archive' },
  { init: { method: 'POST' }, method: 'POST', path: 'http://localhost/api/items/item-1/restore' },
  { init: { method: 'POST' }, method: 'POST', path: 'http://localhost/api/items/item-1/tags' },
  { init: { method: 'DELETE' }, method: 'DELETE', path: 'http://localhost/api/items/item-1/tags/fresh' },
  { method: 'GET', path: 'http://localhost/api/shopping-list' },
  { init: { method: 'POST' }, method: 'POST', path: 'http://localhost/api/shopping-list/items' },
  { init: { method: 'PATCH' }, method: 'PATCH', path: 'http://localhost/api/shopping-list/items/shopping-list-item-1' },
  { init: { method: 'POST' }, method: 'POST', path: 'http://localhost/api/shopping-list/items/shopping-list-item-1/toggle-checked' },
  { init: { method: 'POST' }, method: 'POST', path: 'http://localhost/api/shopping-list/delete-checked' },
  { init: { method: 'DELETE' }, method: 'DELETE', path: 'http://localhost/api/shopping-list/items/shopping-list-item-1' },
  { method: 'GET', path: 'http://localhost/api/recipes' },
  { method: 'GET', path: 'http://localhost/api/recipes/recipe-1' },
  { init: { method: 'POST' }, method: 'POST', path: 'http://localhost/api/recipes' },
  { init: { method: 'PATCH' }, method: 'PATCH', path: 'http://localhost/api/recipes/recipe-1' },
  { init: { method: 'POST' }, method: 'POST', path: 'http://localhost/api/recipes/recipe-1/add-to-shopping-list' },
  { init: { method: 'DELETE' }, method: 'DELETE', path: 'http://localhost/api/recipes/recipe-1' },
]

const householdScopedRouteCases: ProtectedRouteCase[] = [
  { method: 'GET', path: 'http://localhost/api/household' },
  { method: 'GET', path: 'http://localhost/api/invite-codes' },
  { init: { method: 'POST' }, method: 'POST', path: 'http://localhost/api/invite-codes' },
  { method: 'GET', path: 'http://localhost/api/categories' },
  { init: { method: 'POST' }, method: 'POST', path: 'http://localhost/api/categories' },
  { init: { method: 'PATCH' }, method: 'PATCH', path: 'http://localhost/api/categories/reorder' },
  { init: { method: 'PATCH' }, method: 'PATCH', path: 'http://localhost/api/categories/category-1' },
  { init: { method: 'DELETE' }, method: 'DELETE', path: 'http://localhost/api/categories/category-1' },
  { method: 'GET', path: 'http://localhost/api/items' },
  { method: 'GET', path: 'http://localhost/api/items/search?q=to&limit=5' },
  { init: { method: 'POST' }, method: 'POST', path: 'http://localhost/api/items' },
  { init: { method: 'PATCH' }, method: 'PATCH', path: 'http://localhost/api/items/item-1' },
  { init: { method: 'POST' }, method: 'POST', path: 'http://localhost/api/items/item-1/archive' },
  { init: { method: 'POST' }, method: 'POST', path: 'http://localhost/api/items/item-1/restore' },
  { init: { method: 'POST' }, method: 'POST', path: 'http://localhost/api/items/item-1/tags' },
  { init: { method: 'DELETE' }, method: 'DELETE', path: 'http://localhost/api/items/item-1/tags/fresh' },
  { method: 'GET', path: 'http://localhost/api/shopping-list' },
  { init: { method: 'POST' }, method: 'POST', path: 'http://localhost/api/shopping-list/items' },
  { init: { method: 'PATCH' }, method: 'PATCH', path: 'http://localhost/api/shopping-list/items/shopping-list-item-1' },
  { init: { method: 'POST' }, method: 'POST', path: 'http://localhost/api/shopping-list/items/shopping-list-item-1/toggle-checked' },
  { init: { method: 'POST' }, method: 'POST', path: 'http://localhost/api/shopping-list/delete-checked' },
  { init: { method: 'DELETE' }, method: 'DELETE', path: 'http://localhost/api/shopping-list/items/shopping-list-item-1' },
  { method: 'GET', path: 'http://localhost/api/recipes' },
  { method: 'GET', path: 'http://localhost/api/recipes/recipe-1' },
  { init: { method: 'POST' }, method: 'POST', path: 'http://localhost/api/recipes' },
  { init: { method: 'PATCH' }, method: 'PATCH', path: 'http://localhost/api/recipes/recipe-1' },
  { init: { method: 'POST' }, method: 'POST', path: 'http://localhost/api/recipes/recipe-1/add-to-shopping-list' },
  { init: { method: 'DELETE' }, method: 'DELETE', path: 'http://localhost/api/recipes/recipe-1' },
]

afterEach(() => {
  vi.restoreAllMocks()
})

describe('app', () => {
  it('returns an ok health response', async () => {
    const getSessionSpy = vi.spyOn(auth.api, 'getSession').mockRejectedValue(new Error('health should bypass auth middleware'))
    const response = await app.request('http://localhost/api/health')

    expect(response.status).toBe(200)
    expect(getSessionSpy).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      service: 'api',
      status: 'ok',
    })
  })

  it('rejects unauthenticated requests to /api/me', async () => {
    const response = await app.request('http://localhost/api/me')

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      message: 'Unauthorized',
    })
  })

  it.each(protectedRouteCases)('rejects unauthenticated protected route $method $path', async ({ init, path }) => {
    const response = await app.request(path, init)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      message: 'Unauthorized',
    })
  })

  it('returns authenticated user and household details from /api/me', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(currentHousehold)

    const response = await app.request('http://localhost/api/me')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      household: {
        id: 'household-1',
        name: 'Home',
      },
      householdMembership: {
        householdId: 'household-1',
        role: 'owner',
        userId: 'user-1',
      },
      session: {
        id: 'session-1',
        userId: 'user-1',
      },
      user: {
        email: 'user@example.com',
        id: 'user-1',
        name: 'Test User',
      },
    })
  })

  it('returns authenticated user details from /api/me even without a household yet', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(null)

    const response = await app.request('http://localhost/api/me')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      household: null,
      householdMembership: null,
      session: {
        id: 'session-1',
      },
      user: {
        id: 'user-1',
      },
    })
  })

  it.each(householdScopedRouteCases)('rejects household-scoped route $method $path when the user has no household', async ({ init, path }) => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(null)

    const response = await app.request(path, init)

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      message: 'Household not found',
    })
  })

  it('creates a household for an authenticated user', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(null)
    const createHouseholdSpy = vi.spyOn(householdService, 'createHousehold').mockResolvedValue({
      household: {
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        id: 'household-1',
        name: 'Home',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      membership: {
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        householdId: 'household-1',
        id: 'membership-1',
        role: 'owner',
        userId: 'user-1',
      },
    })

    const response = await app.request('http://localhost/api/household/create', {
      body: JSON.stringify({
        name: ' Home ',
      }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    })

    expect(response.status).toBe(201)
    expect(createHouseholdSpy).toHaveBeenCalledWith({
      name: 'Home',
      userId: 'user-1',
    })
  })

  it('joins a household from an invite code for an authenticated user', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(null)
    const joinHouseholdSpy = vi.spyOn(householdService, 'joinHouseholdByInviteCode').mockResolvedValue({
      household: {
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        id: 'household-1',
        name: 'Home',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      membership: {
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
        householdId: 'household-1',
        id: 'membership-2',
        role: 'member',
        userId: 'user-1',
      },
    })

    const response = await app.request('http://localhost/api/household/join', {
      body: JSON.stringify({
        code: ' invite-123 ',
      }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    })

    expect(response.status).toBe(200)
    expect(joinHouseholdSpy).toHaveBeenCalledWith({
      code: 'invite-123',
      userId: 'user-1',
    })
  })

  it('creates a category for the authenticated household', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(currentHousehold)
    const createCategorySpy = vi.spyOn(itemCatalogService, 'createCategory').mockResolvedValue({
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      householdId: 'household-1',
      id: 'category-1',
      name: 'Produce',
      sortOrder: 2,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    })

    const response = await app.request('http://localhost/api/categories', {
      body: JSON.stringify({
        name: ' Produce ',
        sortOrder: 2,
      }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    })

    expect(response.status).toBe(201)
    expect(createCategorySpy).toHaveBeenCalledWith({
      householdId: 'household-1',
      name: ' Produce ',
      sortOrder: 2,
    })
  })

  it('maps in-use category deletion to a conflict response', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(currentHousehold)
    vi.spyOn(itemCatalogService, 'deleteCategory').mockRejectedValue(
      new ItemCatalogServiceError('CATEGORY_IN_USE', 'Category cannot be deleted while products still use it'),
    )

    const response = await app.request('http://localhost/api/categories/category-1', {
      method: 'DELETE',
    })

    expect(response.status).toBe(409)
  })

  it('creates items for the authenticated household', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(currentHousehold)
    const createItemSpy = vi.spyOn(itemCatalogService, 'createItem').mockResolvedValue(catalogItem)

    const response = await app.request('http://localhost/api/items', {
      body: JSON.stringify({
        categoryId: null,
        name: ' Tomato ',
      }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    })

    expect(response.status).toBe(201)
    expect(createItemSpy).toHaveBeenCalledWith({
      categoryId: null,
      householdId: 'household-1',
      name: ' Tomato ',
      userId: 'user-1',
    })
  })

  it('updates items for the authenticated household', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(currentHousehold)
    const updateItemSpy = vi.spyOn(itemCatalogService, 'updateItem').mockResolvedValue(catalogItem)

    const response = await app.request('http://localhost/api/items/item-1', {
      body: JSON.stringify({
        name: ' Tomato Paste ',
      }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'PATCH',
    })

    expect(response.status).toBe(200)
    expect(updateItemSpy).toHaveBeenCalledWith({
      categoryId: undefined,
      householdId: 'household-1',
      itemId: 'item-1',
      name: ' Tomato Paste ',
    })
  })

  it('archives items for the authenticated household', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(currentHousehold)
    const archiveItemSpy = vi.spyOn(itemCatalogService, 'archiveItem').mockResolvedValue({
      ...catalogItem,
      archivedAt: new Date('2026-01-02T00:00:00.000Z'),
    })

    const response = await app.request('http://localhost/api/items/item-1/archive', {
      method: 'POST',
    })

    expect(response.status).toBe(200)
    expect(archiveItemSpy).toHaveBeenCalledWith('household-1', 'item-1')
  })

  it('restores items for the authenticated household', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(currentHousehold)
    const restoreItemSpy = vi.spyOn(itemCatalogService, 'restoreItem').mockResolvedValue(catalogItem)

    const response = await app.request('http://localhost/api/items/item-1/restore', {
      method: 'POST',
    })

    expect(response.status).toBe(200)
    expect(restoreItemSpy).toHaveBeenCalledWith('household-1', 'item-1')
  })

  it('adds tags to items for the authenticated household', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(currentHousehold)
    const addItemTagSpy = vi.spyOn(itemCatalogService, 'addItemTag').mockResolvedValue(catalogItem)

    const response = await app.request('http://localhost/api/items/item-1/tags', {
      body: JSON.stringify({
        tag: ' fresh ',
      }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    })

    expect(response.status).toBe(201)
    expect(addItemTagSpy).toHaveBeenCalledWith({
      householdId: 'household-1',
      itemId: 'item-1',
      tag: ' fresh ',
    })
  })

  it('deletes tags from items for the authenticated household', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(currentHousehold)
    const deleteItemTagSpy = vi.spyOn(itemCatalogService, 'deleteItemTag').mockResolvedValue(undefined)

    const response = await app.request('http://localhost/api/items/item-1/tags/fresh', {
      method: 'DELETE',
    })

    expect(response.status).toBe(204)
    expect(deleteItemTagSpy).toHaveBeenCalledWith('household-1', 'item-1', 'fresh')
  })

  it('searches items for the authenticated household', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(currentHousehold)
    const searchItemsSpy = vi.spyOn(itemCatalogService, 'searchItems').mockResolvedValue([catalogItem])

    const response = await app.request('http://localhost/api/items/search?q=to&limit=5')

    expect(response.status).toBe(200)
    expect(searchItemsSpy).toHaveBeenCalledWith({
      householdId: 'household-1',
      limit: 5,
      query: 'to',
    })
  })

  it('returns grouped shopping list data for the authenticated household', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(currentHousehold)
    const getShoppingListSpy = vi.spyOn(shoppingListService, 'getShoppingList').mockResolvedValue({
      groups: [
        {
          category: null,
          items: [shoppingListItem],
        },
      ],
      items: [shoppingListItem],
    })

    const response = await app.request('http://localhost/api/shopping-list')

    expect(response.status).toBe(200)
    expect(getShoppingListSpy).toHaveBeenCalledWith('household-1')
  })

  it('adds shopping list items for the authenticated household', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(currentHousehold)
    const addItemSpy = vi.spyOn(shoppingListService, 'addItemToShoppingList').mockResolvedValue(shoppingListItem)

    const response = await app.request('http://localhost/api/shopping-list/items', {
      body: JSON.stringify({
        itemId: 'item-1',
        quantity: 2,
      }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    })

    expect(response.status).toBe(201)
    expect(addItemSpy).toHaveBeenCalledWith({
      categoryId: undefined,
      householdId: 'household-1',
      itemId: 'item-1',
      name: undefined,
      quantity: 2,
      userId: 'user-1',
    })
  })

  it('updates shopping list quantities for the authenticated household', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(currentHousehold)
    const updateListItemSpy = vi.spyOn(shoppingListService, 'updateShoppingListItem').mockResolvedValue(shoppingListItem)

    const response = await app.request('http://localhost/api/shopping-list/items/shopping-list-item-1', {
      body: JSON.stringify({
        quantity: 3,
      }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'PATCH',
    })

    expect(response.status).toBe(200)
    expect(updateListItemSpy).toHaveBeenCalledWith({
      householdId: 'household-1',
      quantity: 3,
      shoppingListItemId: 'shopping-list-item-1',
    })
  })

  it('toggles shopping list rows for the authenticated household', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(currentHousehold)
    const toggleCheckedSpy = vi.spyOn(shoppingListService, 'toggleShoppingListItemChecked').mockResolvedValue({
      ...shoppingListItem,
      checked: true,
      checkedAt: new Date('2026-01-02T00:00:00.000Z'),
    })

    const response = await app.request('http://localhost/api/shopping-list/items/shopping-list-item-1/toggle-checked', {
      method: 'POST',
    })

    expect(response.status).toBe(200)
    expect(toggleCheckedSpy).toHaveBeenCalledWith('household-1', 'shopping-list-item-1')
  })

  it('deletes checked shopping list rows for the authenticated household', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(currentHousehold)
    const deleteCheckedSpy = vi.spyOn(shoppingListService, 'deleteCheckedShoppingListItems').mockResolvedValue({
      deletedCount: 2,
    })

    const response = await app.request('http://localhost/api/shopping-list/delete-checked', {
      method: 'POST',
    })

    expect(response.status).toBe(200)
    expect(deleteCheckedSpy).toHaveBeenCalledWith('household-1')
  })

  it('deletes a shopping list row for the authenticated household', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(currentHousehold)
    const deleteListItemSpy = vi.spyOn(shoppingListService, 'deleteShoppingListItem').mockResolvedValue(undefined)

    const response = await app.request('http://localhost/api/shopping-list/items/shopping-list-item-1', {
      method: 'DELETE',
    })

    expect(response.status).toBe(204)
    expect(deleteListItemSpy).toHaveBeenCalledWith('household-1', 'shopping-list-item-1')
  })

  it('maps missing shopping list rows to a not found response', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(currentHousehold)
    vi.spyOn(shoppingListService, 'toggleShoppingListItemChecked').mockRejectedValue(
      new ShoppingListServiceError('SHOPPING_LIST_ITEM_NOT_FOUND', 'Shopping list item not found'),
    )

    const response = await app.request('http://localhost/api/shopping-list/items/shopping-list-item-1/toggle-checked', {
      method: 'POST',
    })

    expect(response.status).toBe(404)
  })

  it('creates recipes for the authenticated household', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(currentHousehold)
    const createRecipeSpy = vi.spyOn(recipeService, 'createRecipe').mockResolvedValue(recipe)

    const response = await app.request('http://localhost/api/recipes', {
      body: JSON.stringify({
        items: [
          {
            itemId: 'item-1',
            quantity: 2,
          },
        ],
        name: ' Tomato Pasta ',
        notes: ' Fresh pasta sauce ',
      }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    })

    expect(response.status).toBe(201)
    expect(createRecipeSpy).toHaveBeenCalledWith({
      householdId: 'household-1',
      items: [
        {
          categoryId: undefined,
          itemId: 'item-1',
          name: undefined,
          quantity: 2,
          sortOrder: undefined,
        },
      ],
      name: ' Tomato Pasta ',
      notes: ' Fresh pasta sauce ',
      userId: 'user-1',
    })
  })

  it('lists recipes for the authenticated household', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(currentHousehold)
    const listRecipesSpy = vi.spyOn(recipeService, 'listRecipes').mockResolvedValue([recipe])

    const response = await app.request('http://localhost/api/recipes')

    expect(response.status).toBe(200)
    expect(listRecipesSpy).toHaveBeenCalledWith('household-1')
  })

  it('gets a single recipe for the authenticated household', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(currentHousehold)
    const getRecipeSpy = vi.spyOn(recipeService, 'getRecipe').mockResolvedValue(recipe)

    const response = await app.request('http://localhost/api/recipes/recipe-1')

    expect(response.status).toBe(200)
    expect(getRecipeSpy).toHaveBeenCalledWith('household-1', 'recipe-1')
  })

  it('updates recipes for the authenticated household', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(currentHousehold)
    const updateRecipeSpy = vi.spyOn(recipeService, 'updateRecipe').mockResolvedValue(recipe)

    const response = await app.request('http://localhost/api/recipes/recipe-1', {
      body: JSON.stringify({
        items: [
          {
            name: ' Tomato ',
            quantity: 3,
          },
        ],
        notes: null,
      }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'PATCH',
    })

    expect(response.status).toBe(200)
    expect(updateRecipeSpy).toHaveBeenCalledWith({
      householdId: 'household-1',
      items: [
        {
          categoryId: undefined,
          itemId: undefined,
          name: ' Tomato ',
          quantity: 3,
          sortOrder: undefined,
        },
      ],
      name: undefined,
      notes: null,
      recipeId: 'recipe-1',
      userId: 'user-1',
    })
  })

  it('adds recipe rows to the shopping list for the authenticated household', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(currentHousehold)
    const addRecipeToShoppingListSpy = vi.spyOn(recipeService, 'addRecipeToShoppingList').mockResolvedValue({
      items: [shoppingListItem],
      recipe,
    })

    const response = await app.request('http://localhost/api/recipes/recipe-1/add-to-shopping-list', {
      method: 'POST',
    })

    expect(response.status).toBe(200)
    expect(addRecipeToShoppingListSpy).toHaveBeenCalledWith('household-1', 'recipe-1', 'user-1')
  })

  it('deletes recipes for the authenticated household', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(currentHousehold)
    const deleteRecipeSpy = vi.spyOn(recipeService, 'deleteRecipe').mockResolvedValue(undefined)

    const response = await app.request('http://localhost/api/recipes/recipe-1', {
      method: 'DELETE',
    })

    expect(response.status).toBe(204)
    expect(deleteRecipeSpy).toHaveBeenCalledWith('household-1', 'recipe-1')
  })

  it('maps duplicate recipe rows to a conflict response', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(authenticatedSession)
    vi.spyOn(householdService, 'getCurrentHouseholdForUser').mockResolvedValue(currentHousehold)
    vi.spyOn(recipeService, 'createRecipe').mockRejectedValue(
      new RecipeServiceError('DUPLICATE_RECIPE_ITEM', 'Recipe items must be unique by item'),
    )

    const response = await app.request('http://localhost/api/recipes', {
      body: JSON.stringify({
        items: [
          {
            itemId: 'item-1',
            quantity: 1,
          },
        ],
        name: 'Pasta',
      }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    })

    expect(response.status).toBe(409)
  })
})
