import { describe, expect, it } from 'vitest'

import { app } from './app.js'

describe('app', () => {
  it('returns an ok health response', async () => {
    const response = await app.request('http://localhost/api/health')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      service: 'api',
      status: 'ok',
    })
  })

  it('rejects unauthenticated requests to /api/me', async () => {
    const response = await app.request('http://localhost/api/me')

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      message: 'Unauthorized',
    })
  })
})
