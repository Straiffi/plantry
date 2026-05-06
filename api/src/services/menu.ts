import { and, eq } from 'drizzle-orm'
import { db, itemCategories, items, menuItems, recipeItems, recipes } from '@recipe-app/db'

import { shoppingListService, type ShoppingListItemView } from './shopping-list.js'

type ItemCategory = typeof itemCategories.$inferSelect
type ItemRecord = typeof items.$inferSelect
type MenuItemRecord = typeof menuItems.$inferSelect
type RecipeItemRecord = typeof recipeItems.$inferSelect
type RecipeRecord = typeof recipes.$inferSelect
type DatabaseLike = Pick<typeof db, 'delete' | 'insert' | 'query' | 'transaction' | 'update'>

type RecipeItemWithRelations = RecipeItemRecord & {
  item: ItemRecord & {
    category: ItemCategory | null
  }
}

type RecipeWithRelations = RecipeRecord & {
  recipeItems: RecipeItemWithRelations[]
}

type MenuItemWithRelations = MenuItemRecord & {
  recipe: RecipeWithRelations
}

type MenuRepository = {
  deleteCheckedItems: (householdId: string) => Promise<number>
  findMenuItemById: (householdId: string, menuItemId: string) => Promise<MenuItemWithRelations | null>
  findMenuItemByRecipeId: (householdId: string, recipeId: string) => Promise<MenuItemWithRelations | null>
  findRecipeById: (householdId: string, recipeId: string) => Promise<RecipeWithRelations | null>
  insertMenuItem: (input: {
    checked: boolean
    checkedAt: Date | null
    householdId: string
    lastAddedAt: Date
    recipeId: string
  }) => Promise<MenuItemRecord>
  listMenuItems: (householdId: string) => Promise<MenuItemWithRelations[]>
  transaction: <T>(callback: (repository: MenuRepository) => Promise<T>) => Promise<T>
  updateMenuItem: (input: {
    checked?: boolean
    checkedAt?: Date | null
    householdId: string
    lastAddedAt?: Date
    menuItemId: string
    updatedAt: Date
  }) => Promise<MenuItemRecord | null>
  updateRecipeLastAddedToMenuAt: (input: {
    householdId: string
    lastAddedToMenuAt: Date
    recipeId: string
    updatedAt: Date
  }) => Promise<RecipeRecord | null>
}

type MenuDependencies = {
  addItemToShoppingList: (input: { householdId: string; itemId?: string; name?: string; quantity: number; userId: string }) => Promise<ShoppingListItemView>
}

export type MenuRecipeView = RecipeRecord & {
  items: Array<RecipeItemRecord & {
    item: {
      archivedAt: Date | null
      category: ItemCategory | null
      categoryId: string | null
      id: string
      name: string
    }
  }>
  lastAddedToMenuAt: Date | null
}

export type MenuItemView = MenuItemRecord & {
  recipe: MenuRecipeView
}

export class MenuServiceError extends Error {
  code: 'MENU_ITEM_NOT_FOUND' | 'RECIPE_NOT_FOUND'

  constructor(code: 'MENU_ITEM_NOT_FOUND' | 'RECIPE_NOT_FOUND', message: string) {
    super(message)
    this.code = code
  }
}

const mapRecipe = (recipe: RecipeWithRelations): MenuRecipeView => {
  return {
    ...recipe,
    items: [...recipe.recipeItems]
      .sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder
        }

        return left.item.name.localeCompare(right.item.name)
      })
      .map((recipeItem) => ({
        ...recipeItem,
        item: {
          archivedAt: recipeItem.item.archivedAt,
          category: recipeItem.item.category,
          categoryId: recipeItem.item.categoryId,
          id: recipeItem.item.id,
          name: recipeItem.item.name,
        },
      })),
    lastAddedToMenuAt: recipe.lastAddedToMenuAt,
  }
}

const mapMenuItem = (menuItem: MenuItemWithRelations): MenuItemView => {
  return {
    ...menuItem,
    recipe: mapRecipe(menuItem.recipe),
  }
}

const sortMenuItems = (menuItemsToSort: MenuItemView[]) => {
  return [...menuItemsToSort].sort((left, right) => {
    const lastAddedDifference = left.lastAddedAt.getTime() - right.lastAddedAt.getTime()

    if (lastAddedDifference !== 0) {
      return lastAddedDifference
    }

    return left.createdAt.getTime() - right.createdAt.getTime()
  })
}

