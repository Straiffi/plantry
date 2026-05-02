import { and, eq, isNull, like } from 'drizzle-orm'
import { db, itemCategories, items, itemTags } from '@recipe-app/db'

type ItemCategory = typeof itemCategories.$inferSelect
type ItemRecord = typeof items.$inferSelect
type ItemTag = typeof itemTags.$inferSelect
type DatabaseLike = Pick<typeof db, 'delete' | 'insert' | 'query' | 'transaction' | 'update'>

type ItemWithRelations = ItemRecord & {
  category: ItemCategory | null
  tags: ItemTag[]
}

export type CatalogItem = ItemRecord & {
  category: ItemCategory | null
  tags: string[]
}

type CreateCategoryInput = {
  householdId: string
  name: string
  sortOrder?: number
}

type UpdateCategoryInput = {
  categoryId: string
  householdId: string
  name?: string
  sortOrder?: number
}

type CreateItemInput = {
  categoryId?: string | null
  householdId: string
  name: string
  userId: string
}

type UpdateItemInput = {
  categoryId?: string | null
  householdId: string
  itemId: string
  name?: string
}

type FindOrCreateItemInput = {
  categoryId?: string | null
  householdId: string
  name: string
  userId: string
}

type AddItemTagInput = {
  householdId: string
  itemId: string
  tag: string
}

type SearchItemsInput = {
  householdId: string
  limit?: number
  query: string
}

type ReorderCategoriesInput = {
  householdId: string
  orderedCategoryIds: string[]
}

type ItemCatalogRepository = {
  categoryHasItems: (categoryId: string) => Promise<boolean>
  deleteCategory: (categoryId: string, householdId: string) => Promise<boolean>
  deleteItemTag: (itemId: string, tag: string) => Promise<boolean>
  findCategoryById: (categoryId: string, householdId: string) => Promise<ItemCategory | null>
  findItemById: (itemId: string, householdId: string) => Promise<ItemWithRelations | null>
  findItemByNormalizedName: (householdId: string, normalizedName: string) => Promise<ItemWithRelations | null>
  insertCategory: (input: { householdId: string; name: string; sortOrder: number }) => Promise<ItemCategory>
  insertItem: (input: {
    categoryId: string | null
    createdByUserId: string
    householdId: string
    name: string
    normalizedName: string
  }) => Promise<ItemRecord>
  insertItemTag: (input: { itemId: string; tag: string }) => Promise<ItemTag>
  listCategories: (householdId: string) => Promise<ItemCategory[]>
  listItems: (householdId: string, includeArchived: boolean) => Promise<ItemWithRelations[]>
  reorderCategories: (input: { householdId: string; orderedCategoryIds: string[]; updatedAt: Date }) => Promise<void>
  searchItems: (householdId: string, normalizedQuery: string, limit: number) => Promise<ItemWithRelations[]>
  transaction: <T>(callback: (repository: ItemCatalogRepository) => Promise<T>) => Promise<T>
  updateCategory: (input: {
    categoryId: string
    householdId: string
    name?: string
    sortOrder?: number
    updatedAt: Date
  }) => Promise<ItemCategory | null>
  updateItem: (input: {
    archivedAt?: Date | null
    categoryId?: string | null
    householdId: string
    itemId: string
    name?: string
    normalizedName?: string
    updatedAt: Date
  }) => Promise<ItemRecord | null>
}

export class ItemCatalogServiceError extends Error {
  code:
    | 'CATEGORY_IN_USE'
    | 'CATEGORY_NOT_FOUND'
    | 'DUPLICATE_CATEGORY_NAME'
    | 'DUPLICATE_ITEM_NAME'
    | 'DUPLICATE_TAG'
    | 'INVALID_CATEGORY'
    | 'INVALID_NAME'
    | 'INVALID_TAG'
    | 'ITEM_NOT_FOUND'
    | 'TAG_NOT_FOUND'

  constructor(
    code:
      | 'CATEGORY_IN_USE'
      | 'CATEGORY_NOT_FOUND'
      | 'DUPLICATE_CATEGORY_NAME'
      | 'DUPLICATE_ITEM_NAME'
      | 'DUPLICATE_TAG'
      | 'INVALID_CATEGORY'
      | 'INVALID_NAME'
      | 'INVALID_TAG'
      | 'ITEM_NOT_FOUND'
      | 'TAG_NOT_FOUND',
    message: string,
  ) {
    super(message)
    this.code = code
  }
}

