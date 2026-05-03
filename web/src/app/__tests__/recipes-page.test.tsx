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

const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void

  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve
  })

  return { promise, resolve }
}

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

  it('adds a fresh focused row after selecting an existing product in the last recipe row', async () => {
    const user = userEvent.setup()

    apiMock.searchProducts.mockResolvedValue([
      {
        archivedAt: null,
        category: null,
        categoryId: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        createdByUserId: 'user-1',
        householdId: 'household-1',
        id: 'item-1',
        name: 'Tomato',
        normalizedName: 'tomato',
        tags: [],
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ])

    renderWithProviders(<RecipesPage />)

    await user.click(await screen.findByRole('button', { name: 'Add recipe' }))
    await user.type(screen.getByPlaceholderText('Search or type a product name'), 'Tomato')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      const productInputs = screen.getAllByPlaceholderText('Search or type a product name')

      expect(productInputs).toHaveLength(2)
      expect(productInputs[1]).toHaveValue('')
      expect(productInputs[1]).toHaveFocus()
    })
  })

  it('adds a fresh focused row after creating a new product from the last recipe row', async () => {
    const user = userEvent.setup()

    renderWithProviders(<RecipesPage />)

    await user.click(await screen.findByRole('button', { name: 'Add recipe' }))
    await user.type(screen.getByPlaceholderText('Search or type a product name'), 'Paprika')
    await user.click(await screen.findByRole('button', { name: 'Create product "Paprika"' }))

    await waitFor(() => {
      const productInputs = screen.getAllByPlaceholderText('Search or type a product name')

      expect(productInputs).toHaveLength(2)
      expect(productInputs[0]).toHaveValue('Paprika')
      expect(productInputs[1]).toHaveValue('')
      expect(productInputs[1]).toHaveFocus()
    })
  })

  it('shows the quick Add to menu action on compact recipe cards', async () => {
    const user = userEvent.setup()

    apiMock.getRecipes.mockResolvedValue(recipes)

    renderWithProviders(<RecipesPage />)

    expect(await screen.findByText('Pasta')).toBeInTheDocument()
    expect(screen.getByText('Fresh sauce')).toHaveClass('hidden', 'sm:block')
    expect(screen.getAllByRole('button', { name: 'Add to menu' })).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Add to shopping list' })).not.toBeInTheDocument()

    await user.click(screen.getByText('Pasta'))

    expect(screen.getByRole('button', { name: 'Add to shopping list' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Add to menu' })).toHaveLength(2)

    await user.click(screen.getByText('Pasta'))

    expect(screen.queryByRole('button', { name: 'Add to shopping list' })).not.toBeInTheDocument()
  })

  it('filters recipes by recipe name and restores the full list when cleared', async () => {
    const user = userEvent.setup()

    apiMock.getRecipes.mockResolvedValue(recipes)

    renderWithProviders(<RecipesPage />)

    expect(await screen.findByText('Pasta')).toBeInTheDocument()
    expect(screen.getByText('Salad')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Search recipes' }), 'PAST')

    expect(screen.getByText('Pasta')).toBeInTheDocument()
    expect(screen.queryByText('Salad')).not.toBeInTheDocument()

    await user.clear(screen.getByRole('textbox', { name: 'Search recipes' }))

    expect(screen.getByText('Pasta')).toBeInTheDocument()
    expect(screen.getByText('Salad')).toBeInTheDocument()
  })

  it('filters recipes by product name', async () => {
    const user = userEvent.setup()

    apiMock.getRecipes.mockResolvedValue(recipes)

    renderWithProviders(<RecipesPage />)

    expect(await screen.findByText('Pasta')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Search recipes' }), 'toma')

    expect(screen.getByText('Pasta')).toBeInTheDocument()
    expect(screen.queryByText('Salad')).not.toBeInTheDocument()
  })

  it('shows a search empty state when no recipes match', async () => {
    const user = userEvent.setup()

    apiMock.getRecipes.mockResolvedValue(recipes)

    renderWithProviders(<RecipesPage />)

    expect(await screen.findByText('Pasta')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Search recipes' }), 'garlic')

    expect(screen.getByText('No recipes match that search yet.')).toBeInTheDocument()
    expect(screen.queryByText('Pasta')).not.toBeInTheDocument()
    expect(screen.queryByText('Salad')).not.toBeInTheDocument()
  })

  it('adds recipes to the menu from the quick card action', async () => {
    const user = userEvent.setup()

    apiMock.getRecipes.mockResolvedValue(recipes)

    renderWithProviders(<RecipesPage />)

    await user.click((await screen.findAllByRole('button', { name: 'Add to menu' }))[0]!)

    await waitFor(() => {
      expect(apiMock.addRecipeToMenu).toHaveBeenCalledWith('recipe-1')
    })
  })

  it('shows loading only on the recipe action that is pending', async () => {
    const deferredAddToMenu = createDeferred<typeof recipes[0]>()
    const user = userEvent.setup()

    apiMock.addRecipeToMenu.mockImplementationOnce(() => deferredAddToMenu.promise)
    apiMock.getRecipes.mockResolvedValue(recipes)

    renderWithProviders(<RecipesPage />)

    const addToMenuButtons = await screen.findAllByRole('button', { name: 'Add to menu' })

    await user.click(addToMenuButtons[0]!)

    await waitFor(() => {
      const updatedButtons = screen.getAllByRole('button', { name: 'Add to menu' })

      expect(updatedButtons[0]).toBeDisabled()
      expect(updatedButtons[0]).toHaveAttribute('aria-busy', 'true')
      expect(updatedButtons[1]).not.toBeDisabled()
    })

    deferredAddToMenu.resolve(recipes[0]!)
  })

  it('stops blocking recipe actions after the mutation resolves even when broad refetches are still running', async () => {
    const deferredRefetch = createDeferred<typeof recipes>()
    const user = userEvent.setup()

    apiMock.getRecipes
      .mockResolvedValueOnce(recipes)
      .mockImplementationOnce(() => deferredRefetch.promise)
    apiMock.addRecipeToMenu.mockResolvedValue(recipes[0])

    renderWithProviders(<RecipesPage />)

    const addToMenuButtons = await screen.findAllByRole('button', { name: 'Add to menu' })

    await user.click(addToMenuButtons[0]!)

    await waitFor(() => {
      expect(apiMock.addRecipeToMenu).toHaveBeenCalledWith('recipe-1')
    })

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Add to menu' })[0]).not.toBeDisabled()
    })

    deferredRefetch.resolve(recipes)
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
