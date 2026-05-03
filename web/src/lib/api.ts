export type Household = {
  createdAt: string
  id: string
  name: string
  updatedAt: string
}

export type HouseholdMembership = {
  createdAt: string
  householdId: string
  id: string
  role: string
  userId: string
}

export type HouseholdMember = {
  createdAt: string
  householdId: string
  id: string
  role: string
  user: {
    email: string
    id: string
    image: string | null
    name: string
  }
  userId: string
}

export type Category = {
  createdAt: string
  householdId: string
  id: string
  name: string
  sortOrder: number
  updatedAt: string
}

export type Product = {
  archivedAt: string | null
  category: Category | null
  categoryId: string | null
  createdAt: string
  createdByUserId: string
  householdId: string
  id: string
  name: string
  normalizedName: string
  tags: string[]
  updatedAt: string
}

export type ShoppingListItem = {
  checked: boolean
  checkedAt: string | null
  createdAt: string
  householdId: string
  id: string
  item: {
    archivedAt: string | null
    category: Category | null
    categoryId: string | null
    id: string
    name: string
  }
  itemId: string
  quantity: number
  updatedAt: string
}

export type ShoppingListGroup = {
  category: Category | null
  items: ShoppingListItem[]
}

export type RecipeItem = {
  createdAt: string
  id: string
  item: {
    archivedAt: string | null
    category: Category | null
    categoryId: string | null
    id: string
    name: string
  }
  itemId: string
  quantity: number
  recipeId: string
  sortOrder: number
  updatedAt: string
}

export type Recipe = {
  createdAt: string
  createdByUserId: string
  householdId: string
  id: string
  items: RecipeItem[]
  lastAddedToMenuAt: string | null
  name: string
  notes: string | null
  updatedAt: string
}

export type MenuItem = {
  checked: boolean
  checkedAt: string | null
  createdAt: string
  householdId: string
  id: string
  lastAddedAt: string
  recipe: Recipe
  recipeId: string
  updatedAt: string
}

export type InviteCode = {
  code: string
  createdAt: string
  createdByUserId: string
  expiresAt: string | null
  householdId: string
  id: string
  usedAt: string | null
}

export type MeResponse = {
  household: Household | null
  householdMembership: HouseholdMembership | null
  session: {
    id: string
    userId: string
  }
  user: {
    email: string
    id: string
    image: string | null
    name: string
  }
}

type HouseholdSetupResponse = {
  household: Household
  membership: HouseholdMembership
}

type RecipeDraftItem = {
  categoryId?: string | null
  itemId?: string
  name?: string
  quantity: number
  sortOrder?: number
}

class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const getApiTimingPreference = () => {
  if (import.meta.env.VITE_PLANTRY_LOG_API_TIMINGS === 'true') {
    return true
  }

  if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
    return true
  }

  try {
    return window.localStorage.getItem('plantry:log-api-timings') === 'true'
  } catch {
    return false
  }
}

const logApiTiming = (input: { durationMs: number; method: string; path: string; serverTiming: string | null; status: number | 'network-error' }) => {
  if (!getApiTimingPreference()) {
    return
  }

  console.info('[api]', {
    durationMs: Number(input.durationMs.toFixed(1)),
    method: input.method,
    path: input.path,
    serverTiming: input.serverTiming,
    status: input.status,
  })
}

