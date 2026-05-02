import { and, eq } from 'drizzle-orm'
import { db, itemCategories, items, recipeItems, recipes } from '@recipe-app/db'

import { itemCatalogService } from './item-catalog.js'
import { shoppingListService, type ShoppingListItemView } from './shopping-list.js'

type ItemCategory = typeof itemCategories.$inferSelect
type ItemRecord = typeof items.$inferSelect
type RecipeRecord = typeof recipes.$inferSelect
type RecipeItemRecord = typeof recipeItems.$inferSelect
type DatabaseLike = Pick<typeof db, 'delete' | 'insert' | 'query' | 'transaction' | 'update'>

type RecipeItemWithRelations = RecipeItemRecord & {
  item: ItemRecord & {
    category: ItemCategory | null
  }
}

type RecipeWithRelations = RecipeRecord & {
  recipeItems: RecipeItemWithRelations[]
}

type RecipeItemInput = {
  categoryId?: string | null
  itemId?: string
  name?: string
  quantity: number
  sortOrder?: number
}

type CreateRecipeInput = {
  householdId: string
  items?: RecipeItemInput[]
  name: string
  notes?: string | null
  userId: string
}

type UpdateRecipeInput = {
  householdId: string
  items?: RecipeItemInput[]
  name?: string
  notes?: string | null
  recipeId: string
  userId: string
}

type ResolvedRecipeItem = {
  itemId: string
  quantity: number
  sortOrder: number
}

type RecipeRepository = {
  deleteRecipe: (householdId: string, recipeId: string) => Promise<boolean>
  deleteRecipeItems: (recipeId: string) => Promise<void>
  findItemById: (householdId: string, itemId: string) => Promise<ItemRecord | null>
  findRecipeById: (householdId: string, recipeId: string) => Promise<RecipeWithRelations | null>
  insertRecipe: (input: { createdByUserId: string; householdId: string; name: string; notes: string | null }) => Promise<RecipeRecord>
  insertRecipeItem: (input: { itemId: string; quantity: number; recipeId: string; sortOrder: number }) => Promise<RecipeItemRecord>
  listRecipes: (householdId: string) => Promise<RecipeWithRelations[]>
  transaction: <T>(callback: (repository: RecipeRepository) => Promise<T>) => Promise<T>
  updateItemArchivedAt: (householdId: string, itemId: string, archivedAt: Date | null, updatedAt: Date) => Promise<void>
  updateRecipe: (input: {
    householdId: string
    name?: string
    notes?: string | null
    recipeId: string
    updatedAt: Date
  }) => Promise<RecipeRecord | null>
}

type RecipeDependencies = {
  addItemToShoppingList: (input: { householdId: string; itemId?: string; name?: string; quantity: number; userId: string }) => Promise<ShoppingListItemView>
  findOrCreateItem: (input: {
    categoryId?: string | null
    householdId: string
    name: string
    userId: string
  }) => Promise<{ id: string }>
}

export type RecipeView = RecipeRecord & {
  items: Array<RecipeItemRecord & {
    item: {
      archivedAt: Date | null
      category: ItemCategory | null
      categoryId: string | null
      id: string
      name: string
    }
  }>
}

export class RecipeServiceError extends Error {
  code: 'DUPLICATE_RECIPE_ITEM' | 'INVALID_INPUT' | 'ITEM_NOT_FOUND' | 'RECIPE_NOT_FOUND'

  constructor(code: 'DUPLICATE_RECIPE_ITEM' | 'INVALID_INPUT' | 'ITEM_NOT_FOUND' | 'RECIPE_NOT_FOUND', message: string) {
    super(message)
    this.code = code
  }
}

const isPositiveInteger = (value: number) => {
  return Number.isInteger(value) && value > 0
}

const normalizeRecipeName = (value: string) => {
  return value.trim().replace(/\s+/g, ' ')
}

const normalizeRecipeNotes = (value: string | null | undefined) => {
  if (value === undefined || value === null) {
    return null
  }

  const normalizedValue = value.trim()

  return normalizedValue ? normalizedValue : null
}

const mapRecipe = (recipe: RecipeWithRelations): RecipeView => {
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
  }
}

