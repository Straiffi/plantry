import type { ReactNode } from 'react'
import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthenticatedLayout } from '@/app/authenticated-layout'
import { renderWithProviders } from '@/test/render'

const apiMock = vi.hoisted(() => ({
  getMe: vi.fn(),
  getProducts: vi.fn(),
}))

vi.mock('@/lib/api', () => {
  return {
    api: apiMock,
  }
})

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router')

  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div>navigate:{to}</div>,
    Outlet: () => <div>authenticated outlet</div>,
  }
})

vi.mock('@/components/app-shell', () => {
  return {
    AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  }
})

vi.mock('@/app/household-setup-page', () => {
  return {
    HouseholdSetupPage: () => <div>household setup</div>,
  }
})

vi.mock('@/app/loading-page', () => {
  return {
    LoadingPage: () => <div>loading</div>,
  }
})

describe('AuthenticatedLayout', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    apiMock.getMe.mockResolvedValue({
      household: {
        createdAt: '2026-01-01T00:00:00.000Z',
        id: 'household-1',
        name: 'Home Kitchen',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      householdMembership: {
        createdAt: '2026-01-01T00:00:00.000Z',
        householdId: 'household-1',
        id: 'membership-1',
        role: 'owner',
        userId: 'user-1',
      },
      session: {
        id: 'session-1',
        userId: 'user-1',
      },
      user: {
        email: 'chef@example.com',
        id: 'user-1',
        image: null,
        name: 'Chef User',
      },
    })
    apiMock.getProducts.mockResolvedValue([])
  })

  it('preloads active products after loading the authenticated workspace', async () => {
    renderWithProviders(<AuthenticatedLayout />)

    expect(screen.getByText('loading')).toBeInTheDocument()
    expect(await screen.findByText('authenticated outlet')).toBeInTheDocument()

    await waitFor(() => {
      expect(apiMock.getMe).toHaveBeenCalledTimes(1)
      expect(apiMock.getProducts).toHaveBeenCalledWith(false)
    })
  })

  it('redirects to login when /api/me returns unauthorized', async () => {
    apiMock.getMe.mockRejectedValue({ status: 401 })

    renderWithProviders(<AuthenticatedLayout />)

    expect(await screen.findByText('navigate:/login')).toBeInTheDocument()
    expect(apiMock.getProducts).not.toHaveBeenCalled()
  })

  it('shows household setup without preloading products when the user has no household', async () => {
    apiMock.getMe.mockResolvedValue({
      household: null,
      householdMembership: null,
      session: {
        id: 'session-1',
        userId: 'user-1',
      },
      user: {
        email: 'chef@example.com',
        id: 'user-1',
        image: null,
        name: 'Chef User',
      },
    })

    renderWithProviders(<AuthenticatedLayout />)

    expect(await screen.findByText('household setup')).toBeInTheDocument()
    expect(apiMock.getProducts).not.toHaveBeenCalled()
  })
})
