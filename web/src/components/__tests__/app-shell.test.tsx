import type { ReactNode } from 'react'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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
  }
})

describe('AppShell', () => {
  it('renders localized app navigation labels', () => {
    renderWithProviders(
      <AppShell>
        <div>content</div>
      </AppShell>,
    )

    expect(screen.getByText('Recipe App')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Recipes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Shopping List' })).toBeInTheDocument()
  })
})
