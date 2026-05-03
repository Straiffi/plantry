import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'

describe('api client', () => {
  afterEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('logs request timing when browser timing logs are enabled', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ categories: [] }), {
      headers: {
        'server-timing': 'app;dur=12.3',
      },
      status: 200,
    }))
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    vi.stubGlobal('fetch', fetchMock)
    window.localStorage.setItem('plantry:log-api-timings', 'true')

    await api.getCategories()

    expect(fetchMock).toHaveBeenCalledWith('/api/categories', expect.objectContaining({
      credentials: 'include',
    }))
    expect(consoleInfoSpy).toHaveBeenCalledWith('[api]', expect.objectContaining({
      method: 'GET',
      path: '/categories',
      serverTiming: 'app;dur=12.3',
      status: 200,
    }))
  })
})
