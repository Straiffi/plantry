import { and, eq } from 'drizzle-orm'
import { db, itemCategories, items, shoppingListItems } from '@recipe-app/db'

import { itemCatalogService } from './item-catalog.js'

type ItemCategory = typeof itemCategories.$inferSelect
type ItemRecord = typeof items.$inferSelect
type ShoppingListItemRecord = typeof shoppingListItems.$inferSelect
type DatabaseLike = Pick<typeof db, 'delete' | 'insert' | 'query' | 'transaction' | 'update'>

type ShoppingListItemWithRelations = ShoppingListItemRecord & {
  item: ItemRecord & {
    category: ItemCategory | null
  }
}

export type ShoppingListItemView = ShoppingListItemRecord & {
  item: {
    archivedAt: Date | null
    category: ItemCategory | null
    categoryId: string | null
    id: string
    name: string
  }
}

export type ShoppingListGroup = {
  category: ItemCategory | null
  items: ShoppingListItemView[]
}

type AddItemToShoppingListInput = {
  categoryId?: string | null
  householdId: string
  itemId?: string
  name?: string
  quantity: number
  userId: string
}

type UpdateShoppingListItemInput = {
  householdId: string
  quantity: number
  shoppingListItemId: string
}

type ShoppingListRepository = {
  deleteCheckedItems: (householdId: string) => Promise<number>
  deleteShoppingListItem: (householdId: string, shoppingListItemId: string) => Promise<boolean>
  findItemById: (householdId: string, itemId: string) => Promise<ItemRecord | null>
  findShoppingListItemById: (householdId: string, shoppingListItemId: string) => Promise<ShoppingListItemWithRelations | null>
  findShoppingListItemByItemId: (householdId: string, itemId: string) => Promise<ShoppingListItemWithRelations | null>
  insertShoppingListItem: (input: {
    checked: boolean
    checkedAt: Date | null
    householdId: string
    itemId: string
    quantity: number
  }) => Promise<ShoppingListItemRecord>
  listShoppingListItems: (householdId: string) => Promise<ShoppingListItemWithRelations[]>
  transaction: <T>(callback: (repository: ShoppingListRepository) => Promise<T>) => Promise<T>
  updateItemArchivedAt: (householdId: string, itemId: string, archivedAt: Date | null, updatedAt: Date) => Promise<void>
  updateShoppingListItem: (input: {
    checked?: boolean
    checkedAt?: Date | null
    householdId: string
    quantity?: number
    shoppingListItemId: string
    updatedAt: Date
  }) => Promise<ShoppingListItemRecord | null>
}

type ShoppingListDependencies = {
  findOrCreateItem: (input: {
    categoryId?: string | null
    householdId: string
    name: string
    userId: string
  }) => Promise<{ id: string }>
}

export class ShoppingListServiceError extends Error {
  code: 'INVALID_INPUT' | 'ITEM_NOT_FOUND' | 'SHOPPING_LIST_ITEM_NOT_FOUND'

  constructor(code: 'INVALID_INPUT' | 'ITEM_NOT_FOUND' | 'SHOPPING_LIST_ITEM_NOT_FOUND', message: string) {
    super(message)
    this.code = code
  }
}

const mapShoppingListItem = (shoppingListItem: ShoppingListItemWithRelations): ShoppingListItemView => {
  return {
    ...shoppingListItem,
    item: {
      archivedAt: shoppingListItem.item.archivedAt,
      category: shoppingListItem.item.category,
      categoryId: shoppingListItem.item.categoryId,
      id: shoppingListItem.item.id,
      name: shoppingListItem.item.name,
    },
  }
}

const sortGroupedItems = (groups: ShoppingListGroup[]) => {
  return groups.sort((left, right) => {
    const leftCategory = left.category
    const rightCategory = right.category

    if (leftCategory === null && rightCategory !== null) {
      return 1
    }

    if (leftCategory !== null && rightCategory === null) {
      return -1
    }

    if (leftCategory === null || rightCategory === null) {
      return 0
    }

    if (leftCategory.sortOrder !== rightCategory.sortOrder) {
      return leftCategory.sortOrder - rightCategory.sortOrder
    }

    return leftCategory.name.localeCompare(rightCategory.name)
  })
}

const sortListItems = (itemsToSort: ShoppingListItemView[]) => {
  return [...itemsToSort].sort((left, right) => {
    if (left.checked !== right.checked) {
      return Number(left.checked) - Number(right.checked)
    }

    return left.item.name.localeCompare(right.item.name)
  })
}

const isPositiveInteger = (value: number) => {
  return Number.isInteger(value) && value > 0
}

