import { Hono } from 'hono'

import { getAuthenticatedUser, getCurrentHouseholdFromContext, readJsonBody } from '../lib/http.js'
import type { AppEnv } from '../middleware/auth-session.js'
import { recipeService, RecipeServiceError } from '../services/recipes.js'

type ParsedRecipeItem = {
  categoryId?: string | null
  itemId?: string
  name?: string
  quantity: number
  sortOrder?: number
}

const mapRecipeItemInput = (value: unknown): ParsedRecipeItem | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const recipeItem = value as Record<string, unknown>

  return {
    categoryId: recipeItem.categoryId === null ? null : typeof recipeItem.categoryId === 'string' ? recipeItem.categoryId : undefined,
    itemId: typeof recipeItem.itemId === 'string' ? recipeItem.itemId : undefined,
    name: typeof recipeItem.name === 'string' ? recipeItem.name : undefined,
    quantity: typeof recipeItem.quantity === 'number' ? recipeItem.quantity : NaN,
    sortOrder: typeof recipeItem.sortOrder === 'number' && Number.isInteger(recipeItem.sortOrder) ? recipeItem.sortOrder : undefined,
  }
}

const parseRecipeItems = (value: unknown): ParsedRecipeItem[] | undefined | null => {
  if (value === undefined) {
    return undefined
  }

  if (!Array.isArray(value)) {
    return null
  }

  const recipeItems = value.map(mapRecipeItemInput)

  if (recipeItems.some((item) => item === null)) {
    return null
  }

  return recipeItems as ParsedRecipeItem[]
}

const mapRecipeError = (error: RecipeServiceError) => {
  if (error.code === 'RECIPE_NOT_FOUND' || error.code === 'ITEM_NOT_FOUND') {
    return 404
  }

  if (error.code === 'DUPLICATE_RECIPE_ITEM') {
    return 409
  }

  return 400
}

export const recipesRoute = new Hono<AppEnv>()

recipesRoute.get('/', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  const recipes = await recipeService.listRecipes(currentHousehold.household.id)

  return context.json({ recipes })
})

recipesRoute.get('/:id', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  try {
    const recipe = await recipeService.getRecipe(currentHousehold.household.id, context.req.param('id'))

    return context.json({ recipe })
  } catch (error) {
    if (error instanceof RecipeServiceError) {
      return context.json({ message: error.message }, mapRecipeError(error))
    }

    throw error
  }
})

recipesRoute.post('/', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  const body = await readJsonBody(context)
  const items = parseRecipeItems(body?.items)

  if (items === null) {
    return context.json({ message: 'Recipe items must be an array of objects' }, 400)
  }

  try {
    const recipe = await recipeService.createRecipe({
      householdId: currentHousehold.household.id,
      items,
      name: typeof body?.name === 'string' ? body.name : '',
      notes: typeof body?.notes === 'string' || body?.notes === null ? body.notes : undefined,
      userId: user.id,
    })

    return context.json({ recipe }, 201)
  } catch (error) {
    if (error instanceof RecipeServiceError) {
      return context.json({ message: error.message }, mapRecipeError(error))
    }

    throw error
  }
})

recipesRoute.patch('/:id', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  const body = await readJsonBody(context)
  const items = parseRecipeItems(body?.items)

  if (items === null) {
    return context.json({ message: 'Recipe items must be an array of objects' }, 400)
  }

  if (body?.name === undefined && body?.notes === undefined && body?.items === undefined) {
    return context.json({ message: 'At least one recipe field is required' }, 400)
  }

  try {
    const recipe = await recipeService.updateRecipe({
      householdId: currentHousehold.household.id,
      items,
      name: typeof body?.name === 'string' ? body.name : undefined,
      notes: typeof body?.notes === 'string' || body?.notes === null ? body.notes : undefined,
      recipeId: context.req.param('id'),
      userId: user.id,
    })

    return context.json({ recipe })
  } catch (error) {
    if (error instanceof RecipeServiceError) {
      return context.json({ message: error.message }, mapRecipeError(error))
    }

    throw error
  }
})

recipesRoute.delete('/:id', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  try {
    await recipeService.deleteRecipe(currentHousehold.household.id, context.req.param('id'))

    return context.body(null, 204)
  } catch (error) {
    if (error instanceof RecipeServiceError) {
      return context.json({ message: error.message }, mapRecipeError(error))
    }

    throw error
  }
})

recipesRoute.post('/:id/add-to-shopping-list', async (context) => {
  const user = getAuthenticatedUser(context)

  if (!user) {
    return context.json({ message: 'Unauthorized' }, 401)
  }

  const currentHousehold = getCurrentHouseholdFromContext(context)

  if (!currentHousehold) {
    return context.json({ message: 'Household not found' }, 404)
  }

  try {
    const result = await recipeService.addRecipeToShoppingList(
      currentHousehold.household.id,
      context.req.param('id'),
      user.id,
    )

    return context.json(result)
  } catch (error) {
    if (error instanceof RecipeServiceError) {
      return context.json({ message: error.message }, mapRecipeError(error))
    }

    throw error
  }
})
