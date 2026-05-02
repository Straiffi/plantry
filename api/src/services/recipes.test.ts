import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createRecipeService, RecipeServiceError } from './recipes.js'

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

const createRecipe = (overrides: Partial<{
  createdAt: Date
  createdByUserId: string
  householdId: string
  id: string
  name: string
  notes: string | null
  recipeItems: Array<{
    createdAt: Date
    id: string
    item: ReturnType<typeof createItem>
    itemId: string
    quantity: number
    recipeId: string
    sortOrder: number
    updatedAt: Date
  }>
  updatedAt: Date
}> = {}) => {
  return {
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    createdByUserId: 'user-1',
    householdId: 'household-1',
    id: 'recipe-1',
    name: 'Pasta',
    notes: null,
    recipeItems: [],
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

const createRecipeItem = (overrides: Partial<{
  createdAt: Date
  id: string
  item: ReturnType<typeof createItem>
  itemId: string
  quantity: number
  recipeId: string
  sortOrder: number
  updatedAt: Date
}> = {}) => {
  const item = createItem(overrides.item ?? {})

  return {
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    id: 'recipe-item-1',
    item,
    itemId: item.id,
    quantity: 1,
    recipeId: 'recipe-1',
    sortOrder: 0,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

const createRepositoryMock = () => {
  const repository = {
    deleteRecipe: vi.fn(),
    deleteRecipeItems: vi.fn(),
    findItemById: vi.fn(),
    findRecipeById: vi.fn(),
    insertRecipe: vi.fn(),
    insertRecipeItem: vi.fn(),
    listRecipes: vi.fn(),
    transaction: vi.fn(),
    updateItemArchivedAt: vi.fn(),
    updateRecipe: vi.fn(),
  }

  repository.transaction.mockImplementation(async (callback) => callback(repository))

  return repository
}

describe('recipeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates name-only recipes with normalized names', async () => {
    const repository = createRepositoryMock()
    const service = createRecipeService(repository, {
      addItemToShoppingList: vi.fn(),
      findOrCreateItem: vi.fn(),
    })
    const recipeRecord = createRecipe({ name: 'Weeknight Pasta' })

    repository.insertRecipe.mockResolvedValue(recipeRecord)
    repository.findRecipeById.mockResolvedValue(recipeRecord)

    await expect(service.createRecipe({ householdId: 'household-1', name: '  Weeknight   Pasta  ', userId: 'user-1' })).resolves.toMatchObject({
      items: [],
      name: 'Weeknight Pasta',
    })

    expect(repository.insertRecipe).toHaveBeenCalledWith({
      createdByUserId: 'user-1',
      householdId: 'household-1',
      name: 'Weeknight Pasta',
      notes: null,
    })
  })

  it('creates recipe rows from free-text items via item catalog', async () => {
    const repository = createRepositoryMock()
    const findOrCreateItem = vi.fn().mockResolvedValue({ id: 'item-2' })
    const service = createRecipeService(repository, {
      addItemToShoppingList: vi.fn(),
      findOrCreateItem,
    })
    const recipeRecord = createRecipe({
      recipeItems: [
        createRecipeItem({
          id: 'recipe-item-2',
          item: createItem({ id: 'item-2', name: 'Basil' }),
          itemId: 'item-2',
          quantity: 2,
        }),
      ],
    })

    repository.insertRecipe.mockResolvedValue(recipeRecord)
    repository.insertRecipeItem.mockResolvedValue({
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      id: 'recipe-item-2',
      itemId: 'item-2',
      quantity: 2,
      recipeId: 'recipe-1',
      sortOrder: 0,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    })
    repository.findRecipeById.mockResolvedValue(recipeRecord)

    await expect(service.createRecipe({
      householdId: 'household-1',
      items: [{ name: ' Basil ', quantity: 2 }],
      name: 'Pasta',
      userId: 'user-1',
    })).resolves.toMatchObject({
      items: [
        {
          item: {
            id: 'item-2',
            name: 'Basil',
          },
          quantity: 2,
        },
      ],
    })

    expect(findOrCreateItem).toHaveBeenCalledWith({
      categoryId: undefined,
      householdId: 'household-1',
      name: ' Basil ',
      userId: 'user-1',
    })
  })

  it('rejects duplicate recipe items after resolution', async () => {
    const repository = createRepositoryMock()
    const service = createRecipeService(repository, {
      addItemToShoppingList: vi.fn(),
      findOrCreateItem: vi.fn(),
    })

    repository.findItemById.mockResolvedValue(createItem())
    repository.insertRecipe.mockResolvedValue(createRecipe())

    await expect(service.createRecipe({
      householdId: 'household-1',
      items: [
        { itemId: 'item-1', quantity: 1 },
        { itemId: 'item-1', quantity: 2 },
      ],
      name: 'Salad',
      userId: 'user-1',
    })).rejects.toMatchObject({
      code: 'DUPLICATE_RECIPE_ITEM',
    } satisfies Partial<RecipeServiceError>)
  })

  it('updates recipes by replacing the recipe item rows when items are provided', async () => {
    const repository = createRepositoryMock()
    const service = createRecipeService(repository, {
      addItemToShoppingList: vi.fn(),
      findOrCreateItem: vi.fn(),
    })
    const existingRecipe = createRecipe({
      recipeItems: [createRecipeItem({ itemId: 'item-1' })],
    })
    const updatedRecipe = createRecipe({
      name: 'Updated Pasta',
      recipeItems: [createRecipeItem({ itemId: 'item-2', item: createItem({ id: 'item-2', name: 'Garlic' }) })],
    })

    repository.findRecipeById.mockResolvedValueOnce(existingRecipe).mockResolvedValueOnce(updatedRecipe)
    repository.updateRecipe.mockResolvedValue(updatedRecipe)
    repository.findItemById.mockResolvedValue(createItem({ id: 'item-2', name: 'Garlic' }))

    await expect(service.updateRecipe({
      householdId: 'household-1',
      items: [{ itemId: 'item-2', quantity: 3 }],
      name: 'Updated Pasta',
      recipeId: 'recipe-1',
      userId: 'user-1',
    })).resolves.toMatchObject({
      items: [
        {
          item: {
            id: 'item-2',
          },
          quantity: 1,
        },
      ],
      name: 'Updated Pasta',
    })

    expect(repository.deleteRecipeItems).toHaveBeenCalledWith('recipe-1')
    expect(repository.insertRecipeItem).toHaveBeenCalledWith({
      itemId: 'item-2',
      quantity: 3,
      recipeId: 'recipe-1',
      sortOrder: 0,
    })
  })

  it('adds recipe rows to the shopping list using the existing shopping list service', async () => {
    const repository = createRepositoryMock()
    const addItemToShoppingList = vi.fn().mockResolvedValue({
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
    })
    const service = createRecipeService(repository, {
      addItemToShoppingList,
      findOrCreateItem: vi.fn(),
    })
    const recipeRecord = createRecipe({
      recipeItems: [createRecipeItem({ itemId: 'item-1', quantity: 2 })],
    })

    repository.findRecipeById.mockResolvedValue(recipeRecord)

    await expect(service.addRecipeToShoppingList('household-1', 'recipe-1', 'user-1')).resolves.toMatchObject({
      items: [
        {
          itemId: 'item-1',
          quantity: 2,
        },
      ],
      recipe: {
        id: 'recipe-1',
      },
    })

    expect(addItemToShoppingList).toHaveBeenCalledWith({
      householdId: 'household-1',
      itemId: 'item-1',
      quantity: 2,
      userId: 'user-1',
    })
  })

  it('deletes recipes with hard delete semantics', async () => {
    const repository = createRepositoryMock()
    const service = createRecipeService(repository, {
      addItemToShoppingList: vi.fn(),
      findOrCreateItem: vi.fn(),
    })

    repository.deleteRecipe.mockResolvedValue(true)

    await expect(service.deleteRecipe('household-1', 'recipe-1')).resolves.toBeUndefined()
  })
})