const normalizeWhitespace = (value: string) => {
  return value.trim().replace(/\s+/g, ' ')
}

const normalizeTagValue = (value: string) => {
  return normalizeWhitespace(value)
}

export const normalizeItemName = (value: string) => {
  return normalizeWhitespace(value).toLowerCase()
}

const mapCatalogItem = (item: ItemWithRelations): CatalogItem => {
  return {
    ...item,
    tags: item.tags.map((tag) => tag.tag),
  }
}

const isUniqueViolation = (error: unknown) => {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}

export const createItemCatalogRepository = (database: DatabaseLike = db): ItemCatalogRepository => {
  return {
    categoryHasItems: async (categoryId) => {
      const itemRecord = await database.query.items.findFirst({
        where: eq(items.categoryId, categoryId),
      })

      return itemRecord !== undefined
    },
    deleteCategory: async (categoryId, householdId) => {
      const deletedCategories = await database
        .delete(itemCategories)
        .where(and(eq(itemCategories.id, categoryId), eq(itemCategories.householdId, householdId)))
        .returning({ id: itemCategories.id })

      return deletedCategories.length > 0
    },
    deleteItemTag: async (itemId, tag) => {
      const deletedTags = await database
        .delete(itemTags)
        .where(and(eq(itemTags.itemId, itemId), eq(itemTags.tag, tag)))
        .returning({ id: itemTags.id })

      return deletedTags.length > 0
    },
    findCategoryById: async (categoryId, householdId) => {
      const categoryRecord = await database.query.itemCategories.findFirst({
        where: and(eq(itemCategories.id, categoryId), eq(itemCategories.householdId, householdId)),
      })

      return categoryRecord ?? null
    },
    findItemById: async (itemId, householdId) => {
      const itemRecord = await database.query.items.findFirst({
        where: and(eq(items.id, itemId), eq(items.householdId, householdId)),
        with: {
          category: true,
          tags: true,
        },
      })

      return itemRecord ?? null
    },
    findItemByNormalizedName: async (householdId, normalizedName) => {
      const itemRecord = await database.query.items.findFirst({
        where: and(eq(items.householdId, householdId), eq(items.normalizedName, normalizedName)),
        with: {
          category: true,
          tags: true,
        },
      })

      return itemRecord ?? null
    },
    insertCategory: async ({ householdId, name, sortOrder }) => {
      const [categoryRecord] = await database
        .insert(itemCategories)
        .values({ householdId, name, sortOrder })
        .returning()

      return categoryRecord
    },
    insertItem: async ({ categoryId, createdByUserId, householdId, name, normalizedName }) => {
      const [itemRecord] = await database
        .insert(items)
        .values({
          categoryId,
          createdByUserId,
          householdId,
          name,
          normalizedName,
        })
        .returning()

      return itemRecord
    },
    insertItemTag: async ({ itemId, tag }) => {
      const [tagRecord] = await database.insert(itemTags).values({ itemId, tag }).returning()

      return tagRecord
    },
    listCategories: async (householdId) => {
      return database.query.itemCategories.findMany({
        orderBy: (categories, operators) => [operators.asc(categories.sortOrder), operators.asc(categories.name)],
        where: eq(itemCategories.householdId, householdId),
      })
    },
    listItems: async (householdId, includeArchived) => {
      return database.query.items.findMany({
        orderBy: (table, operators) => [operators.asc(table.archivedAt), operators.asc(table.name)],
        where: includeArchived
          ? eq(items.householdId, householdId)
          : and(eq(items.householdId, householdId), isNull(items.archivedAt)),
        with: {
          category: true,
          tags: true,
        },
      })
    },
    reorderCategories: async ({ householdId, orderedCategoryIds, updatedAt }) => {
      await Promise.all(orderedCategoryIds.map((categoryId, index) => {
        return database
          .update(itemCategories)
          .set({
            sortOrder: index + 1,
            updatedAt,
          })
          .where(and(eq(itemCategories.id, categoryId), eq(itemCategories.householdId, householdId)))
      }))
    },
    searchItems: async (householdId, normalizedQuery, limit) => {
      return database.query.items.findMany({
        limit,
        orderBy: (table, operators) => [operators.asc(table.name)],
        where: and(
          eq(items.householdId, householdId),
          isNull(items.archivedAt),
          like(items.normalizedName, `${normalizedQuery}%`),
        ),
        with: {
          category: true,
          tags: true,
        },
      })
    },
    transaction: async (callback) => {
      return database.transaction(async (transaction) => {
        return callback(createItemCatalogRepository(transaction as unknown as DatabaseLike))
      })
    },
    updateCategory: async ({ categoryId, householdId, name, sortOrder, updatedAt }) => {
      const [categoryRecord] = await database
        .update(itemCategories)
        .set({
          ...(name === undefined ? {} : { name }),
          ...(sortOrder === undefined ? {} : { sortOrder }),
          updatedAt,
        })
        .where(and(eq(itemCategories.id, categoryId), eq(itemCategories.householdId, householdId)))
        .returning()

      return categoryRecord ?? null
    },
    updateItem: async ({ archivedAt, categoryId, householdId, itemId, name, normalizedName, updatedAt }) => {
      const [itemRecord] = await database
        .update(items)
        .set({
          ...(archivedAt === undefined ? {} : { archivedAt }),
          ...(categoryId === undefined ? {} : { categoryId }),
          ...(name === undefined ? {} : { name }),
          ...(normalizedName === undefined ? {} : { normalizedName }),
          updatedAt,
        })
        .where(and(eq(items.id, itemId), eq(items.householdId, householdId)))
        .returning()

      return itemRecord ?? null
    },
  }
}

