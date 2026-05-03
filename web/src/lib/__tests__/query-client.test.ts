import { describe, expect, it } from 'vitest'

import { createPlantryQueryClient } from '@/lib/query-client'

describe('createPlantryQueryClient', () => {
  it('uses app defaults that keep fresh data cached briefly', () => {
    const queryClient = createPlantryQueryClient()
    const defaults = queryClient.getDefaultOptions()

    expect(defaults.queries?.staleTime).toBe(60000)
    expect(defaults.queries?.gcTime).toBe(600000)
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false)
    expect(defaults.queries?.retry).toBe(1)
    expect(defaults.mutations?.retry).toBe(false)
  })

  it('allows tests and focused callers to override defaults', () => {
    const queryClient = createPlantryQueryClient({
      queries: {
        retry: false,
      },
    })

    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(60000)
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(false)
  })
})
