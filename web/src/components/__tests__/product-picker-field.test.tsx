import { useState } from 'react'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ProductPickerField, type ProductSelection } from '@/components/product-picker-field'
import { renderWithProviders } from '@/test/render'

const apiMock = vi.hoisted(() => ({
  searchProducts: vi.fn(),
}))

vi.mock('@/lib/api', () => {
  return {
    api: apiMock,
  }
})

const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void

  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve
  })

  return { promise, resolve }
}

const tomatoProduct = {
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
}

type StatefulPickerProps = {
  onSelectionChange?: (selection: ProductSelection) => void
}

const StatefulPicker = ({ onSelectionChange = vi.fn() }: StatefulPickerProps) => {
  const [value, setValue] = useState('')

  return (
    <ProductPickerField
      disabled={false}
      onSelectionChange={onSelectionChange}
      onValueChange={setValue}
      placeholder="Search or type a product name"
      value={value}
    />
  )
}

describe('ProductPickerField', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    apiMock.searchProducts.mockResolvedValue([])
  })

  it('waits for the first search to settle before offering to create a product', async () => {
    const deferredSearch = createDeferred<typeof tomatoProduct[]>()
    const user = userEvent.setup()

    apiMock.searchProducts.mockImplementation((query: string) => {
      if (query === 'Tomato') {
        return deferredSearch.promise
      }

      return Promise.resolve([])
    })

    renderWithProviders(<StatefulPicker />)

    await user.type(screen.getByPlaceholderText('Search or type a product name'), 'Tomato')

    await waitFor(() => {
      expect(apiMock.searchProducts).toHaveBeenCalledWith('Tomato')
    })

    expect(screen.queryByRole('button', { name: 'Create product "Tomato"' })).not.toBeInTheDocument()

    deferredSearch.resolve([tomatoProduct])

    expect(await screen.findByRole('button', { name: 'Tomato' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create product "Tomato"' })).not.toBeInTheDocument()
  })

  it('does not commit a create selection while the first search is still pending', async () => {
    const deferredSearch = createDeferred<typeof tomatoProduct[]>()
    const onSelectionChange = vi.fn()
    const user = userEvent.setup()

    apiMock.searchProducts.mockImplementation((query: string) => {
      if (query === 'Tomato') {
        return deferredSearch.promise
      }

      return Promise.resolve([])
    })

    renderWithProviders(<StatefulPicker onSelectionChange={onSelectionChange} />)

    await user.type(screen.getByPlaceholderText('Search or type a product name'), 'Tomato')
    await waitFor(() => {
      expect(apiMock.searchProducts).toHaveBeenCalledWith('Tomato')
    })

    await user.keyboard('{Enter}')

    expect(onSelectionChange).not.toHaveBeenCalled()

    deferredSearch.resolve([tomatoProduct])

    await screen.findByRole('button', { name: 'Tomato' })
    await user.keyboard('{Enter}')

    expect(onSelectionChange).toHaveBeenCalledWith({
      product: expect.objectContaining({
        id: 'item-1',
        name: 'Tomato',
      }),
      type: 'existing',
    })
  })
})
