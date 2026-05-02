import { afterEach, describe, expect, it, vi } from 'vitest'

import { app } from './app.js'
import { auth } from './lib/auth.js'
import { householdService } from './services/household.js'
import { ItemCatalogServiceError, itemCatalogService } from './services/item-catalog.js'

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

afterEach(() => {
  vi.restoreAllMocks()
})

describe('app', () => {
  it('returns an ok health response', async () => {
    const response = await app.request('http://localhost/api/health')

    expect(response.status).toBe(200)
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
})
