import { relations } from 'drizzle-orm'

import {
  account,
  householdMembers,
  households,
  inviteCodes,
  itemCategories,
  itemTags,
  items,
  recipeItems,
  recipes,
  session,
  shoppingListItems,
  user,
  verification,
} from './schema'

export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  householdMemberships: many(householdMembers),
  inviteCodes: many(inviteCodes),
  items: many(items),
  recipes: many(recipes),
  sessions: many(session),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))

export const verificationRelations = relations(verification, () => ({}))

export const householdRelations = relations(households, ({ many }) => ({
  categories: many(itemCategories),
  inviteCodes: many(inviteCodes),
  items: many(items),
  members: many(householdMembers),
  recipes: many(recipes),
  shoppingListItems: many(shoppingListItems),
}))

export const householdMemberRelations = relations(householdMembers, ({ one }) => ({
  household: one(households, {
    fields: [householdMembers.householdId],
    references: [households.id],
  }),
  user: one(user, {
    fields: [householdMembers.userId],
    references: [user.id],
  }),
}))

export const inviteCodeRelations = relations(inviteCodes, ({ one }) => ({
  createdBy: one(user, {
    fields: [inviteCodes.createdByUserId],
    references: [user.id],
  }),
  household: one(households, {
    fields: [inviteCodes.householdId],
    references: [households.id],
  }),
}))

export const itemCategoryRelations = relations(itemCategories, ({ many, one }) => ({
  household: one(households, {
    fields: [itemCategories.householdId],
    references: [households.id],
  }),
  items: many(items),
}))

export const itemRelations = relations(items, ({ many, one }) => ({
  category: one(itemCategories, {
    fields: [items.categoryId],
    references: [itemCategories.id],
  }),
  createdBy: one(user, {
    fields: [items.createdByUserId],
    references: [user.id],
  }),
  household: one(households, {
    fields: [items.householdId],
    references: [households.id],
  }),
  recipeItems: many(recipeItems),
  shoppingListItems: many(shoppingListItems),
  tags: many(itemTags),
}))

export const itemTagRelations = relations(itemTags, ({ one }) => ({
  item: one(items, {
    fields: [itemTags.itemId],
    references: [items.id],
  }),
}))

export const recipeRelations = relations(recipes, ({ many, one }) => ({
  createdBy: one(user, {
    fields: [recipes.createdByUserId],
    references: [user.id],
  }),
  household: one(households, {
    fields: [recipes.householdId],
    references: [households.id],
  }),
  recipeItems: many(recipeItems),
}))

export const recipeItemRelations = relations(recipeItems, ({ one }) => ({
  item: one(items, {
    fields: [recipeItems.itemId],
    references: [items.id],
  }),
  recipe: one(recipes, {
    fields: [recipeItems.recipeId],
    references: [recipes.id],
  }),
}))

export const shoppingListItemRelations = relations(shoppingListItems, ({ one }) => ({
  household: one(households, {
    fields: [shoppingListItems.householdId],
    references: [households.id],
  }),
  item: one(items, {
    fields: [shoppingListItems.itemId],
    references: [items.id],
  }),
}))