const request = async <T>(path: string, init?: RequestInit) => {
  const method = init?.method ?? 'GET'
  const startedAt = performance.now()
  let response: Response

  try {
    response = await fetch(`/api${path}`, {
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
      ...init,
    })
  } catch (error) {
    logApiTiming({
      durationMs: performance.now() - startedAt,
      method,
      path,
      serverTiming: null,
      status: 'network-error',
    })

    throw error
  }

  logApiTiming({
    durationMs: performance.now() - startedAt,
    method,
    path,
    serverTiming: response.headers.get('server-timing'),
    status: response.status,
  })

  if (!response.ok) {
    let message = 'Request failed'

    try {
      const body = await response.json() as { message?: string }

      if (body.message) {
        message = body.message
      }
    } catch {
      message = response.statusText || message
    }

    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const api = {
  addProductTag: async (itemId: string, tag: string) => {
    const response = await request<{ item: Product }>(`/items/${itemId}/tags`, {
      body: JSON.stringify({ tag }),
      method: 'POST',
    })

    return response.item
  },
  addRecipeToShoppingList: async (recipeId: string) => {
    return request<{ items: ShoppingListItem[]; recipe: Recipe }>(`/recipes/${recipeId}/add-to-shopping-list`, {
      method: 'POST',
    })
  },
  addRecipeToMenu: async (recipeId: string) => {
    const response = await request<{ item: MenuItem }>(`/recipes/${recipeId}/add-to-menu`, {
      method: 'POST',
    })

    return response.item
  },
  addShoppingListItem: async (input: { categoryId?: string | null; itemId?: string; name?: string; quantity: number }) => {
    const response = await request<{ item: ShoppingListItem }>('/shopping-list/items', {
      body: JSON.stringify(input),
      method: 'POST',
    })

    return response.item
  },
  archiveProduct: async (itemId: string) => {
    const response = await request<{ item: Product }>(`/items/${itemId}/archive`, {
      method: 'POST',
    })

    return response.item
  },
  createCategory: async (name: string, sortOrder?: number) => {
    const response = await request<{ category: Category }>('/categories', {
      body: JSON.stringify({ name, sortOrder }),
      method: 'POST',
    })

    return response.category
  },
  createHousehold: async (name: string) => {
    return request<HouseholdSetupResponse>('/household/create', {
      body: JSON.stringify({ name }),
      method: 'POST',
    })
  },
  createInviteCode: async () => {
    const response = await request<{ inviteCode: InviteCode }>('/invite-codes', {
      method: 'POST',
    })

    return response.inviteCode
  },
  createProduct: async (input: { categoryId?: string | null; name: string }) => {
    const response = await request<{ item: Product }>('/items', {
      body: JSON.stringify(input),
      method: 'POST',
    })

    return response.item
  },
  createRecipe: async (input: { items: RecipeDraftItem[]; name: string; notes?: string | null }) => {
    const response = await request<{ recipe: Recipe }>('/recipes', {
      body: JSON.stringify(input),
      method: 'POST',
    })

    return response.recipe
  },
  deleteCategory: async (categoryId: string) => {
    await request(`/categories/${categoryId}`, {
      method: 'DELETE',
    })
  },
  deleteCheckedShoppingListItems: async () => {
    return request<{ deletedCount: number }>('/shopping-list/delete-checked', {
      method: 'POST',
    })
  },
  deleteProductTag: async (itemId: string, tag: string) => {
    await request(`/items/${itemId}/tags/${encodeURIComponent(tag)}`, {
      method: 'DELETE',
    })
  },
  deleteRecipe: async (recipeId: string) => {
    await request(`/recipes/${recipeId}`, {
      method: 'DELETE',
    })
  },
  deleteCheckedMenuItems: async () => {
    return request<{ deletedCount: number }>('/menu/delete-checked', {
      method: 'POST',
    })
  },
  deleteShoppingListItem: async (shoppingListItemId: string) => {
    await request(`/shopping-list/items/${shoppingListItemId}`, {
      method: 'DELETE',
    })
  },
  getCategories: async () => {
    const response = await request<{ categories: Category[] }>('/categories')

    return response.categories
  },
  getInviteCodes: async () => {
    const response = await request<{ inviteCodes: InviteCode[] }>('/invite-codes')

    return response.inviteCodes
  },
  getHouseholdMembers: async () => {
    const response = await request<{ members: HouseholdMember[] }>('/household/members')

    return response.members
  },
  getMe: async () => {
    return request<MeResponse>('/me')
  },
  getMenu: async () => {
    return request<{ items: MenuItem[] }>('/menu')
  },
  getProducts: async (includeArchived: boolean) => {
    const response = await request<{ items: Product[] }>(`/items?includeArchived=${String(includeArchived)}`)

    return response.items
  },
  getRecipe: async (recipeId: string) => {
    const response = await request<{ recipe: Recipe }>(`/recipes/${recipeId}`)

    return response.recipe
  },
  getRecipes: async () => {
    const response = await request<{ recipes: Recipe[] }>('/recipes')

    return response.recipes
  },
  getShoppingList: async () => {
    return request<{ groups: ShoppingListGroup[]; items: ShoppingListItem[] }>('/shopping-list')
  },
  joinHousehold: async (code: string) => {
    return request<HouseholdSetupResponse>('/household/join', {
      body: JSON.stringify({ code }),
      method: 'POST',
    })
  },
  restoreProduct: async (itemId: string) => {
    const response = await request<{ item: Product }>(`/items/${itemId}/restore`, {
      method: 'POST',
    })

    return response.item
  },
  reorderCategories: async (orderedCategoryIds: string[]) => {
    const response = await request<{ categories: Category[] }>('/categories/reorder', {
      body: JSON.stringify({ orderedCategoryIds }),
      method: 'PATCH',
    })

    return response.categories
  },
  searchProducts: async (query: string) => {
    const encodedQuery = encodeURIComponent(query)
    const response = await request<{ items: Product[] }>(`/items/search?q=${encodedQuery}&limit=8`)

    return response.items
  },
  toggleMenuItemChecked: async (menuItemId: string) => {
    const response = await request<{ item: MenuItem }>(`/menu/items/${menuItemId}/toggle-checked`, {
      method: 'POST',
    })

    return response.item
  },
  toggleShoppingListItem: async (shoppingListItemId: string) => {
    const response = await request<{ item: ShoppingListItem }>(`/shopping-list/items/${shoppingListItemId}/toggle-checked`, {
      method: 'POST',
    })

    return response.item
  },
  addMenuItemToShoppingList: async (menuItemId: string) => {
    return request<{ items: ShoppingListItem[]; menuItem: MenuItem }>(`/menu/items/${menuItemId}/add-to-shopping-list`, {
      method: 'POST',
    })
  },
  addUncheckedMenuToShoppingList: async () => {
    return request<{ items: ShoppingListItem[]; menuItems: MenuItem[] }>('/menu/add-to-shopping-list', {
      method: 'POST',
    })
  },
  updateProduct: async (itemId: string, input: { categoryId?: string | null; name?: string }) => {
    const response = await request<{ item: Product }>(`/items/${itemId}`, {
      body: JSON.stringify(input),
      method: 'PATCH',
    })

    return response.item
  },
  updateRecipe: async (recipeId: string, input: { items?: RecipeDraftItem[]; name?: string; notes?: string | null }) => {
    const response = await request<{ recipe: Recipe }>(`/recipes/${recipeId}`, {
      body: JSON.stringify(input),
      method: 'PATCH',
    })

    return response.recipe
  },
  updateShoppingListItem: async (shoppingListItemId: string, quantity: number) => {
    const response = await request<{ item: ShoppingListItem }>(`/shopping-list/items/${shoppingListItemId}`, {
      body: JSON.stringify({ quantity }),
      method: 'PATCH',
    })

    return response.item
  },
}

export { ApiError }
