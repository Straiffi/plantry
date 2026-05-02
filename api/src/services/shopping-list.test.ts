import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createShoppingListService, ShoppingListServiceError } from './shopping-list.js'

const createCategory = (overrides: Partial<{ createdAt: Date; householdId: string; id: string; name: string; sortOrder: number; updatedAt: Date }> = {}) => {
  return {
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    householdId: 'household-1',
    id: 'category-1',
    name: 'Produce',
    sortOrder: 0,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

const createItem = (overrides: Partial<{
  archivedAt: Date | null
  category: ReturnType<typeof createCategory> | null
  categoryId: string | null
  createdAt: Date
  createdByUserId: string
  householdId: string
  id: string
  name: string
  updatedAt: Date
}> = {}) => {
  return {
    archivedAt: null,
    category: null,
    categoryId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    createdByUserId: 'user-1',
    householdId: 'household-1',
    id: 'item-1',
    name: 'Tomato',
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

const createShoppingListItem = (overrides: Partial<{
  checked: boolean
  checkedAt: Date | null
  createdAt: Date
  householdId: string
  id: string
  item: ReturnType<typeof createItem>
  itemId: string
  quantity: number
  updatedAt: Date
}> = {}) => {
  const item = createItem(overrides.item ?? {})

  return {
    checked: false,
    checkedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    householdId: 'household-1',
    id: 'list-item-1',
    item,
    itemId: item.id,
    quantity: 1,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

const createRepositoryMock = () => {
  const repository = {
    deleteCheckedItems: vi.fn(),
    deleteShoppingListItem: vi.fn(),
    findItemById: vi.fn(),
    findShoppingListItemById: vi.fn(),
    findShoppingListItemByItemId: vi.fn(),
    insertShoppingListItem: vi.fn(),
    listShoppingListItems: vi.fn(),
    transaction: vi.fn(),
    updateItemArchivedAt: vi.fn(),
    updateShoppingListItem: vi.fn(),
  }

  repository.transaction.mockImplementation(async (callback) => callback(repository))

  return repository
}

describe('shoppingListService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('groups shopping list items by category and sorts unchecked items first', async () => {
    const repository = createRepositoryMock()
    const service = createShoppingListService(repository)
    const produce = createCategory({ id: 'category-1', name: 'Produce', sortOrder: 1 })
    const pantry = createCategory({ id: 'category-2', name: 'Pantry', sortOrder: 0 })

    repository.listShoppingListItems.mockResolvedValue([
      createShoppingListItem({
        checked: true,
        id: 'list-item-2',
        item: createItem({ category: produce, categoryId: produce.id, id: 'item-2', name: 'Tomato' }),
      }),
      createShoppingListItem({
        checked: false,
        id: 'list-item-1',
        item: createItem({ category: produce, categoryId: produce.id, id: 'item-1', name: 'Apple' }),
      }),
      createShoppingListItem({
        checked: false,
        id: 'list-item-3',
        item: createItem({ category: pantry, categoryId: pantry.id, id: 'item-3', name: 'Beans' }),
      }),
    ])

    const result = await service.getShoppingList('household-1')

    expect(result.groups).toHaveLength(2)
    expect(result.groups[0]?.category?.name).toBe('Pantry')
    expect(result.groups[1]?.items.map((item) => item.item.name)).toEqual(['Apple', 'Tomato'])
  })

  it('adds quantities onto an existing shopping list row and clears checked state', async () => {
    const repository = createRepositoryMock()
    const service = createShoppingListService(repository)
    const existingListItem = createShoppingListItem({
      checked: true,
      checkedAt: new Date('2026-01-03T00:00:00.000Z'),
      quantity: 2,
    })
    const refreshedListItem = createShoppingListItem({
      checked: false,
      checkedAt: null,
      quantity: 5,
    })

    repository.findItemById.mockResolvedValue(createItem())
    repository.findShoppingListItemByItemId.mockResolvedValue(existingListItem)
    repository.findShoppingListItemById.mockResolvedValue(refreshedListItem)
    repository.updateShoppingListItem.mockResolvedValue({ ...refreshedListItem })

    await expect(service.addItemToShoppingList({ householdId: 'household-1', itemId: 'item-1', quantity: 3, userId: 'user-1' })).resolves.toMatchObject({
      checked: false,
      quantity: 5,
    })

    expect(repository.updateShoppingListItem).toHaveBeenCalledWith(expect.objectContaining({
      checked: false,
      checkedAt: null,
      householdId: 'household-1',
      quantity: 5,
    }))
  })

  it('creates missing items from free text before adding them to the shopping list', async () => {
    const repository = createRepositoryMock()
    const findOrCreateItem = vi.fn().mockResolvedValue({ id: 'item-2' })
    const service = createShoppingListService(repository, { findOrCreateItem })
    const createdListItem = createShoppingListItem({
      id: 'list-item-2',
      item: createItem({ id: 'item-2', name: 'Pasta' }),
      itemId: 'item-2',
      quantity: 2,
    })

    repository.findShoppingListItemByItemId.mockResolvedValue(null)
    repository.insertShoppingListItem.mockResolvedValue({
      checked: false,
      checkedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      householdId: 'household-1',
      id: 'list-item-2',
      itemId: 'item-2',
      quantity: 2,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    })
    repository.findShoppingListItemById.mockResolvedValue(createdListItem)

    await expect(service.addItemToShoppingList({ householdId: 'household-1', name: ' Pasta ', quantity: 2, userId: 'user-1' })).resolves.toMatchObject({
      item: {
        id: 'item-2',
        name: 'Pasta',
      },
      quantity: 2,
    })

    expect(findOrCreateItem).toHaveBeenCalledWith({
      categoryId: undefined,
      householdId: 'household-1',
      name: ' Pasta ',
      userId: 'user-1',
    })
  })

  it('rejects invalid shopping list quantities', async () => {
    const repository = createRepositoryMock()
    const service = createShoppingListService(repository)

    await expect(service.addItemToShoppingList({ householdId: 'household-1', itemId: 'item-1', quantity: 0, userId: 'user-1' })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    } satisfies Partial<ShoppingListServiceError>)
  })

  it('toggles checked rows and persists checkedAt', async () => {
    const repository = createRepositoryMock()
    const service = createShoppingListService(repository)
    const existingListItem = createShoppingListItem({ checked: false })
    const updatedListItem = createShoppingListItem({ checked: true, checkedAt: new Date('2026-01-04T00:00:00.000Z') })

    repository.findShoppingListItemById.mockResolvedValueOnce(existingListItem).mockResolvedValueOnce(updatedListItem)
    repository.updateShoppingListItem.mockResolvedValue({ ...updatedListItem })

    await expect(service.toggleShoppingListItemChecked('household-1', 'list-item-1')).resolves.toMatchObject({
      checked: true,
    })

    expect(repository.updateShoppingListItem).toHaveBeenCalledWith(expect.objectContaining({
      checked: true,
      householdId: 'household-1',
      shoppingListItemId: 'list-item-1',
    }))
  })

  it('deletes checked shopping list rows and returns the deleted count', async () => {
    const repository = createRepositoryMock()
    const service = createShoppingListService(repository)

    repository.deleteCheckedItems.mockResolvedValue(3)

    await expect(service.deleteCheckedShoppingListItems('household-1')).resolves.toEqual({
      deletedCount: 3,
    })
  })
})
