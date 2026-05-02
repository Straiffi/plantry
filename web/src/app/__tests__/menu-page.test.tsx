import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MenuPage } from '@/app/menu-page'
import { renderWithProviders } from '@/test/render'

const apiMock = vi.hoisted(() => ({
  addMenuItemToShoppingList: vi.fn(),
  addUncheckedMenuToShoppingList: vi.fn(),
  deleteCheckedMenuItems: vi.fn(),
  getMenu: vi.fn(),
  toggleMenuItemChecked: vi.fn(),
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

const menuItem = {
  checked: false,
  checkedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  householdId: 'household-1',
  id: 'menu-item-1',
  lastAddedAt: '2026-01-03T12:00:00.000Z',
  recipe: {
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
  recipeId: 'recipe-1',
  updatedAt: '2026-01-03T12:00:00.000Z',
}

describe('MenuPage', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    apiMock.addMenuItemToShoppingList.mockResolvedValue({ items: [], menuItem })
    apiMock.addUncheckedMenuToShoppingList.mockResolvedValue({ items: [], menuItems: [menuItem] })
    apiMock.deleteCheckedMenuItems.mockResolvedValue({ deletedCount: 1 })
    apiMock.toggleMenuItemChecked.mockResolvedValue({ ...menuItem, checked: true, checkedAt: '2026-01-04T00:00:00.000Z' })
  })

  it('renders a loading skeleton while the menu is pending', () => {
    apiMock.getMenu.mockReturnValue(new Promise(() => {}))

    renderWithProviders(<MenuPage />)

    expect(screen.getByTestId('menu-page-skeleton')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Menu' })).toBeInTheDocument()
  })

  it('renders an empty state when there are no menu items', async () => {
    apiMock.getMenu.mockResolvedValue({ items: [] })

    renderWithProviders(<MenuPage />)

    expect(await screen.findByText('The menu is empty. Add recipes from the recipes page to build your next meal plan.')).toBeInTheDocument()
  })

  it('expands and collapses menu rows when the recipe is clicked', async () => {
    const user = userEvent.setup()

    apiMock.getMenu.mockResolvedValue({ items: [menuItem] })

    renderWithProviders(<MenuPage />)

    expect(await screen.findByText('Pasta')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add recipe to shopping list' })).not.toBeInTheDocument()

    await user.click(screen.getByText('Pasta'))

    expect(screen.getByText('Tomato')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add recipe to shopping list' })).toBeInTheDocument()

    await user.click(screen.getByText('Pasta'))

    expect(screen.queryByRole('button', { name: 'Add recipe to shopping list' })).not.toBeInTheDocument()
  })

  it('toggles menu item checked state', async () => {
    const user = userEvent.setup()

    apiMock.getMenu.mockResolvedValue({ items: [menuItem] })

    renderWithProviders(<MenuPage />)

    await user.click(await screen.findByRole('button', { name: 'Toggle checked state' }))

    expect(apiMock.toggleMenuItemChecked).toHaveBeenCalledWith('menu-item-1')
  })

  it('adds a single menu recipe to the shopping list from the expanded row', async () => {
    const user = userEvent.setup()

    apiMock.getMenu.mockResolvedValue({ items: [menuItem] })

    renderWithProviders(<MenuPage />)

    await user.click(await screen.findByText('Pasta'))
    await user.click(screen.getByRole('button', { name: 'Add recipe to shopping list' }))

    expect(apiMock.addMenuItemToShoppingList).toHaveBeenCalledWith('menu-item-1')
  })

  it('adds unchecked menu recipes to the shopping list from the header action', async () => {
    const user = userEvent.setup()

    apiMock.getMenu.mockResolvedValue({ items: [menuItem] })

    renderWithProviders(<MenuPage />)

    await user.click(await screen.findByRole('button', { name: 'Add all to shopping list' }))

    expect(apiMock.addUncheckedMenuToShoppingList).toHaveBeenCalled()
  })

  it('deletes checked menu rows through the confirmation dialog', async () => {
    const user = userEvent.setup()

    apiMock.getMenu.mockResolvedValue({ items: [{ ...menuItem, checked: true, checkedAt: '2026-01-04T00:00:00.000Z' }] })

    renderWithProviders(<MenuPage />)

    await user.click(await screen.findByRole('button', { name: 'Delete checked' }))
    await user.click(await screen.findByRole('button', { name: 'Delete checked menu rows' }))

    await waitFor(() => {
      expect(apiMock.deleteCheckedMenuItems).toHaveBeenCalled()
    })
  })
})
