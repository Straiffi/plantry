import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ProductsPage } from '@/app/products-page'
import { renderWithProviders } from '@/test/render'

const apiMock = vi.hoisted(() => ({
  archiveProduct: vi.fn(),
  createCategory: vi.fn(),
  createProduct: vi.fn(),
  deleteCategory: vi.fn(),
  getCategories: vi.fn(),
  getProducts: vi.fn(),
  restoreProduct: vi.fn(),
  updateProduct: vi.fn(),
}))

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

describe('ProductsPage', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    if (!HTMLElement.prototype.hasPointerCapture) {
      HTMLElement.prototype.hasPointerCapture = () => false
    }
    if (!HTMLElement.prototype.releasePointerCapture) {
      HTMLElement.prototype.releasePointerCapture = () => {}
    }
    if (!HTMLElement.prototype.setPointerCapture) {
      HTMLElement.prototype.setPointerCapture = () => {}
    }
    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = () => {}
    }
    apiMock.getCategories.mockResolvedValue([
      {
        createdAt: '2026-01-01T00:00:00.000Z',
        householdId: 'household-1',
        id: 'category-1',
        name: 'Produce',
        sortOrder: 0,
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ])
    apiMock.getProducts.mockResolvedValue([
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
        tags: ['fresh'],
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ])
  })

  it('renders a loading skeleton while the catalog is pending', () => {
    apiMock.getCategories.mockReturnValue(new Promise(() => {}))
    apiMock.getProducts.mockReturnValue(new Promise(() => {}))

    renderWithProviders(<ProductsPage />)

    expect(screen.getByTestId('products-page-skeleton')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Products' })).toBeInTheDocument()
  })

  it('does not render tag controls in the products UI', async () => {
    renderWithProviders(<ProductsPage />)

    expect(await screen.findByText('Tomato')).toBeInTheDocument()
    expect(screen.queryByText('No tags yet')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add tag' })).not.toBeInTheDocument()
    expect(screen.queryByText('fresh')).not.toBeInTheDocument()
  })

  it('updates the category from the product card', async () => {
    const user = userEvent.setup()

    renderWithProviders(<ProductsPage />)

    await screen.findByText('Tomato')
    await user.click(screen.getAllByRole('combobox')[1])
    await user.click(await screen.findByRole('option', { name: 'Produce' }))

    expect(apiMock.updateProduct).toHaveBeenCalledWith('item-1', { categoryId: 'category-1' })
  })
})
