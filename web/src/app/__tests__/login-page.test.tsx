import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LoginPage } from '@/app/login-page'
import { renderWithProviders } from '@/test/render'

const { socialSignIn } = vi.hoisted(() => ({
  socialSignIn: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signIn: {
      social: socialSignIn,
    },
    useSession: () => ({
      data: null,
      isPending: false,
    }),
  },
}))

describe('LoginPage', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the localized Google sign-in view', () => {
    renderWithProviders(<LoginPage />)

    expect(screen.getByRole('heading', { name: 'Plan meals, track groceries, and keep the pantry aligned.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument()
    expect(screen.getByText('One shared list')).toBeInTheDocument()
  })

  it('uses a relative callback URL for Google sign-in', async () => {
    const user = userEvent.setup()

    renderWithProviders(<LoginPage />)

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }))

    expect(socialSignIn).toHaveBeenCalledWith({
      callbackURL: '/shopping-list',
      provider: 'google',
    })
  })

  it('shows a loading state while Google sign-in is pending', async () => {
    const user = userEvent.setup()
    let resolveSignIn!: () => void

    socialSignIn.mockImplementationOnce(() => new Promise<void>((resolve) => {
      resolveSignIn = resolve
    }))

    renderWithProviders(<LoginPage />)

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }))

    expect(screen.getByRole('button', { name: 'Opening Google sign-in...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Opening Google sign-in...' })).toHaveAttribute('aria-busy', 'true')

    resolveSignIn()
  })
})