export const createRecipeRepository = (database: DatabaseLike = db): RecipeRepository => {
  return {
    deleteRecipe: async (householdId, recipeId) => {
      const deletedRecipes = await database
        .delete(recipes)
        .where(and(eq(recipes.householdId, householdId), eq(recipes.id, recipeId)))
        .returning({ id: recipes.id })

      return deletedRecipes.length > 0
    },
    deleteRecipeItems: async (recipeId) => {
      await database.delete(recipeItems).where(eq(recipeItems.recipeId, recipeId))
    },
    findItemById: async (householdId, itemId) => {
      const itemRecord = await database.query.items.findFirst({
        where: and(eq(items.householdId, householdId), eq(items.id, itemId)),
      })

      return itemRecord ?? null
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
    insertRecipe: async ({ createdByUserId, householdId, name, notes }) => {
      const [recipeRecord] = await database
        .insert(recipes)
        .values({ createdByUserId, householdId, name, notes })
        .returning()

      return recipeRecord
    },
    insertRecipeItem: async ({ itemId, quantity, recipeId, sortOrder }) => {
      const [recipeItemRecord] = await database
        .insert(recipeItems)
        .values({ itemId, quantity, recipeId, sortOrder })
        .returning()

      return recipeItemRecord
    },
    listRecipes: async (householdId) => {
      return database.query.recipes.findMany({
        orderBy: (table, operators) => [operators.asc(table.name)],
        where: eq(recipes.householdId, householdId),
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
    },
    transaction: async (callback) => {
      return database.transaction(async (transaction) => {
        return callback(createRecipeRepository(transaction as unknown as DatabaseLike))
      })
    },
    updateItemArchivedAt: async (householdId, itemId, archivedAt, updatedAt) => {
      await database
        .update(items)
        .set({ archivedAt, updatedAt })
        .where(and(eq(items.householdId, householdId), eq(items.id, itemId)))
    },
    updateRecipe: async ({ householdId, name, notes, recipeId, updatedAt }) => {
      const [recipeRecord] = await database
        .update(recipes)
        .set({
          ...(name === undefined ? {} : { name }),
          ...(notes === undefined ? {} : { notes }),
          updatedAt,
        })
        .where(and(eq(recipes.householdId, householdId), eq(recipes.id, recipeId)))
        .returning()

      return recipeRecord ?? null
    },
  }
}

export const createRecipeService = (
  repository: RecipeRepository = createRecipeRepository(),
  dependencies: RecipeDependencies = {
    addItemToShoppingList: shoppingListService.addItemToShoppingList,
    findOrCreateItem: itemCatalogService.findOrCreateItem,
  },
) => {
  const resolveRecipeItems = async (
    itemRepository: Pick<RecipeRepository, 'findItemById' | 'updateItemArchivedAt'>,
    householdId: string,
    recipeItemInputs: RecipeItemInput[],
    userId: string,
  ) => {
    const resolvedItems: ResolvedRecipeItem[] = []
    const seenItemIds = new Set<string>()

    for (const [index, recipeItemInput] of recipeItemInputs.entries()) {
      if (!isPositiveInteger(recipeItemInput.quantity)) {
        throw new RecipeServiceError('INVALID_INPUT', 'Recipe item quantity must be a positive integer')
      }

      let resolvedItemId: string

      if (typeof recipeItemInput.itemId === 'string') {
        const itemRecord = await itemRepository.findItemById(householdId, recipeItemInput.itemId)

        if (!itemRecord) {
          throw new RecipeServiceError('ITEM_NOT_FOUND', 'Item not found')
        }

        if (itemRecord.archivedAt !== null) {
          await itemRepository.updateItemArchivedAt(householdId, itemRecord.id, null, new Date())
        }

        resolvedItemId = itemRecord.id
      } else if (typeof recipeItemInput.name === 'string' && recipeItemInput.name.trim()) {
        const catalogItem = await dependencies.findOrCreateItem({
          categoryId: recipeItemInput.categoryId,
          householdId,
          name: recipeItemInput.name,
          userId,
        })

        resolvedItemId = catalogItem.id
      } else {
        throw new RecipeServiceError('INVALID_INPUT', 'Each recipe item requires either itemId or item name')
      }

      if (seenItemIds.has(resolvedItemId)) {
        throw new RecipeServiceError('DUPLICATE_RECIPE_ITEM', 'Recipe items must be unique by item')
      }

      seenItemIds.add(resolvedItemId)
      resolvedItems.push({
        itemId: resolvedItemId,
        quantity: recipeItemInput.quantity,
        sortOrder: recipeItemInput.sortOrder ?? index,
      })
    }

    return resolvedItems
  }

  const listRecipes = async (householdId: string) => {
    const recipeRecords = await repository.listRecipes(householdId)

    return recipeRecords.map(mapRecipe)
  }

  const getRecipe = async (householdId: string, recipeId: string) => {
    const recipeRecord = await repository.findRecipeById(householdId, recipeId)

    if (!recipeRecord) {
      throw new RecipeServiceError('RECIPE_NOT_FOUND', 'Recipe not found')
    }

    return mapRecipe(recipeRecord)
  }

  const createRecipe = async ({ householdId, items: recipeItemInputs = [], name, notes, userId }: CreateRecipeInput) => {
    const normalizedName = normalizeRecipeName(name)

    if (!normalizedName) {
      throw new RecipeServiceError('INVALID_INPUT', 'Recipe name is required')
    }

    const resolvedRecipeItems = await resolveRecipeItems(repository, householdId, recipeItemInputs, userId)

    return repository.transaction(async (transactionRepository) => {
      const recipeRecord = await transactionRepository.insertRecipe({
        createdByUserId: userId,
        householdId,
        name: normalizedName,
        notes: normalizeRecipeNotes(notes),
      })

      for (const resolvedRecipeItem of resolvedRecipeItems) {
        await transactionRepository.insertRecipeItem({
          itemId: resolvedRecipeItem.itemId,
          quantity: resolvedRecipeItem.quantity,
          recipeId: recipeRecord.id,
          sortOrder: resolvedRecipeItem.sortOrder,
        })
      }

      const createdRecipe = await transactionRepository.findRecipeById(householdId, recipeRecord.id)

      if (!createdRecipe) {
        throw new RecipeServiceError('RECIPE_NOT_FOUND', 'Recipe not found')
      }

      return mapRecipe(createdRecipe)
    })
  }

  const updateRecipe = async ({ householdId, items: recipeItemInputs, name, notes, recipeId, userId }: UpdateRecipeInput) => {
    const existingRecipe = await repository.findRecipeById(householdId, recipeId)

    if (!existingRecipe) {
      throw new RecipeServiceError('RECIPE_NOT_FOUND', 'Recipe not found')
    }

    if (name !== undefined) {
      const normalizedName = normalizeRecipeName(name)

      if (!normalizedName) {
        throw new RecipeServiceError('INVALID_INPUT', 'Recipe name is required')
      }
    }

    const resolvedRecipeItems = recipeItemInputs === undefined
      ? []
      : await resolveRecipeItems(repository, householdId, recipeItemInputs, userId)

    return repository.transaction(async (transactionRepository) => {
      const updatedRecipe = await transactionRepository.updateRecipe({
        householdId,
        name: name === undefined ? undefined : normalizeRecipeName(name),
        notes: notes === undefined ? undefined : normalizeRecipeNotes(notes),
        recipeId,
        updatedAt: new Date(),
      })

      if (!updatedRecipe) {
        throw new RecipeServiceError('RECIPE_NOT_FOUND', 'Recipe not found')
      }

      if (recipeItemInputs !== undefined) {
        await transactionRepository.deleteRecipeItems(recipeId)

        for (const resolvedRecipeItem of resolvedRecipeItems) {
          await transactionRepository.insertRecipeItem({
            itemId: resolvedRecipeItem.itemId,
            quantity: resolvedRecipeItem.quantity,
            recipeId,
            sortOrder: resolvedRecipeItem.sortOrder,
          })
        }
      }

      const refreshedRecipe = await transactionRepository.findRecipeById(householdId, recipeId)

      if (!refreshedRecipe) {
        throw new RecipeServiceError('RECIPE_NOT_FOUND', 'Recipe not found')
      }

      return mapRecipe(refreshedRecipe)
    })
  }

  const deleteRecipe = async (householdId: string, recipeId: string) => {
    const deleted = await repository.deleteRecipe(householdId, recipeId)

    if (!deleted) {
      throw new RecipeServiceError('RECIPE_NOT_FOUND', 'Recipe not found')
    }
  }

  const addRecipeToShoppingList = async (householdId: string, recipeId: string, userId: string) => {
    const recipeRecord = await repository.findRecipeById(householdId, recipeId)

    if (!recipeRecord) {
      throw new RecipeServiceError('RECIPE_NOT_FOUND', 'Recipe not found')
    }

    const addedItems: ShoppingListItemView[] = []

    for (const recipeItem of recipeRecord.recipeItems) {
      const shoppingListItem = await dependencies.addItemToShoppingList({
        householdId,
        itemId: recipeItem.itemId,
        quantity: recipeItem.quantity,
        userId,
      })

      addedItems.push(shoppingListItem)
    }

    return {
      items: addedItems,
      recipe: mapRecipe(recipeRecord),
    }
  }

  return {
    addRecipeToShoppingList,
    createRecipe,
    deleteRecipe,
    getRecipe,
    listRecipes,
    updateRecipe,
  }
}

export const recipeService = createRecipeService()
