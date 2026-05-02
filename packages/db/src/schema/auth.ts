import { boolean, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  email: text('email').notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  id: text('id').primaryKey(),
  image: text('image'),
  name: text('name').notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIndex: uniqueIndex('user_email_idx').on(table.email),
}))

export const session = pgTable('session', {
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { mode: 'date', withTimezone: true }).notNull(),
  id: text('id').primaryKey(),
  ipAddress: text('ip_address'),
  token: text('token').notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
}, (table) => ({
  tokenIndex: uniqueIndex('session_token_idx').on(table.token),
}))

export const account = pgTable('account', {
  accessToken: text('access_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { mode: 'date', withTimezone: true }),
  accountId: text('account_id').notNull(),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  id: text('id').primaryKey(),
  idToken: text('id_token'),
  password: text('password'),
  providerId: text('provider_id').notNull(),
  refreshToken: text('refresh_token'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { mode: 'date', withTimezone: true }),
  scope: text('scope'),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
}, (table) => ({
  providerAccountIndex: uniqueIndex('account_provider_account_idx').on(table.providerId, table.accountId),
}))

export const verification = pgTable('verification', {
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { mode: 'date', withTimezone: true }).notNull(),
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  value: text('value').notNull(),
}, (table) => ({
  identifierValueIndex: uniqueIndex('verification_identifier_value_idx').on(table.identifier, table.value),
}))

export const authSchema = {
  account,
  session,
  user,
  verification,
} as const