export const createShoppingListRepository = (database: DatabaseLike = db): ShoppingListRepository => {
  return {
    deleteCheckedItems: async (householdId) => {
      const deletedItems = await database
        .delete(shoppingListItems)
        .where(and(eq(shoppingListItems.householdId, householdId), eq(shoppingListItems.checked, true)))
        .returning({ id: shoppingListItems.id })

      return deletedItems.length
    },
    deleteShoppingListItem: async (householdId, shoppingListItemId) => {
      const deletedItems = await database
        .delete(shoppingListItems)
        .where(and(eq(shoppingListItems.householdId, householdId), eq(shoppingListItems.id, shoppingListItemId)))
        .returning({ id: shoppingListItems.id })

      return deletedItems.length > 0
    },
    findItemById: async (householdId, itemId) => {
      const itemRecord = await database.query.items.findFirst({
        where: and(eq(items.householdId, householdId), eq(items.id, itemId)),
      })

      return itemRecord ?? null
    },
    findShoppingListItemById: async (householdId, shoppingListItemId) => {
      const shoppingListItemRecord = await database.query.shoppingListItems.findFirst({
        where: and(eq(shoppingListItems.householdId, householdId), eq(shoppingListItems.id, shoppingListItemId)),
        with: {
          item: {
            with: {
              category: true,
            },
          },
        },
      })

      return shoppingListItemRecord ?? null
    },
    findShoppingListItemByItemId: async (householdId, itemId) => {
      const shoppingListItemRecord = await database.query.shoppingListItems.findFirst({
        where: and(eq(shoppingListItems.householdId, householdId), eq(shoppingListItems.itemId, itemId)),
        with: {
          item: {
            with: {
              category: true,
            },
          },
        },
      })

      return shoppingListItemRecord ?? null
    },
    insertShoppingListItem: async ({ checked, checkedAt, householdId, itemId, quantity }) => {
      const [shoppingListItemRecord] = await database
        .insert(shoppingListItems)
        .values({
          checked,
          checkedAt,
          householdId,
          itemId,
          quantity,
        })
        .returning()

      return shoppingListItemRecord
    },
    listShoppingListItems: async (householdId) => {
      return database.query.shoppingListItems.findMany({
        where: eq(shoppingListItems.householdId, householdId),
        with: {
          item: {
            with: {
              category: true,
            },
          },
        },
      })
    },
    transaction: async (callback) => {
      return database.transaction(async (transaction) => {
        return callback(createShoppingListRepository(transaction as unknown as DatabaseLike))
      })
    },
    updateItemArchivedAt: async (householdId, itemId, archivedAt, updatedAt) => {
      await database
        .update(items)
        .set({ archivedAt, updatedAt })
        .where(and(eq(items.householdId, householdId), eq(items.id, itemId)))
    },
    updateShoppingListItem: async ({ checked, checkedAt, householdId, quantity, shoppingListItemId, updatedAt }) => {
      const [shoppingListItemRecord] = await database
        .update(shoppingListItems)
        .set({
          ...(checked === undefined ? {} : { checked }),
          ...(checkedAt === undefined ? {} : { checkedAt }),
          ...(quantity === undefined ? {} : { quantity }),
          updatedAt,
        })
        .where(and(eq(shoppingListItems.householdId, householdId), eq(shoppingListItems.id, shoppingListItemId)))
        .returning()

      return shoppingListItemRecord ?? null
    },
  }
}

