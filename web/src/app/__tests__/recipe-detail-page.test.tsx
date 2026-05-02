import type { ReactNode } from 'react'
import { cleanup, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RecipeDetailPage } from '@/app/recipe-detail-page'
import { renderWithProviders } from '@/test/render'

const apiMock = vi.hoisted(() => ({
  getRecipe: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router')

  return {
    ...actual,
    Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
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
  })

  it('renders a loading skeleton while the recipe is pending', () => {
    apiMock.getRecipe.mockReturnValue(new Promise(() => {}))

    renderWithProviders(<RecipeDetailPage />)

    expect(screen.getByTestId('recipe-detail-page-skeleton')).toBeInTheDocument()
  })
})
