import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMenuService, MenuServiceError } from './menu.js'

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

const createRecipe = (overrides: Partial<{
  createdAt: Date
  createdByUserId: string
  householdId: string
  id: string
  name: string
  notes: string | null
  recipeItems: ReturnType<typeof createRecipeItem>[]
  updatedAt: Date
}> = {}) => {
  return {
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    createdByUserId: 'user-1',
    householdId: 'household-1',
    id: 'recipe-1',
    name: 'Pasta',
    notes: null,
    recipeItems: [createRecipeItem()],
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

const createMenuItem = (overrides: Partial<{
  checked: boolean
  checkedAt: Date | null
  createdAt: Date
  householdId: string
  id: string
  lastAddedAt: Date
  recipe: ReturnType<typeof createRecipe>
  recipeId: string
  updatedAt: Date
}> = {}) => {
  const recipe = createRecipe(overrides.recipe ?? {})

  return {
    checked: false,
    checkedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    householdId: 'household-1',
    id: 'menu-item-1',
    lastAddedAt: new Date('2026-01-02T00:00:00.000Z'),
    recipe,
    recipeId: recipe.id,
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  }
}

const createRepositoryMock = () => {
  return {
    deleteCheckedItems: vi.fn(),
    findMenuItemById: vi.fn(),
    findMenuItemByRecipeId: vi.fn(),
    findRecipeById: vi.fn(),
    insertMenuItem: vi.fn(),
    listMenuItems: vi.fn(),
    updateMenuItem: vi.fn(),
  }
}

describe('menuService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns menu items in last added order', async () => {
    const repository = createRepositoryMock()
    const service = createMenuService(repository)

    repository.listMenuItems.mockResolvedValue([
      createMenuItem({
        id: 'menu-item-2',
        lastAddedAt: new Date('2026-01-03T00:00:00.000Z'),
        recipe: createRecipe({ id: 'recipe-2', name: 'Toast' }),
        recipeId: 'recipe-2',
      }),
      createMenuItem({
        id: 'menu-item-1',
        lastAddedAt: new Date('2026-01-02T00:00:00.000Z'),
        recipe: createRecipe({ id: 'recipe-1', name: 'Pasta' }),
        recipeId: 'recipe-1',
      }),
    ])

    const result = await service.getMenu('household-1')

    expect(result.items.map((item) => item.recipe.name)).toEqual(['Pasta', 'Toast'])
  })

  it('creates a menu row for a recipe that is not yet on the menu', async () => {
    const repository = createRepositoryMock()
    const service = createMenuService(repository)
    const recipe = createRecipe()
    const createdMenuItem = createMenuItem({ recipe })

    repository.findRecipeById.mockResolvedValue(recipe)
    repository.findMenuItemByRecipeId.mockResolvedValue(null)
    repository.insertMenuItem.mockResolvedValue({
      checked: false,
      checkedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      householdId: 'household-1',
      id: 'menu-item-1',
      lastAddedAt: new Date('2026-01-02T00:00:00.000Z'),
      recipeId: 'recipe-1',
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    })
    repository.findMenuItemById.mockResolvedValue(createdMenuItem)

    await expect(service.addRecipeToMenu('household-1', 'recipe-1')).resolves.toMatchObject({
      checked: false,
      recipe: {
        id: 'recipe-1',
      },
    })
  })

  it('re-adding a recipe clears checked state and refreshes menu position metadata', async () => {
    const repository = createRepositoryMock()
    const service = createMenuService(repository)
    const recipe = createRecipe()
    const existingMenuItem = createMenuItem({
      checked: true,
      checkedAt: new Date('2026-01-05T00:00:00.000Z'),
      recipe,
    })
    const refreshedMenuItem = createMenuItem({
      checked: false,
      checkedAt: null,
      lastAddedAt: new Date('2026-01-06T00:00:00.000Z'),
      recipe,
    })

    repository.findRecipeById.mockResolvedValue(recipe)
    repository.findMenuItemByRecipeId.mockResolvedValue(existingMenuItem)
    repository.updateMenuItem.mockResolvedValue({ ...refreshedMenuItem })
    repository.findMenuItemById.mockResolvedValue(refreshedMenuItem)

    await expect(service.addRecipeToMenu('household-1', 'recipe-1')).resolves.toMatchObject({
      checked: false,
      checkedAt: null,
    })

    expect(repository.updateMenuItem).toHaveBeenCalledWith(expect.objectContaining({
      checked: false,
      checkedAt: null,
      householdId: 'household-1',
      menuItemId: 'menu-item-1',
    }))
  })

  it('toggles checked rows and persists checkedAt', async () => {
    const repository = createRepositoryMock()
    const service = createMenuService(repository)

    repository.findMenuItemById.mockResolvedValueOnce(createMenuItem({ checked: false })).mockResolvedValueOnce(createMenuItem({ checked: true, checkedAt: new Date('2026-01-04T00:00:00.000Z') }))
    repository.updateMenuItem.mockResolvedValue({
      checked: true,
      checkedAt: new Date('2026-01-04T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      householdId: 'household-1',
      id: 'menu-item-1',
      lastAddedAt: new Date('2026-01-02T00:00:00.000Z'),
      recipeId: 'recipe-1',
      updatedAt: new Date('2026-01-04T00:00:00.000Z'),
    })

    await expect(service.toggleMenuItemChecked('household-1', 'menu-item-1')).resolves.toMatchObject({
      checked: true,
    })
  })

  it('adds only unchecked menu recipes to the shopping list in bulk', async () => {
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
    const service = createMenuService(repository, { addItemToShoppingList })

    repository.listMenuItems.mockResolvedValue([
      createMenuItem({ checked: false, id: 'menu-item-1', recipe: createRecipe({ id: 'recipe-1' }), recipeId: 'recipe-1' }),
      createMenuItem({ checked: true, id: 'menu-item-2', recipe: createRecipe({ id: 'recipe-2', recipeItems: [createRecipeItem({ itemId: 'item-2', item: createItem({ id: 'item-2', name: 'Basil' }) })] }), recipeId: 'recipe-2' }),
    ])

    const result = await service.addUncheckedMenuToShoppingList('household-1', 'user-1')

    expect(result.menuItems).toHaveLength(1)
    expect(result.menuItems[0]?.id).toBe('menu-item-1')
    expect(addItemToShoppingList).toHaveBeenCalledTimes(1)
    expect(addItemToShoppingList).toHaveBeenCalledWith({
      householdId: 'household-1',
      itemId: 'item-1',
      quantity: 1,
      userId: 'user-1',
    })
  })

  it('rejects missing menu rows when adding a single row to the shopping list', async () => {
    const repository = createRepositoryMock()
    const service = createMenuService(repository)

    repository.findMenuItemById.mockResolvedValue(null)

    await expect(service.addMenuItemToShoppingList('household-1', 'menu-item-1', 'user-1')).rejects.toMatchObject({
      code: 'MENU_ITEM_NOT_FOUND',
    } satisfies Partial<MenuServiceError>)
  })

  it('deletes checked menu rows and returns the deleted count', async () => {
    const repository = createRepositoryMock()
    const service = createMenuService(repository)

    repository.deleteCheckedItems.mockResolvedValue(2)

    await expect(service.deleteCheckedMenuItems('household-1')).resolves.toEqual({
      deletedCount: 2,
    })
  })
})
