import type { ReactNode } from 'react'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AppContext } from '@/app/app-context'
import { AppShell } from '@/components/app-shell'
import { renderWithProviders } from '@/test/render'

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router')

  return {
    ...actual,
    Link: ({ children, className, to }: { children: ReactNode; className?: string; to: string }) => {
      return (
        <a className={className} href={to}>
          {children}
        </a>
      )
    },
    useRouterState: () => '/shopping-list',
  }
})

describe('AppShell', () => {
  it('renders localized app navigation labels', () => {
    renderWithProviders(
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
          email: 'user@example.com',
          id: 'user-1',
          image: null,
          name: 'Chef User',
        },
      }}>
        <AppShell>
          <div>content</div>
        </AppShell>
      </AppContext.Provider>,
    )

    expect(screen.getAllByText('Plantry')).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Recipes' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Shopping List' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Products' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Settings' })).toHaveLength(2)
    expect(screen.getAllByText('owner member')).toHaveLength(1)
    expect(screen.queryByText('Move between groceries, recipes, products, and settings without losing the shared household context.')).not.toBeInTheDocument()
  })
})
