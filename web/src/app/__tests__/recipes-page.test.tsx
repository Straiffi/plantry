import type { ReactNode } from 'react'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RecipesPage } from '@/app/recipes-page'
import { renderWithProviders } from '@/test/render'

const apiMock = vi.hoisted(() => ({
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

describe('RecipesPage', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    apiMock.getRecipes.mockResolvedValue([])
    apiMock.searchProducts.mockResolvedValue([])
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
})
