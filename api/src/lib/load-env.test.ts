import { describe, expect, it, vi } from 'vitest'

import { loadEnvironmentFiles } from './load-env.js'

describe('loadEnvironmentFiles', () => {
  it('does nothing when process.loadEnvFile is unavailable', () => {
    expect(() => loadEnvironmentFiles({
      envFileLoader: null,
      fileExists: () => true,
    })).not.toThrow()
  })

  it('loads .env.local before .env when both files exist', () => {
    const loadEnvFile = vi.fn()

    loadEnvironmentFiles({
      envFileLoader: loadEnvFile,
      envLocalPath: '/tmp/.env.local',
      envPath: '/tmp/.env',
      fileExists: () => true,
    })

    expect(loadEnvFile).toHaveBeenNthCalledWith(1, '/tmp/.env.local')
    expect(loadEnvFile).toHaveBeenNthCalledWith(2, '/tmp/.env')
  })
})
