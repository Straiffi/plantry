import { randomUUID } from 'node:crypto'
import { boolean, integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

import { user } from './auth.js'

const createId = () => randomUUID()

export const households = pgTable('households', {
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  id: text('id').primaryKey().$defaultFn(createId),
  name: text('name').notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
})

export const householdMembers = pgTable('household_members', {
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  id: text('id').primaryKey().$defaultFn(createId),
  role: text('role').default('member').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
}, (table) => ({
  householdUserIndex: uniqueIndex('household_members_household_user_idx').on(table.householdId, table.userId),
  userHouseholdIndex: uniqueIndex('household_members_user_idx').on(table.userId),
}))

export const inviteCodes = pgTable('invite_codes', {
  code: text('code').notNull(),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  createdByUserId: text('created_by_user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { mode: 'date', withTimezone: true }),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  id: text('id').primaryKey().$defaultFn(createId),
  usedAt: timestamp('used_at', { mode: 'date', withTimezone: true }),
}, (table) => ({
  codeIndex: uniqueIndex('invite_codes_code_idx').on(table.code),
}))

export const itemCategories = pgTable('item_categories', {
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  id: text('id').primaryKey().$defaultFn(createId),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  householdNameIndex: uniqueIndex('item_categories_household_name_idx').on(table.householdId, table.name),
}))

export const items = pgTable('items', {
  archivedAt: timestamp('archived_at', { mode: 'date', withTimezone: true }),
  categoryId: text('category_id').references(() => itemCategories.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  createdByUserId: text('created_by_user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  id: text('id').primaryKey().$defaultFn(createId),
  name: text('name').notNull(),
  normalizedName: text('normalized_name').notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  householdNormalizedNameIndex: uniqueIndex('items_household_normalized_name_idx').on(
    table.householdId,
    table.normalizedName,
  ),
}))

export const itemTags = pgTable('item_tags', {
  id: text('id').primaryKey().$defaultFn(createId),
  itemId: text('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  tag: text('tag').notNull(),
}, (table) => ({
  itemTagIndex: uniqueIndex('item_tags_item_tag_idx').on(table.itemId, table.tag),
}))

export const recipes = pgTable('recipes', {
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  createdByUserId: text('created_by_user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  id: text('id').primaryKey().$defaultFn(createId),
  name: text('name').notNull(),
  notes: text('notes'),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
})

export const recipeItems = pgTable('recipe_items', {
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  id: text('id').primaryKey().$defaultFn(createId),
  itemId: text('item_id').notNull().references(() => items.id, { onDelete: 'restrict' }),
  quantity: integer('quantity').notNull(),
  recipeId: text('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').default(0).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  recipeItemIndex: uniqueIndex('recipe_items_recipe_item_idx').on(table.recipeId, table.itemId),
}))

export const shoppingListItems = pgTable('shopping_list_items', {
  checked: boolean('checked').default(false).notNull(),
  checkedAt: timestamp('checked_at', { mode: 'date', withTimezone: true }),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  id: text('id').primaryKey().$defaultFn(createId),
  itemId: text('item_id').notNull().references(() => items.id, { onDelete: 'restrict' }),
  quantity: integer('quantity').notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  householdItemIndex: uniqueIndex('shopping_list_items_household_item_idx').on(table.householdId, table.itemId),
}))

export const appSchema = {
  householdMembers,
  households,
  inviteCodes,
  itemCategories,
  itemTags,
  items,
  recipeItems,
  recipes,
  shoppingListItems,
} as const
