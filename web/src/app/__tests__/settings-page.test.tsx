import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppContext } from '@/app/app-context'
import { SettingsPage } from '@/app/settings-page'
import { renderWithProviders } from '@/test/render'

const apiMock = vi.hoisted(() => ({
  createInviteCode: vi.fn(),
  getHouseholdMembers: vi.fn(),
  getInviteCodes: vi.fn(),
}))

const authClientMock = vi.hoisted(() => ({
  signOut: vi.fn(),
}))

vi.mock('@/lib/api', () => {
  return {
    api: apiMock,
  }
})

vi.mock('@/lib/auth-client', () => {
  return {
    authClient: authClientMock,
  }
})

const renderPage = () => {
  return renderWithProviders(
    <AppContext.Provider value={{
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
    }}>
      <SettingsPage />
    </AppContext.Provider>,
  )
}

describe('SettingsPage', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    authClientMock.signOut.mockResolvedValue(undefined)
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
    apiMock.createInviteCode.mockResolvedValue({
      code: 'WELCOME123',
      createdAt: '2026-01-01T00:00:00.000Z',
      createdByUserId: 'user-1',
      expiresAt: null,
      householdId: 'household-1',
      id: 'invite-1',
      usedAt: null,
    })
    apiMock.getInviteCodes.mockResolvedValue([])
  })

  it('renders the household member list in settings', async () => {
    apiMock.getHouseholdMembers.mockResolvedValue([
      {
        createdAt: '2026-01-01T00:00:00.000Z',
        householdId: 'household-1',
        id: 'membership-1',
        role: 'owner',
        user: {
          email: 'chef@example.com',
          id: 'user-1',
          image: null,
          name: 'Chef User',
        },
        userId: 'user-1',
      },
      {
        createdAt: '2026-01-02T00:00:00.000Z',
        householdId: 'household-1',
        id: 'membership-2',
        role: 'member',
        user: {
          email: 'sous@example.com',
          id: 'user-2',
          image: null,
          name: 'Sous Chef',
        },
        userId: 'user-2',
      },
    ])

    renderPage()

    expect(await screen.findByText('Sous Chef')).toBeInTheDocument()
    expect(screen.getByText('Household members')).toBeInTheDocument()
    expect(screen.getByText('See who currently has access to this household.')).toBeInTheDocument()
    expect(screen.getByText('sous@example.com')).toBeInTheDocument()
    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.getByText('member member')).toBeInTheDocument()
    expect(apiMock.getHouseholdMembers).toHaveBeenCalledTimes(1)
  })

  it('renders an empty member state when no household members are returned', async () => {
    apiMock.getHouseholdMembers.mockResolvedValue([])

    renderPage()

    expect(await screen.findByText('No one else has joined this household yet.')).toBeInTheDocument()
  })

  it('copies an invite code from settings', async () => {
    const user = userEvent.setup()

    apiMock.getHouseholdMembers.mockResolvedValue([])
    apiMock.getInviteCodes.mockResolvedValue([
      {
        code: 'OPLY9AJ2QY',
        createdAt: '2026-01-01T00:00:00.000Z',
        createdByUserId: 'user-1',
        expiresAt: null,
        householdId: 'household-1',
        id: 'invite-1',
        usedAt: null,
      },
    ])

    renderPage()

    await screen.findByText('OPLY9AJ2QY')
    const writeTextSpy = vi.spyOn(window.navigator.clipboard, 'writeText')
    await user.click(screen.getByRole('button', { name: 'Copy code' }))

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledWith('OPLY9AJ2QY')
    })
  })
})
