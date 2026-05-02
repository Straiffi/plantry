import type { ReactNode } from 'react'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RecipeDetailPage } from '@/app/recipe-detail-page'
import { renderWithProviders } from '@/test/render'

const apiMock = vi.hoisted(() => ({
  deleteRecipe: vi.fn(),
  getRecipe: vi.fn(),
  updateRecipe: vi.fn(),
}))

const navigateMock = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router')

  return {
    ...actual,
    Link: ({ children, replace, to }: { children: ReactNode; replace?: boolean; to: string }) => <a data-replace={replace} href={to}>{children}</a>,
    useNavigate: () => navigateMock,
    useParams: () => ({ recipeId: 'recipe-1' }),
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

describe('RecipeDetailPage', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    apiMock.deleteRecipe.mockResolvedValue(undefined)
    apiMock.updateRecipe.mockResolvedValue(undefined)
    navigateMock.mockResolvedValue(undefined)
  })

  it('renders a loading skeleton while the recipe is pending', () => {
    apiMock.getRecipe.mockReturnValue(new Promise(() => {}))

    renderWithProviders(<RecipeDetailPage />)

    expect(screen.getByTestId('recipe-detail-page-skeleton')).toBeInTheDocument()
  })

  it('returns to the recipes page after saving changes', async () => {
    const user = userEvent.setup()

    apiMock.getRecipe.mockResolvedValue({
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
      name: 'Pasta',
      notes: 'Fresh sauce',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })

    renderWithProviders(<RecipeDetailPage />)

    await user.click(await screen.findByRole('button', { name: 'Save recipe' }))

    await waitFor(() => {
      expect(apiMock.updateRecipe).toHaveBeenCalledWith('recipe-1', expect.objectContaining({
        items: [{
          itemId: 'item-1',
          name: undefined,
          quantity: 2,
          sortOrder: 0,
        }],
        name: 'Pasta',
        notes: 'Fresh sauce',
      }))
      expect(navigateMock).toHaveBeenCalledWith({ replace: true, to: '/recipes' })
    })
  })

  it('marks the back link as a history replacement', async () => {
    apiMock.getRecipe.mockResolvedValue({
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
      name: 'Pasta',
      notes: 'Fresh sauce',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })

    renderWithProviders(<RecipeDetailPage />)

    const backLink = await screen.findByRole('link', { name: 'Back to recipes' })

    expect(backLink).toHaveAttribute('data-replace', 'true')
    expect(backLink).toHaveAttribute('href', '/recipes')
  })

  it('returns to the recipes page after deleting the recipe', async () => {
    const user = userEvent.setup()

    apiMock.getRecipe.mockResolvedValue({
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
      name: 'Pasta',
      notes: 'Fresh sauce',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })

    renderWithProviders(<RecipeDetailPage />)

    await user.click(await screen.findByRole('button', { name: 'Delete recipe' }))

    await waitFor(() => {
      expect(apiMock.deleteRecipe).toHaveBeenCalledWith('recipe-1')
      expect(navigateMock).toHaveBeenCalledWith({ replace: true, to: '/recipes' })
    })
  })

  it('shows a loading state while saving recipe changes', async () => {
    const user = userEvent.setup()
    let resolveUpdate!: () => void

    apiMock.getRecipe.mockResolvedValue({
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
      name: 'Pasta',
      notes: 'Fresh sauce',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    apiMock.updateRecipe.mockImplementationOnce(() => new Promise<void>((resolve) => {
      resolveUpdate = resolve
    }))

    renderWithProviders(<RecipeDetailPage />)

    await user.click(await screen.findByRole('button', { name: 'Save recipe' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save recipe' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Save recipe' })).toHaveAttribute('aria-busy', 'true')
    })

    resolveUpdate()
  })
})
