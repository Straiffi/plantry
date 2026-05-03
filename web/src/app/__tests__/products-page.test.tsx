import type { ReactNode } from 'react'
import { act, cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ProductsPage } from '@/app/products-page'
import { renderWithProviders } from '@/test/render'

const dndMock = vi.hoisted(() => ({
  onDragEnd: null as null | ((event: { active: { id: string }; over: { id: string } | null }) => void),
  onDragStart: null as null | ((event: { active: { id: string } }) => void),
}))

type CategoryFixture = {
  createdAt: string
  householdId: string
  id: string
  name: string
  sortOrder: number
  updatedAt: string
}

const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void

  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve
  })

  return { promise, resolve }
}

const apiMock = vi.hoisted(() => ({
  archiveProduct: vi.fn(),
  createCategory: vi.fn(),
  createProduct: vi.fn(),
  deleteCategory: vi.fn(),
  getCategories: vi.fn(),
  getProducts: vi.fn(),
  reorderCategories: vi.fn(),
  restoreProduct: vi.fn(),
  updateProduct: vi.fn(),
}))

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd, onDragStart }: { children: ReactNode; onDragEnd: typeof dndMock.onDragEnd; onDragStart: typeof dndMock.onDragStart }) => {
    dndMock.onDragEnd = onDragEnd
    dndMock.onDragStart = onDragStart

    return <div>{children}</div>
  },
  DragOverlay: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PointerSensor: class {},
  closestCenter: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn((...sensors: unknown[]) => sensors),
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  arrayMove: <T,>(items: T[], from: number, to: number) => {
    const nextItems = [...items]
    const [movedItem] = nextItems.splice(from, 1)

    nextItems.splice(to, 0, movedItem as T)

    return nextItems
  },
  defaultAnimateLayoutChanges: vi.fn(() => false),
  useSortable: vi.fn(() => ({
    attributes: {},
    isDragging: false,
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
  })),
  verticalListSortingStrategy: {},
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
  },
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
  const getCategoryOrder = () => {
    return screen.getAllByText(/Produce|Pantry|Dairy/).map((node) => node.textContent)
  }

  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    dndMock.onDragEnd = null
    dndMock.onDragStart = null
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
    apiMock.reorderCategories.mockResolvedValue([])
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

  it('renders products newest first by createdAt', async () => {
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
        tags: [],
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        archivedAt: null,
        category: null,
        categoryId: null,
        createdAt: '2026-01-03T00:00:00.000Z',
        createdByUserId: 'user-1',
        householdId: 'household-1',
        id: 'item-2',
        name: 'Apple',
        normalizedName: 'apple',
        tags: [],
        updatedAt: '2026-01-03T00:00:00.000Z',
      },
      {
        archivedAt: null,
        category: null,
        categoryId: null,
        createdAt: '2026-01-02T00:00:00.000Z',
        createdByUserId: 'user-1',
        householdId: 'household-1',
        id: 'item-3',
        name: 'Bread',
        normalizedName: 'bread',
        tags: [],
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    ])

    renderWithProviders(<ProductsPage />)

    const apple = await screen.findByText('Apple')
    const bread = screen.getByText('Bread')
    const tomato = screen.getByText('Tomato')

    expect(apple.compareDocumentPosition(bread) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(bread.compareDocumentPosition(tomato) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('updates the category from the product card', async () => {
    const user = userEvent.setup()

    renderWithProviders(<ProductsPage />)

    await screen.findByText('Tomato')
    await user.click(screen.getAllByRole('combobox')[1])
    await user.click(await screen.findByRole('option', { name: 'Produce' }))

    expect(apiMock.updateProduct).toHaveBeenCalledWith('item-1', { categoryId: 'category-1' })
  })

  it('disables the product category select while the update is pending', async () => {
    const deferredUpdate = createDeferred<void>()
    const user = userEvent.setup()

    apiMock.updateProduct.mockImplementationOnce(() => deferredUpdate.promise)

    renderWithProviders(<ProductsPage />)

    await screen.findByText('Tomato')
    await user.click(screen.getAllByRole('combobox')[1]!)
    await user.click(await screen.findByRole('option', { name: 'Produce' }))

    await waitFor(() => {
      expect(screen.getAllByRole('combobox')[1]).toBeDisabled()
      expect(screen.getAllByRole('combobox')[1]).toHaveAttribute('aria-busy', 'true')
    })

    deferredUpdate.resolve(undefined)
  })

  it('keeps the latest optimistic category order when reorder responses resolve out of order', async () => {
    const firstResponse = createDeferred<CategoryFixture[]>()
    const secondResponse = createDeferred<CategoryFixture[]>()
    const initialCategories: CategoryFixture[] = [
      {
        createdAt: '2026-01-01T00:00:00.000Z',
        householdId: 'household-1',
        id: 'category-1',
        name: 'Produce',
        sortOrder: 1,
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        createdAt: '2026-01-01T00:00:00.000Z',
        householdId: 'household-1',
        id: 'category-2',
        name: 'Pantry',
        sortOrder: 2,
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        createdAt: '2026-01-01T00:00:00.000Z',
        householdId: 'household-1',
        id: 'category-3',
        name: 'Dairy',
        sortOrder: 3,
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]

    apiMock.getCategories.mockResolvedValue(initialCategories)
    apiMock.reorderCategories
      .mockImplementationOnce(() => firstResponse.promise)
      .mockImplementationOnce(() => secondResponse.promise)

    renderWithProviders(<ProductsPage />)

    expect(await screen.findByText('Dairy')).toBeInTheDocument()

    await act(async () => {
      dndMock.onDragEnd?.({ active: { id: 'category-1' }, over: { id: 'category-2' } })
    })

    await waitFor(() => {
      expect(getCategoryOrder()).toEqual(['Pantry', 'Produce', 'Dairy'])
    })

    await act(async () => {
      dndMock.onDragEnd?.({ active: { id: 'category-1' }, over: { id: 'category-3' } })
    })

    await waitFor(() => {
      expect(getCategoryOrder()).toEqual(['Pantry', 'Dairy', 'Produce'])
    })

    await act(async () => {
      firstResponse.resolve([
        { ...initialCategories[1]!, sortOrder: 1 },
        { ...initialCategories[0]!, sortOrder: 2 },
        { ...initialCategories[2]!, sortOrder: 3 },
      ])
      await firstResponse.promise
    })

    expect(getCategoryOrder()).toEqual(['Pantry', 'Dairy', 'Produce'])

    await act(async () => {
      secondResponse.resolve([
        { ...initialCategories[1]!, sortOrder: 1 },
        { ...initialCategories[2]!, sortOrder: 2 },
        { ...initialCategories[0]!, sortOrder: 3 },
      ])
      await secondResponse.promise
    })

    await waitFor(() => {
      expect(getCategoryOrder()).toEqual(['Pantry', 'Dairy', 'Produce'])
    })
  })
})
