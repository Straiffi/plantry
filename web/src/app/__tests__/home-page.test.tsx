import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HomePage } from '@/app/home-page'
import { renderWithProviders } from '@/test/render'

describe('HomePage', () => {
  it('renders the localized products section', () => {
    renderWithProviders(<HomePage />)

    expect(screen.getByRole('heading', { name: 'Products' })).toBeInTheDocument()
    expect(screen.getByText('Manage reusable household products, categories, tags, and archives.')).toBeInTheDocument()
  })
})
