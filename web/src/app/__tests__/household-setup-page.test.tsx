import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HouseholdSetupPage } from '@/app/household-setup-page'
import { api, ApiError } from '@/lib/api'
import { renderWithProviders } from '@/test/render'

describe('HouseholdSetupPage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders create and join household actions', () => {
    renderWithProviders(<HouseholdSetupPage />)

    expect(screen.getByRole('heading', { name: 'Set up your household' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create household' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Join household' })).toBeInTheDocument()
  })

  it('creates a household from the entered name', async () => {
    vi.spyOn(api, 'createHousehold').mockResolvedValue({
      household: {
        createdAt: '2026-01-01T00:00:00.000Z',
        id: 'household-1',
        name: 'Home Kitchen',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      membership: {
        createdAt: '2026-01-01T00:00:00.000Z',
        householdId: 'household-1',
        id: 'membership-1',
        role: 'owner',
        userId: 'user-1',
      },
    })

    const user = userEvent.setup()

    renderWithProviders(<HouseholdSetupPage />)

    await user.type(screen.getByPlaceholderText('Household name'), 'Home Kitchen')
    await user.click(screen.getByRole('button', { name: 'Create household' }))

    expect(api.createHousehold).toHaveBeenCalledWith('Home Kitchen')
  })

  it('shows a localized invite-code error when joining fails', async () => {
    vi.spyOn(api, 'joinHousehold').mockRejectedValue(new ApiError('Invite code is invalid or no longer active', 404))

    const user = userEvent.setup()

    renderWithProviders(<HouseholdSetupPage />)

    await user.type(screen.getByPlaceholderText('Invite code'), 'BADCODE')
    await user.click(screen.getByRole('button', { name: 'Join household' }))

    expect(await screen.findByText('That invite code is not valid anymore. Check it and try again.')).toBeInTheDocument()
  })

  it('shows a loading state while creating a household', async () => {
    let resolveCreate!: (value: Awaited<ReturnType<typeof api.createHousehold>> | PromiseLike<Awaited<ReturnType<typeof api.createHousehold>>>) => void

    vi.spyOn(api, 'createHousehold').mockImplementationOnce(() => new Promise((resolve) => {
      resolveCreate = resolve
    }))

    const user = userEvent.setup()

    renderWithProviders(<HouseholdSetupPage />)

    await user.type(screen.getByPlaceholderText('Household name'), 'Home Kitchen')
    await user.click(screen.getByRole('button', { name: 'Create household' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create household' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Create household' })).toHaveAttribute('aria-busy', 'true')
    })

    resolveCreate({
      household: {
        createdAt: '2026-01-01T00:00:00.000Z',
        id: 'household-1',
        name: 'Home Kitchen',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      membership: {
        createdAt: '2026-01-01T00:00:00.000Z',
        householdId: 'household-1',
        id: 'membership-1',
        role: 'owner',
        userId: 'user-1',
      },
    })
  })
})