export const createItemCatalogService = (repository: ItemCatalogRepository = createItemCatalogRepository()) => {
  const listCategories = async (householdId: string) => {
    return repository.listCategories(householdId)
  }

  const createCategory = async ({ householdId, name, sortOrder = 0 }: CreateCategoryInput) => {
    const normalizedName = normalizeWhitespace(name)

    if (!normalizedName) {
      throw new ItemCatalogServiceError('INVALID_NAME', 'Category name is required')
    }

    const existingCategories = await repository.listCategories(householdId)
    const nextSortOrder = sortOrder > 0 ? sortOrder : existingCategories.length + 1

    try {
      return repository.insertCategory({
        householdId,
        name: normalizedName,
        sortOrder: nextSortOrder,
      })
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ItemCatalogServiceError('DUPLICATE_CATEGORY_NAME', 'Category name already exists')
      }

      throw error
    }
  }

  const updateCategory = async ({ categoryId, householdId, name, sortOrder }: UpdateCategoryInput) => {
    const normalizedName = name === undefined ? undefined : normalizeWhitespace(name)

    if (normalizedName !== undefined && !normalizedName) {
      throw new ItemCatalogServiceError('INVALID_NAME', 'Category name is required')
    }

    try {
      const categoryRecord = await repository.updateCategory({
        categoryId,
        householdId,
        name: normalizedName,
        sortOrder,
        updatedAt: new Date(),
      })

      if (!categoryRecord) {
        throw new ItemCatalogServiceError('CATEGORY_NOT_FOUND', 'Category not found')
      }

      return categoryRecord
    } catch (error) {
      if (error instanceof ItemCatalogServiceError) {
        throw error
      }

      if (isUniqueViolation(error)) {
        throw new ItemCatalogServiceError('DUPLICATE_CATEGORY_NAME', 'Category name already exists')
      }

      throw error
    }
  }

  const deleteCategory = async (categoryId: string, householdId: string) => {
    const categoryRecord = await repository.findCategoryById(categoryId, householdId)

    if (!categoryRecord) {
      throw new ItemCatalogServiceError('CATEGORY_NOT_FOUND', 'Category not found')
    }

    const hasItems = await repository.categoryHasItems(categoryId)

    if (hasItems) {
      throw new ItemCatalogServiceError('CATEGORY_IN_USE', 'Category cannot be deleted while products still use it')
    }

    await repository.deleteCategory(categoryId, householdId)
  }

  const reorderCategories = async ({ householdId, orderedCategoryIds }: ReorderCategoriesInput) => {
    const categories = await repository.listCategories(householdId)

    if (orderedCategoryIds.length !== categories.length) {
      throw new ItemCatalogServiceError('CATEGORY_NOT_FOUND', 'Category not found')
    }

    const categoryIds = new Set(categories.map((category) => category.id))

    for (const categoryId of orderedCategoryIds) {
      if (!categoryIds.has(categoryId)) {
        throw new ItemCatalogServiceError('CATEGORY_NOT_FOUND', 'Category not found')
      }
    }

    await repository.reorderCategories({
      householdId,
      orderedCategoryIds,
      updatedAt: new Date(),
    })

    return repository.listCategories(householdId)
  }

  const assertValidCategory = async (
    categoryRepository: Pick<ItemCatalogRepository, 'findCategoryById'>,
    householdId: string,
    categoryId: string | null | undefined,
  ) => {
    if (categoryId === undefined || categoryId === null) {
      return null
    }

    const categoryRecord = await categoryRepository.findCategoryById(categoryId, householdId)

    if (!categoryRecord) {
      throw new ItemCatalogServiceError('INVALID_CATEGORY', 'Category does not belong to the current household')
    }

    return categoryRecord
  }

  const findOrCreateItem = async ({ categoryId, householdId, name, userId }: FindOrCreateItemInput) => {
    const displayName = normalizeWhitespace(name)

    if (!displayName) {
      throw new ItemCatalogServiceError('INVALID_NAME', 'Item name is required')
    }

    return repository.transaction(async (transactionRepository) => {
      const normalizedName = normalizeItemName(displayName)
      const resolvedCategory = await assertValidCategory(transactionRepository, householdId, categoryId)
      const existingItem = await transactionRepository.findItemByNormalizedName(householdId, normalizedName)

      if (existingItem && existingItem.archivedAt === null) {
        return mapCatalogItem(existingItem)
      }

      if (existingItem) {
        await transactionRepository.updateItem({
          archivedAt: null,
          categoryId: resolvedCategory ? resolvedCategory.id : existingItem.categoryId,
          householdId,
          itemId: existingItem.id,
          name: displayName,
          normalizedName,
          updatedAt: new Date(),
        })

        const restoredItem = await transactionRepository.findItemById(existingItem.id, householdId)

        if (!restoredItem) {
          throw new ItemCatalogServiceError('ITEM_NOT_FOUND', 'Item not found')
        }

        return mapCatalogItem(restoredItem)
      }

      const insertedItem = await transactionRepository.insertItem({
        categoryId: resolvedCategory?.id ?? null,
        createdByUserId: userId,
        householdId,
        name: displayName,
        normalizedName,
      })
      const createdItem = await transactionRepository.findItemById(insertedItem.id, householdId)

      if (!createdItem) {
        throw new ItemCatalogServiceError('ITEM_NOT_FOUND', 'Item not found')
      }

      return mapCatalogItem(createdItem)
    })
  }

  const createItem = async ({ categoryId, householdId, name, userId }: CreateItemInput) => {
    const displayName = normalizeWhitespace(name)

    if (!displayName) {
      throw new ItemCatalogServiceError('INVALID_NAME', 'Item name is required')
    }

    const existingItem = await repository.findItemByNormalizedName(householdId, normalizeItemName(displayName))

    if (existingItem && existingItem.archivedAt === null) {
      throw new ItemCatalogServiceError('DUPLICATE_ITEM_NAME', 'Item name already exists')
    }

    return findOrCreateItem({
      categoryId,
      householdId,
      name: displayName,
      userId,
    })
  }

  const listItems = async (householdId: string, includeArchived: boolean) => {
    const itemRecords = await repository.listItems(householdId, includeArchived)

    return itemRecords.map(mapCatalogItem)
  }

  const updateItem = async ({ categoryId, householdId, itemId, name }: UpdateItemInput) => {
    const existingItem = await repository.findItemById(itemId, householdId)

    if (!existingItem) {
      throw new ItemCatalogServiceError('ITEM_NOT_FOUND', 'Item not found')
    }

    const nextName = name === undefined ? existingItem.name : normalizeWhitespace(name)

    if (!nextName) {
      throw new ItemCatalogServiceError('INVALID_NAME', 'Item name is required')
    }

    const nextNormalizedName = normalizeItemName(nextName)

    if (nextNormalizedName !== existingItem.normalizedName) {
      const duplicateItem = await repository.findItemByNormalizedName(householdId, nextNormalizedName)

      if (duplicateItem && duplicateItem.id !== itemId) {
        throw new ItemCatalogServiceError('DUPLICATE_ITEM_NAME', 'Item name already exists')
      }
    }

    if (categoryId !== undefined) {
      await assertValidCategory(repository, householdId, categoryId)
    }

    await repository.updateItem({
      categoryId,
      householdId,
      itemId,
      name: nextName,
      normalizedName: nextNormalizedName,
      updatedAt: new Date(),
    })

    const updatedItem = await repository.findItemById(itemId, householdId)

    if (!updatedItem) {
      throw new ItemCatalogServiceError('ITEM_NOT_FOUND', 'Item not found')
    }

    return mapCatalogItem(updatedItem)
  }

  const archiveItem = async (householdId: string, itemId: string) => {
    const itemRecord = await repository.findItemById(itemId, householdId)

    if (!itemRecord) {
      throw new ItemCatalogServiceError('ITEM_NOT_FOUND', 'Item not found')
    }

    if (itemRecord.archivedAt !== null) {
      return mapCatalogItem(itemRecord)
    }

    await repository.updateItem({
      archivedAt: new Date(),
      householdId,
      itemId,
      updatedAt: new Date(),
    })

    const archivedItem = await repository.findItemById(itemId, householdId)

    if (!archivedItem) {
      throw new ItemCatalogServiceError('ITEM_NOT_FOUND', 'Item not found')
    }

    return mapCatalogItem(archivedItem)
  }

  const restoreItem = async (householdId: string, itemId: string) => {
    const itemRecord = await repository.findItemById(itemId, householdId)

    if (!itemRecord) {
      throw new ItemCatalogServiceError('ITEM_NOT_FOUND', 'Item not found')
    }

    if (itemRecord.archivedAt === null) {
      return mapCatalogItem(itemRecord)
    }

    await repository.updateItem({
      archivedAt: null,
      householdId,
      itemId,
      updatedAt: new Date(),
    })

    const restoredItem = await repository.findItemById(itemId, householdId)

    if (!restoredItem) {
      throw new ItemCatalogServiceError('ITEM_NOT_FOUND', 'Item not found')
    }

    return mapCatalogItem(restoredItem)
  }

  const addItemTag = async ({ householdId, itemId, tag }: AddItemTagInput) => {
    const itemRecord = await repository.findItemById(itemId, householdId)

    if (!itemRecord) {
      throw new ItemCatalogServiceError('ITEM_NOT_FOUND', 'Item not found')
    }

    const normalizedTag = normalizeTagValue(tag)

    if (!normalizedTag) {
      throw new ItemCatalogServiceError('INVALID_TAG', 'Tag is required')
    }

    try {
      await repository.insertItemTag({
        itemId,
        tag: normalizedTag,
      })
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ItemCatalogServiceError('DUPLICATE_TAG', 'Tag already exists on this item')
      }

      throw error
    }

    const updatedItem = await repository.findItemById(itemId, householdId)

    if (!updatedItem) {
      throw new ItemCatalogServiceError('ITEM_NOT_FOUND', 'Item not found')
    }

    return mapCatalogItem(updatedItem)
  }

  const deleteItemTag = async (householdId: string, itemId: string, tag: string) => {
    const itemRecord = await repository.findItemById(itemId, householdId)

    if (!itemRecord) {
      throw new ItemCatalogServiceError('ITEM_NOT_FOUND', 'Item not found')
    }

    const normalizedTag = normalizeTagValue(tag)
    const deleted = await repository.deleteItemTag(itemId, normalizedTag)

    if (!deleted) {
      throw new ItemCatalogServiceError('TAG_NOT_FOUND', 'Tag not found')
    }
  }

  const searchItems = async ({ householdId, limit = 10, query }: SearchItemsInput) => {
    const normalizedQuery = normalizeItemName(query)

    if (!normalizedQuery) {
      return []
    }

    const clampedLimit = Math.max(1, Math.min(25, limit))
    const itemRecords = await repository.searchItems(householdId, normalizedQuery, clampedLimit)

    return itemRecords.map(mapCatalogItem)
  }

  return {
    addItemTag,
    archiveItem,
    createCategory,
    createItem,
    deleteCategory,
    deleteItemTag,
    findOrCreateItem,
    listCategories,
    listItems,
    reorderCategories,
    restoreItem,
    searchItems,
    updateCategory,
    updateItem,
  }
}

export const itemCatalogService = createItemCatalogService()
