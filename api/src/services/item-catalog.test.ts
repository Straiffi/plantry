import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createItemCatalogService, ItemCatalogServiceError, normalizeItemName } from './item-catalog.js'

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
  normalizedName: string
  tags: Array<{ id: string; itemId: string; tag: string }>
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
    normalizedName: 'tomato',
    tags: [],
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

const createRepositoryMock = () => {
  const repository = {
    categoryHasItems: vi.fn(),
    deleteCategory: vi.fn(),
    deleteItemTag: vi.fn(),
    findCategoryById: vi.fn(),
    findItemById: vi.fn(),
    findItemByNormalizedName: vi.fn(),
    insertCategory: vi.fn(),
    insertItem: vi.fn(),
    insertItemTag: vi.fn(),
    listCategories: vi.fn(),
    listItems: vi.fn(),
    reorderCategories: vi.fn(),
    searchItems: vi.fn(),
    transaction: vi.fn(),
    updateCategory: vi.fn(),
    updateItem: vi.fn(),
  }

  repository.transaction.mockImplementation(async (callback) => callback(repository))

  return repository
}

describe('itemCatalogService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes item names by trimming, collapsing whitespace, and lowercasing', () => {
    expect(normalizeItemName('  Tomato   Paste  ')).toBe('tomato paste')
  })

  it('creates categories with trimmed names', async () => {
    const repository = createRepositoryMock()
    const service = createItemCatalogService(repository)
    const category = createCategory({ name: 'Produce' })

    repository.listCategories.mockResolvedValue([])
    repository.insertCategory.mockResolvedValue(category)

    await expect(service.createCategory({ householdId: 'household-1', name: '  Produce  ' })).resolves.toEqual(category)

    expect(repository.insertCategory).toHaveBeenCalledWith({
      householdId: 'household-1',
      name: 'Produce',
      sortOrder: 1,
    })
  })

  it('appends new categories to the end of the existing sort order', async () => {
    const repository = createRepositoryMock()
    const service = createItemCatalogService(repository)
    const category = createCategory({ id: 'category-3', name: 'Dairy', sortOrder: 3 })

    repository.listCategories.mockResolvedValue([
      createCategory({ id: 'category-1', sortOrder: 1 }),
      createCategory({ id: 'category-2', name: 'Pantry', sortOrder: 2 }),
    ])
    repository.insertCategory.mockResolvedValue(category)

    await expect(service.createCategory({ householdId: 'household-1', name: 'Dairy' })).resolves.toEqual(category)

    expect(repository.insertCategory).toHaveBeenCalledWith({
      householdId: 'household-1',
      name: 'Dairy',
      sortOrder: 3,
    })
  })

  it('reorders categories into contiguous sort order positions', async () => {
    const repository = createRepositoryMock()
    const service = createItemCatalogService(repository)
    const reorderedCategories = [
      createCategory({ id: 'category-3', name: 'Dairy', sortOrder: 1 }),
      createCategory({ id: 'category-1', name: 'Produce', sortOrder: 2 }),
      createCategory({ id: 'category-2', name: 'Pantry', sortOrder: 3 }),
    ]

    repository.listCategories
      .mockResolvedValueOnce([
        createCategory({ id: 'category-1', sortOrder: 1 }),
        createCategory({ id: 'category-2', name: 'Pantry', sortOrder: 2 }),
        createCategory({ id: 'category-3', name: 'Dairy', sortOrder: 3 }),
      ])
      .mockResolvedValueOnce(reorderedCategories)

    await expect(service.reorderCategories({
      householdId: 'household-1',
      orderedCategoryIds: ['category-3', 'category-1', 'category-2'],
    })).resolves.toEqual(reorderedCategories)

    expect(repository.reorderCategories).toHaveBeenCalledWith({
      householdId: 'household-1',
      orderedCategoryIds: ['category-3', 'category-1', 'category-2'],
      updatedAt: expect.any(Date),
    })
    expect(repository.transaction).toHaveBeenCalledTimes(1)
  })

  it('blocks category deletion while items still use the category', async () => {
    const repository = createRepositoryMock()
    const service = createItemCatalogService(repository)

    repository.findCategoryById.mockResolvedValue(createCategory())
    repository.categoryHasItems.mockResolvedValue(true)

    await expect(service.deleteCategory('category-1', 'household-1')).rejects.toMatchObject({
      code: 'CATEGORY_IN_USE',
    } satisfies Partial<ItemCatalogServiceError>)
  })

  it('restores archived items instead of creating duplicates', async () => {
    const repository = createRepositoryMock()
    const service = createItemCatalogService(repository)
    const archivedItem = createItem({ archivedAt: new Date('2026-01-05T00:00:00.000Z') })
    const restoredItem = createItem({ archivedAt: null })

    repository.findItemByNormalizedName.mockResolvedValue(archivedItem)
    repository.findItemById.mockResolvedValue(restoredItem)
    repository.updateItem.mockResolvedValue({ ...restoredItem })

    await expect(service.createItem({ householdId: 'household-1', name: ' tomato ', userId: 'user-1' })).resolves.toMatchObject({
      archivedAt: null,
      id: 'item-1',
      name: 'Tomato',
    })

    expect(repository.updateItem).toHaveBeenCalledWith(expect.objectContaining({
      archivedAt: null,
      householdId: 'household-1',
      itemId: 'item-1',
      normalizedName: 'tomato',
    }))
  })

  it('rejects active duplicate item names', async () => {
    const repository = createRepositoryMock()
    const service = createItemCatalogService(repository)

    repository.findItemByNormalizedName.mockResolvedValue(createItem())

    await expect(service.createItem({ householdId: 'household-1', name: 'Tomato', userId: 'user-1' })).rejects.toMatchObject({
      code: 'DUPLICATE_ITEM_NAME',
    } satisfies Partial<ItemCatalogServiceError>)
  })

  it('rejects item updates that collide with another normalized name', async () => {
    const repository = createRepositoryMock()
    const service = createItemCatalogService(repository)

    repository.findItemById.mockResolvedValue(createItem())
    repository.findItemByNormalizedName.mockResolvedValue(createItem({ id: 'item-2', name: 'Tomato Paste', normalizedName: 'tomato paste' }))

    await expect(service.updateItem({ householdId: 'household-1', itemId: 'item-1', name: 'Tomato Paste' })).rejects.toMatchObject({
      code: 'DUPLICATE_ITEM_NAME',
    } satisfies Partial<ItemCatalogServiceError>)
  })

  it('archives items by setting archivedAt and returning the refreshed item', async () => {
    const repository = createRepositoryMock()
    const service = createItemCatalogService(repository)
    const activeItem = createItem({ archivedAt: null })
    const archivedItem = createItem({ archivedAt: new Date('2026-01-05T00:00:00.000Z') })

    repository.findItemById.mockResolvedValueOnce(activeItem).mockResolvedValueOnce(archivedItem)
    repository.updateItem.mockResolvedValue({ ...archivedItem })

    await expect(service.archiveItem('household-1', 'item-1')).resolves.toMatchObject({
      id: 'item-1',
    })

    expect(repository.updateItem).toHaveBeenCalledWith(expect.objectContaining({
      householdId: 'household-1',
      itemId: 'item-1',
    }))
  })

  it('adds item tags and returns the refreshed item', async () => {
    const repository = createRepositoryMock()
    const service = createItemCatalogService(repository)
    const itemWithoutTags = createItem({ tags: [] })
    const itemWithTag = createItem({ tags: [{ id: 'tag-1', itemId: 'item-1', tag: 'fresh' }] })

    repository.findItemById.mockResolvedValueOnce(itemWithoutTags).mockResolvedValueOnce(itemWithTag)
    repository.insertItemTag.mockResolvedValue({ id: 'tag-1', itemId: 'item-1', tag: 'fresh' })

    await expect(service.addItemTag({ householdId: 'household-1', itemId: 'item-1', tag: ' fresh ' })).resolves.toMatchObject({
      tags: ['fresh'],
    })
  })

  it('searches household items with normalized prefixes and clamps the limit', async () => {
    const repository = createRepositoryMock()
    const service = createItemCatalogService(repository)

    repository.searchItems.mockResolvedValue([createItem()])

    await expect(service.searchItems({ householdId: 'household-1', limit: 100, query: '  To ' })).resolves.toHaveLength(1)

    expect(repository.searchItems).toHaveBeenCalledWith('household-1', 'to', 25)
  })
})
