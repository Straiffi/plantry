import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LoginPage } from '@/app/login-page'
import { renderWithProviders } from '@/test/render'

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signIn: {
      social: vi.fn(),
    },
    useSession: () => ({
      data: null,
      isPending: false,
    }),
  },
}))

describe('LoginPage', () => {
  it('renders the localized Google sign-in view', () => {
    renderWithProviders(<LoginPage />)

    expect(screen.getByRole('heading', { name: 'Plan meals, track groceries, and keep the pantry aligned.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument()
    expect(screen.getByText('One shared list')).toBeInTheDocument()
  })
})
