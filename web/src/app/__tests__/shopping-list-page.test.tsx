import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ShoppingListPage } from '@/app/shopping-list-page'
import type { ShoppingListItem } from '@/lib/api'
import { renderWithProviders } from '@/test/render'

const apiMock = vi.hoisted(() => ({
  addShoppingListItem: vi.fn(),
  deleteCheckedShoppingListItems: vi.fn(),
  deleteShoppingListItem: vi.fn(),
  getShoppingList: vi.fn(),
  searchProducts: vi.fn(),
  toggleShoppingListItem: vi.fn(),
  updateShoppingListItem: vi.fn(),
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

const shoppingListItem: ShoppingListItem = {
  checked: false,
  checkedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  householdId: 'household-1',
  id: 'shopping-list-item-1',
  item: {
    archivedAt: null,
    category: null,
    categoryId: null,
    id: 'item-1',
    name: 'Tomato',
  },
  itemId: 'item-1',
  quantity: 1,
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const checkedShoppingListItem: ShoppingListItem = {
  ...shoppingListItem,
  checked: true,
  checkedAt: '2026-01-04T00:00:00.000Z',
}

const createDeferred = <T,>() => {
  let reject!: (reason?: unknown) => void
  let resolve!: (value: T | PromiseLike<T>) => void

  const promise = new Promise<T>((innerResolve, innerReject) => {
    reject = innerReject
    resolve = innerResolve
  })

  return { promise, reject, resolve }
}

describe('ShoppingListPage', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    apiMock.deleteCheckedShoppingListItems.mockResolvedValue({ deletedCount: 0 })
    apiMock.deleteShoppingListItem.mockResolvedValue(undefined)
    apiMock.toggleShoppingListItem.mockResolvedValue(shoppingListItem)
    apiMock.updateShoppingListItem.mockResolvedValue(shoppingListItem)
  })

  it('renders a loading skeleton while the shopping list is pending', () => {
    apiMock.getShoppingList.mockReturnValue(new Promise(() => {}))

    renderWithProviders(<ShoppingListPage />)

    expect(screen.getByTestId('shopping-list-page-skeleton')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Shopping List' })).toBeInTheDocument()
  })

  it('opens and closes the draft row from the Add item button', async () => {
    const user = userEvent.setup()

    apiMock.getShoppingList.mockResolvedValue({ groups: [], items: [] })
    apiMock.searchProducts.mockResolvedValue([])

    renderWithProviders(<ShoppingListPage />)

    expect(await screen.findByRole('button', { name: 'Add item' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add item' }))

    expect(screen.getByPlaceholderText('Search or type a product name')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove item' }))

    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument()
  })

  it('adds a selected product and leaves a fresh draft row open', async () => {
    const user = userEvent.setup()

    apiMock.getShoppingList
      .mockResolvedValueOnce({
        groups: [{ category: null, items: [shoppingListItem] }],
        items: [shoppingListItem],
      })
      .mockResolvedValue({
        groups: [{ category: null, items: [shoppingListItem] }],
        items: [shoppingListItem],
      })
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
    apiMock.addShoppingListItem.mockResolvedValue(shoppingListItem)

    renderWithProviders(<ShoppingListPage />)

    await user.click(await screen.findByRole('button', { name: 'Add item' }))

    await user.type(screen.getByPlaceholderText('Search or type a product name'), 'Tomato')

    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(apiMock.addShoppingListItem).toHaveBeenCalledWith(expect.objectContaining({
        itemId: 'item-1',
        quantity: 1,
      }))
    })

    expect(await screen.findByText('Tomato')).toBeInTheDocument()
    const nextInput = screen.getByPlaceholderText('Search or type a product name')

    expect(nextInput).toHaveValue('')
    expect(nextInput).toHaveFocus()
  })

  it('offers Create product for unknown searches and adds by free text', async () => {
    const user = userEvent.setup()

    apiMock.getShoppingList
      .mockResolvedValueOnce({ groups: [], items: [] })
      .mockResolvedValue({
        groups: [{
          category: null,
          items: [{
            ...shoppingListItem,
            id: 'shopping-list-item-2',
            item: {
              ...shoppingListItem.item,
              id: 'item-2',
              name: 'Paprika',
            },
            itemId: 'item-2',
          }],
        }],
        items: [{
          ...shoppingListItem,
          id: 'shopping-list-item-2',
          item: {
            ...shoppingListItem.item,
            id: 'item-2',
            name: 'Paprika',
          },
          itemId: 'item-2',
        }],
      })
    apiMock.searchProducts.mockResolvedValue([])
    apiMock.addShoppingListItem.mockResolvedValue({
      ...shoppingListItem,
      id: 'shopping-list-item-2',
      item: {
        ...shoppingListItem.item,
        id: 'item-2',
        name: 'Paprika',
      },
      itemId: 'item-2',
    })

    renderWithProviders(<ShoppingListPage />)

    await user.click(await screen.findByRole('button', { name: 'Add item' }))
    await user.type(screen.getByPlaceholderText('Search or type a product name'), 'Paprika')

    const createButton = await screen.findByRole('button', { name: 'Create product "Paprika"' })

    expect(createButton).toBeInTheDocument()

    await user.click(createButton)

    await waitFor(() => {
      expect(apiMock.addShoppingListItem).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Paprika',
        quantity: 1,
      }))
    })

    expect(await screen.findByText('Paprika')).toBeInTheDocument()
    const nextInput = screen.getByPlaceholderText('Search or type a product name')

    expect(nextInput).toHaveValue('')
    expect(nextInput).toHaveFocus()
  })

  it('shows the category heading once without repeating it inside the row', async () => {
    apiMock.getShoppingList.mockResolvedValue({
      groups: [{
        category: {
          createdAt: '2026-01-01T00:00:00.000Z',
          householdId: 'household-1',
          id: 'category-1',
          name: 'Produce',
          sortOrder: 0,
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        items: [{
          ...shoppingListItem,
          item: {
            ...shoppingListItem.item,
            category: {
              createdAt: '2026-01-01T00:00:00.000Z',
              householdId: 'household-1',
              id: 'category-1',
              name: 'Produce',
              sortOrder: 0,
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
            categoryId: 'category-1',
          },
        }],
      }],
      items: [{
        ...shoppingListItem,
        item: {
          ...shoppingListItem.item,
          category: {
            createdAt: '2026-01-01T00:00:00.000Z',
            householdId: 'household-1',
            id: 'category-1',
            name: 'Produce',
            sortOrder: 0,
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          categoryId: 'category-1',
        },
      }],
    })

    renderWithProviders(<ShoppingListPage />)

    expect(await screen.findByText('Tomato')).toBeInTheDocument()
    expect(screen.getAllByText('Produce')).toHaveLength(1)
  })

  it('optimistically toggles an item while the request is pending', async () => {
    const user = userEvent.setup()
    const deferredToggle = createDeferred<typeof shoppingListItem>()

    apiMock.getShoppingList.mockResolvedValue({
      groups: [{ category: null, items: [shoppingListItem] }],
      items: [shoppingListItem],
    })
    apiMock.toggleShoppingListItem.mockImplementationOnce(() => deferredToggle.promise)

    renderWithProviders(<ShoppingListPage />)

    await user.click(await screen.findByRole('button', { name: 'Toggle checked state' }))

    expect(screen.getByRole('button', { name: 'Toggle checked state' })).toBeDisabled()
    expect(screen.getByText('Tomato')).toHaveClass('line-through')

    deferredToggle.resolve({
      ...shoppingListItem,
      checked: true,
      checkedAt: '2026-01-04T00:00:00.000Z',
    })

    await waitFor(() => {
      expect(screen.getByText('Tomato')).toHaveClass('line-through')
    })
  })

  it('rolls shopping list items back when the toggle request fails', async () => {
    const deferredToggle = createDeferred<typeof shoppingListItem>()
    const user = userEvent.setup()

    apiMock.getShoppingList.mockResolvedValue({
      groups: [{ category: null, items: [shoppingListItem] }],
      items: [shoppingListItem],
    })
    apiMock.toggleShoppingListItem.mockImplementationOnce(() => deferredToggle.promise)

    renderWithProviders(<ShoppingListPage />)

    await user.click(await screen.findByRole('button', { name: 'Toggle checked state' }))

    expect(screen.getByText('Tomato')).toHaveClass('line-through')

    deferredToggle.reject(new Error('Request failed'))

    await waitFor(() => {
      expect(screen.getByText('Tomato')).not.toHaveClass('line-through')
    })
  })

  it('deletes checked shopping list rows immediately from the header action', async () => {
    const deferredDelete = createDeferred<{ deletedCount: number }>()
    const user = userEvent.setup()

    apiMock.deleteCheckedShoppingListItems.mockImplementationOnce(() => deferredDelete.promise)
    apiMock.getShoppingList.mockResolvedValue({
      groups: [{ category: null, items: [checkedShoppingListItem, { ...shoppingListItem, id: 'shopping-list-item-2', item: { ...shoppingListItem.item, id: 'item-2', name: 'Paprika' }, itemId: 'item-2' }] }],
      items: [checkedShoppingListItem, { ...shoppingListItem, id: 'shopping-list-item-2', item: { ...shoppingListItem.item, id: 'item-2', name: 'Paprika' }, itemId: 'item-2' }],
    })

    renderWithProviders(<ShoppingListPage />)

    await user.click(await screen.findByRole('button', { name: 'Delete checked' }))

    expect(apiMock.deleteCheckedShoppingListItems).toHaveBeenCalled()
    expect(screen.queryByText('Tomato')).not.toBeInTheDocument()
    expect(screen.getByText('Paprika')).toBeInTheDocument()

    deferredDelete.resolve({ deletedCount: 1 })
  })

  it('keeps the delete button busy while deletion is pending', async () => {
    const deferredDelete = createDeferred<{ deletedCount: number }>()
    const user = userEvent.setup()

    apiMock.deleteCheckedShoppingListItems.mockImplementationOnce(() => deferredDelete.promise)
    apiMock.getShoppingList.mockResolvedValue({
      groups: [{ category: null, items: [checkedShoppingListItem] }],
      items: [checkedShoppingListItem],
    })

    renderWithProviders(<ShoppingListPage />)

    const deleteButton = await screen.findByRole('button', { name: 'Delete checked' })

    await user.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete checked' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Delete checked' })).toHaveAttribute('aria-busy', 'true')
    })

    deferredDelete.resolve({ deletedCount: 1 })

    await waitFor(() => {
      expect(screen.getByText('The shopping list is empty. Add a product or send a recipe here to get started.')).toBeInTheDocument()
    })
  })

  it('rolls checked shopping list rows back when deletion fails', async () => {
    const deferredDelete = createDeferred<{ deletedCount: number }>()
    const user = userEvent.setup()

    apiMock.deleteCheckedShoppingListItems.mockImplementationOnce(() => deferredDelete.promise)
    apiMock.getShoppingList.mockResolvedValue({
      groups: [{ category: null, items: [checkedShoppingListItem] }],
      items: [checkedShoppingListItem],
    })

    renderWithProviders(<ShoppingListPage />)

    await user.click(await screen.findByRole('button', { name: 'Delete checked' }))

    expect(screen.queryByText('Tomato')).not.toBeInTheDocument()

    deferredDelete.reject(new Error('Request failed'))

    await waitFor(() => {
      expect(screen.getByText('Tomato')).toBeInTheDocument()
      expect(screen.getByText('We could not update the shopping list just now.')).toBeInTheDocument()
    })
  })

  it('toggles an item when clicking its card content', async () => {
    const user = userEvent.setup()

    apiMock.getShoppingList.mockResolvedValue({
      groups: [{ category: null, items: [shoppingListItem] }],
      items: [shoppingListItem],
    })

    renderWithProviders(<ShoppingListPage />)

    await user.click(await screen.findByText('Tomato'))

    expect(apiMock.toggleShoppingListItem).toHaveBeenCalledWith('shopping-list-item-1')
  })
})