export const createShoppingListService = (
  repository: ShoppingListRepository = createShoppingListRepository(),
  dependencies: ShoppingListDependencies = {
    findOrCreateItem: itemCatalogService.findOrCreateItem,
  },
) => {
  const getShoppingList = async (householdId: string) => {
    const shoppingListItemRecords = await repository.listShoppingListItems(householdId)
    const mappedItems = sortListItems(shoppingListItemRecords.map(mapShoppingListItem))
    const groupMap = new Map<string, ShoppingListGroup>()

    for (const shoppingListItem of mappedItems) {
      const category = shoppingListItem.item.category
      const groupKey = category?.id ?? 'uncategorized'
      const existingGroup = groupMap.get(groupKey)

      if (existingGroup) {
        existingGroup.items.push(shoppingListItem)
        continue
      }

      groupMap.set(groupKey, {
        category,
        items: [shoppingListItem],
      })
    }

    return {
      groups: sortGroupedItems(Array.from(groupMap.values())),
      items: mappedItems,
    }
  }

  const resolveShoppingListItemId = async (
    itemRepository: Pick<ShoppingListRepository, 'findItemById' | 'updateItemArchivedAt'>,
    { categoryId, householdId, itemId, name, userId }: Omit<AddItemToShoppingListInput, 'quantity'>,
  ) => {
    if (itemId) {
      const itemRecord = await itemRepository.findItemById(householdId, itemId)

      if (!itemRecord) {
        throw new ShoppingListServiceError('ITEM_NOT_FOUND', 'Item not found')
      }

      if (itemRecord.archivedAt !== null) {
        await itemRepository.updateItemArchivedAt(householdId, itemId, null, new Date())
      }

      return itemRecord.id
    }

    if (typeof name !== 'string' || !name.trim()) {
      throw new ShoppingListServiceError('INVALID_INPUT', 'Either itemId or item name is required')
    }

    const catalogItem = await dependencies.findOrCreateItem({
      categoryId,
      householdId,
      name,
      userId,
    })

    return catalogItem.id
  }

  const addItemToShoppingList = async ({ categoryId, householdId, itemId, name, quantity, userId }: AddItemToShoppingListInput) => {
    if (!isPositiveInteger(quantity)) {
      throw new ShoppingListServiceError('INVALID_INPUT', 'Quantity must be a positive integer')
    }

    return repository.transaction(async (transactionRepository) => {
      const resolvedItemId = await resolveShoppingListItemId(transactionRepository, {
        categoryId,
        householdId,
        itemId,
        name,
        userId,
      })
      const existingListItem = await transactionRepository.findShoppingListItemByItemId(householdId, resolvedItemId)
      const updatedAt = new Date()

      if (existingListItem) {
        await transactionRepository.updateShoppingListItem({
          checked: false,
          checkedAt: null,
          householdId,
          quantity: existingListItem.quantity + quantity,
          shoppingListItemId: existingListItem.id,
          updatedAt,
        })

        const refreshedItem = await transactionRepository.findShoppingListItemById(householdId, existingListItem.id)

        if (!refreshedItem) {
          throw new ShoppingListServiceError('SHOPPING_LIST_ITEM_NOT_FOUND', 'Shopping list item not found')
        }

        return mapShoppingListItem(refreshedItem)
      }

      const insertedListItem = await transactionRepository.insertShoppingListItem({
        checked: false,
        checkedAt: null,
        householdId,
        itemId: resolvedItemId,
        quantity,
      })
      const createdListItem = await transactionRepository.findShoppingListItemById(householdId, insertedListItem.id)

      if (!createdListItem) {
        throw new ShoppingListServiceError('SHOPPING_LIST_ITEM_NOT_FOUND', 'Shopping list item not found')
      }

      return mapShoppingListItem(createdListItem)
    })
  }

  const updateShoppingListItem = async ({ householdId, quantity, shoppingListItemId }: UpdateShoppingListItemInput) => {
    if (!isPositiveInteger(quantity)) {
      throw new ShoppingListServiceError('INVALID_INPUT', 'Quantity must be a positive integer')
    }

    const existingListItem = await repository.findShoppingListItemById(householdId, shoppingListItemId)

    if (!existingListItem) {
      throw new ShoppingListServiceError('SHOPPING_LIST_ITEM_NOT_FOUND', 'Shopping list item not found')
    }

    await repository.updateShoppingListItem({
      householdId,
      quantity,
      shoppingListItemId,
      updatedAt: new Date(),
    })

    const updatedListItem = await repository.findShoppingListItemById(householdId, shoppingListItemId)

    if (!updatedListItem) {
      throw new ShoppingListServiceError('SHOPPING_LIST_ITEM_NOT_FOUND', 'Shopping list item not found')
    }

    return mapShoppingListItem(updatedListItem)
  }

  const toggleShoppingListItemChecked = async (householdId: string, shoppingListItemId: string) => {
    const existingListItem = await repository.findShoppingListItemById(householdId, shoppingListItemId)

    if (!existingListItem) {
      throw new ShoppingListServiceError('SHOPPING_LIST_ITEM_NOT_FOUND', 'Shopping list item not found')
    }

    const nextChecked = !existingListItem.checked
    const checkedAt = nextChecked ? new Date() : null

    await repository.updateShoppingListItem({
      checked: nextChecked,
      checkedAt,
      householdId,
      shoppingListItemId,
      updatedAt: new Date(),
    })

    const updatedListItem = await repository.findShoppingListItemById(householdId, shoppingListItemId)

    if (!updatedListItem) {
      throw new ShoppingListServiceError('SHOPPING_LIST_ITEM_NOT_FOUND', 'Shopping list item not found')
    }

    return mapShoppingListItem(updatedListItem)
  }

  const deleteShoppingListItem = async (householdId: string, shoppingListItemId: string) => {
    const deleted = await repository.deleteShoppingListItem(householdId, shoppingListItemId)

    if (!deleted) {
      throw new ShoppingListServiceError('SHOPPING_LIST_ITEM_NOT_FOUND', 'Shopping list item not found')
    }
  }

  const deleteCheckedShoppingListItems = async (householdId: string) => {
    const deletedCount = await repository.deleteCheckedItems(householdId)

    return { deletedCount }
  }

  return {
    addItemToShoppingList,
    deleteCheckedShoppingListItems,
    deleteShoppingListItem,
    getShoppingList,
    toggleShoppingListItemChecked,
    updateShoppingListItem,
  }
}

export const shoppingListService = createShoppingListService()
