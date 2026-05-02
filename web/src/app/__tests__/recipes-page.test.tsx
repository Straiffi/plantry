import type { ReactNode } from 'react'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RecipesPage } from '@/app/recipes-page'
import { renderWithProviders } from '@/test/render'

const apiMock = vi.hoisted(() => ({
  addRecipeToMenu: vi.fn(),
  addRecipeToShoppingList: vi.fn(),
  createRecipe: vi.fn(),
  deleteRecipe: vi.fn(),
  getRecipes: vi.fn(),
  searchProducts: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router')

  return {
    ...actual,
    Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
  }
})

vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    status: number

    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }

  return {
    ApiError,
    api: apiMock,
  }
})

const recipes = [
  {
    createdAt: '2026-01-01T00:00:00.000Z',
    createdByUserId: 'user-1',
    householdId: 'household-1',
    id: 'recipe-1',
    items: [{
      createdAt: '2026-01-01T00:00:00.000Z',
      id: 'recipe-item-1',
      item: {
        archivedAt: null,
        category: null,
        categoryId: null,
        id: 'item-1',
        name: 'Tomato',
      },
      itemId: 'item-1',
      quantity: 2,
      recipeId: 'recipe-1',
      sortOrder: 0,
      updatedAt: '2026-01-01T00:00:00.000Z',
    }],
    lastAddedToMenuAt: '2026-01-03T12:00:00.000Z',
    name: 'Pasta',
    notes: 'Fresh sauce',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    createdAt: '2026-01-01T00:00:00.000Z',
    createdByUserId: 'user-1',
    householdId: 'household-1',
    id: 'recipe-2',
    items: [{
      createdAt: '2026-01-01T00:00:00.000Z',
      id: 'recipe-item-2',
      item: {
        archivedAt: null,
        category: null,
        categoryId: null,
        id: 'item-2',
        name: 'Basil',
      },
      itemId: 'item-2',
      quantity: 1,
      recipeId: 'recipe-2',
      sortOrder: 0,
      updatedAt: '2026-01-01T00:00:00.000Z',
    }],
    lastAddedToMenuAt: null,
    name: 'Salad',
    notes: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

describe('RecipesPage', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    window.HTMLElement.prototype.scrollTo = vi.fn()
    Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false)
    Element.prototype.releasePointerCapture = vi.fn()
    Element.prototype.scrollIntoView = vi.fn()
    Element.prototype.setPointerCapture = vi.fn()
    vi.clearAllMocks()
    apiMock.addRecipeToMenu.mockResolvedValue(recipes[0])
    apiMock.getRecipes.mockResolvedValue([])
    apiMock.searchProducts.mockResolvedValue([])
  })

  it('renders a loading skeleton while recipes are pending', () => {
    apiMock.getRecipes.mockReturnValue(new Promise(() => {}))

    renderWithProviders(<RecipesPage />)

    expect(screen.getByTestId('recipes-page-skeleton')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Recipes' })).toBeInTheDocument()
  })

  it('keeps the create form collapsed until Add recipe is pressed', async () => {
    const user = userEvent.setup()

    renderWithProviders(<RecipesPage />)

    expect(await screen.findByRole('button', { name: 'Add recipe' })).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Recipe name')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add recipe' }))

    expect(screen.getByPlaceholderText('Recipe name')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide recipe form' })).toBeInTheDocument()
  })

  it('uses the shared product picker behavior inside recipe rows', async () => {
    const user = userEvent.setup()

    renderWithProviders(<RecipesPage />)

    await user.click(await screen.findByRole('button', { name: 'Add recipe' }))

    const productInputs = screen.getAllByPlaceholderText('Search or type a product name')

    await user.type(productInputs[0]!, 'Paprika')

    expect(await screen.findByRole('button', { name: 'Create product "Paprika"' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '-' })).toBeInTheDocument()
  })

  it('keeps recipe actions hidden until the compact card is expanded', async () => {
    const user = userEvent.setup()

    apiMock.getRecipes.mockResolvedValue(recipes)

    renderWithProviders(<RecipesPage />)

    expect(await screen.findByText('Pasta')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add to menu' })).not.toBeInTheDocument()

    await user.click(screen.getByText('Pasta'))

    expect(screen.getByRole('button', { name: 'Add to menu' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add to shopping list' })).toBeInTheDocument()

    await user.click(screen.getByText('Pasta'))

    expect(screen.queryByRole('button', { name: 'Add to menu' })).not.toBeInTheDocument()
  })

  it('adds recipes to the menu from the expanded card actions', async () => {
    const user = userEvent.setup()

    apiMock.getRecipes.mockResolvedValue(recipes)

    renderWithProviders(<RecipesPage />)

    await user.click(await screen.findByText('Pasta'))
    await user.click(screen.getByRole('button', { name: 'Add to menu' }))

    await waitFor(() => {
      expect(apiMock.addRecipeToMenu).toHaveBeenCalledWith('recipe-1')
    })
  })

  it('sorts recipes by menu date with not-yet-added recipes last', async () => {
    const user = userEvent.setup()

    apiMock.getRecipes.mockResolvedValue(recipes)

    renderWithProviders(<RecipesPage />)

    expect(await screen.findByText('Pasta')).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Sort recipes' }))
    await user.click(screen.getByRole('option', { name: 'Menu date, oldest first' }))

    const recipeTitles = screen.getAllByText(/Pasta|Salad/).map((node) => node.textContent)

    expect(recipeTitles[0]).toBe('Pasta')
    expect(recipeTitles[1]).toBe('Salad')
  })
})
