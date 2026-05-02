import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as relationSchema from './relations'
import * as tableSchema from './schema'

declare global {
  // eslint-disable-next-line no-var
  var __recipeAppSql__: postgres.Sql | undefined
}

const connectionString = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/recipe_app'

const client = globalThis.__recipeAppSql__ ?? postgres(connectionString, {
  max: 1,
  prepare: false,
})

const schema = {
  ...tableSchema,
  ...relationSchema,
}

if (process.env.NODE_ENV !== 'production') {
  globalThis.__recipeAppSql__ = client
}

export const db = drizzle(client, { schema })
export const sql = client
