import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/recipe_app',
  },
  dialect: 'postgresql',
  out: './drizzle',
  schema: './packages/db/src/schema/**/*.ts',
})