export const createMenuRepository = (database: DatabaseLike = db): MenuRepository => {
  return {
    deleteCheckedItems: async (householdId) => {
      const deletedItems = await database
        .delete(menuItems)
        .where(and(eq(menuItems.householdId, householdId), eq(menuItems.checked, true)))
        .returning({ id: menuItems.id })

      return deletedItems.length
    },
    findMenuItemById: async (householdId, menuItemId) => {
      const menuItemRecord = await database.query.menuItems.findFirst({
        where: and(eq(menuItems.householdId, householdId), eq(menuItems.id, menuItemId)),
        with: {
          recipe: {
            with: {
              recipeItems: {
                with: {
                  item: {
                    with: {
                      category: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      return menuItemRecord ?? null
    },
    findMenuItemByRecipeId: async (householdId, recipeId) => {
      const menuItemRecord = await database.query.menuItems.findFirst({
        where: and(eq(menuItems.householdId, householdId), eq(menuItems.recipeId, recipeId)),
        with: {
          recipe: {
            with: {
              recipeItems: {
                with: {
                  item: {
                    with: {
                      category: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      return menuItemRecord ?? null
    },
    findRecipeById: async (householdId, recipeId) => {
      const recipeRecord = await database.query.recipes.findFirst({
        where: and(eq(recipes.householdId, householdId), eq(recipes.id, recipeId)),
        with: {
          recipeItems: {
            with: {
              item: {
                with: {
                  category: true,
                },
              },
            },
          },
        },
      })

      return recipeRecord ?? null
    },
    insertMenuItem: async ({ checked, checkedAt, householdId, lastAddedAt, recipeId }) => {
      const [menuItemRecord] = await database
        .insert(menuItems)
        .values({
          checked,
          checkedAt,
          householdId,
          lastAddedAt,
          recipeId,
        })
        .returning()

      return menuItemRecord
    },
    listMenuItems: async (householdId) => {
      return database.query.menuItems.findMany({
        orderBy: (table, operators) => [operators.asc(table.lastAddedAt), operators.asc(table.createdAt)],
        where: eq(menuItems.householdId, householdId),
        with: {
          recipe: {
            with: {
              recipeItems: {
                with: {
                  item: {
                    with: {
                      category: true,
                    },
                  },
                },
              },
            },
          },
        },
      })
    },
    transaction: async (callback) => {
      return database.transaction(async (transaction) => {
        return callback(createMenuRepository(transaction as unknown as DatabaseLike))
      })
    },
    updateMenuItem: async ({ checked, checkedAt, householdId, lastAddedAt, menuItemId, updatedAt }) => {
      const [menuItemRecord] = await database
        .update(menuItems)
        .set({
          ...(checked === undefined ? {} : { checked }),
          ...(checkedAt === undefined ? {} : { checkedAt }),
          ...(lastAddedAt === undefined ? {} : { lastAddedAt }),
          updatedAt,
        })
        .where(and(eq(menuItems.householdId, householdId), eq(menuItems.id, menuItemId)))
        .returning()

      return menuItemRecord ?? null
    },
    updateRecipeLastAddedToMenuAt: async ({ householdId, lastAddedToMenuAt, recipeId, updatedAt }) => {
      const [recipeRecord] = await database
        .update(recipes)
        .set({
          lastAddedToMenuAt,
          updatedAt,
        })
        .where(and(eq(recipes.householdId, householdId), eq(recipes.id, recipeId)))
        .returning()

      return recipeRecord ?? null
    },
  }
}

export const createMenuService = (
  repository: MenuRepository = createMenuRepository(),
  dependencies: MenuDependencies = {
    addItemToShoppingList: shoppingListService.addItemToShoppingList,
  },
) => {
  const getMenu = async (householdId: string) => {
    const menuItemRecords = await repository.listMenuItems(householdId)

    return {
      items: sortMenuItems(menuItemRecords.map(mapMenuItem)),
    }
  }

  const addRecipeToMenu = async (householdId: string, recipeId: string) => {
    return repository.transaction(async (transactionRepository) => {
      const recipeRecord = await transactionRepository.findRecipeById(householdId, recipeId)

      if (!recipeRecord) {
        throw new MenuServiceError('RECIPE_NOT_FOUND', 'Recipe not found')
      }

      const existingMenuItem = await transactionRepository.findMenuItemByRecipeId(householdId, recipeId)
      const updatedAt = new Date()
      const lastAddedAt = new Date()

      await transactionRepository.updateRecipeLastAddedToMenuAt({
        householdId,
        lastAddedToMenuAt: lastAddedAt,
        recipeId,
        updatedAt,
      })

      if (existingMenuItem) {
        await transactionRepository.updateMenuItem({
          checked: false,
          checkedAt: null,
          householdId,
          lastAddedAt,
          menuItemId: existingMenuItem.id,
          updatedAt,
        })

        const refreshedMenuItem = await transactionRepository.findMenuItemById(householdId, existingMenuItem.id)

        if (!refreshedMenuItem) {
          throw new MenuServiceError('MENU_ITEM_NOT_FOUND', 'Menu item not found')
        }

        return mapMenuItem(refreshedMenuItem)
      }

      const insertedMenuItem = await transactionRepository.insertMenuItem({
        checked: false,
        checkedAt: null,
        householdId,
        lastAddedAt,
        recipeId,
      })
      const createdMenuItem = await transactionRepository.findMenuItemById(householdId, insertedMenuItem.id)

      if (!createdMenuItem) {
        throw new MenuServiceError('MENU_ITEM_NOT_FOUND', 'Menu item not found')
      }

      return mapMenuItem(createdMenuItem)
    })
  }

  const toggleMenuItemChecked = async (householdId: string, menuItemId: string) => {
    const existingMenuItem = await repository.findMenuItemById(householdId, menuItemId)

    if (!existingMenuItem) {
      throw new MenuServiceError('MENU_ITEM_NOT_FOUND', 'Menu item not found')
    }

    const nextChecked = !existingMenuItem.checked
    const checkedAt = nextChecked ? new Date() : null

    await repository.updateMenuItem({
      checked: nextChecked,
      checkedAt,
      householdId,
      menuItemId,
      updatedAt: new Date(),
    })

    const updatedMenuItem = await repository.findMenuItemById(householdId, menuItemId)

    if (!updatedMenuItem) {
      throw new MenuServiceError('MENU_ITEM_NOT_FOUND', 'Menu item not found')
    }

    return mapMenuItem(updatedMenuItem)
  }

  const addMenuRecipeIngredientsToShoppingList = async (menuItem: MenuItemWithRelations, householdId: string, userId: string) => {
    const addedItems: ShoppingListItemView[] = []

    for (const recipeItem of menuItem.recipe.recipeItems) {
      const shoppingListItem = await dependencies.addItemToShoppingList({
        householdId,
        itemId: recipeItem.itemId,
        quantity: recipeItem.quantity,
        userId,
      })

      addedItems.push(shoppingListItem)
    }

    return addedItems
  }

  const addMenuItemToShoppingList = async (householdId: string, menuItemId: string, userId: string) => {
    const menuItem = await repository.findMenuItemById(householdId, menuItemId)

    if (!menuItem) {
      throw new MenuServiceError('MENU_ITEM_NOT_FOUND', 'Menu item not found')
    }

    const addedItems = await addMenuRecipeIngredientsToShoppingList(menuItem, householdId, userId)

    return {
      items: addedItems,
      menuItem: mapMenuItem(menuItem),
    }
  }

  const addUncheckedMenuToShoppingList = async (householdId: string, userId: string) => {
    const menuItemRecords = await repository.listMenuItems(householdId)
    const uncheckedMenuItems = menuItemRecords.filter((menuItem) => !menuItem.checked)
    const addedItems: ShoppingListItemView[] = []

    for (const menuItem of uncheckedMenuItems) {
      const recipeShoppingListItems = await addMenuRecipeIngredientsToShoppingList(menuItem, householdId, userId)

      addedItems.push(...recipeShoppingListItems)
    }

    return {
      items: addedItems,
      menuItems: uncheckedMenuItems.map(mapMenuItem),
    }
  }

  const deleteCheckedMenuItems = async (householdId: string) => {
    const deletedCount = await repository.deleteCheckedItems(householdId)

    return { deletedCount }
  }

  return {
    addMenuItemToShoppingList,
    addRecipeToMenu,
    addUncheckedMenuToShoppingList,
    deleteCheckedMenuItems,
    getMenu,
    toggleMenuItemChecked,
  }
}

export const menuService = createMenuService()
