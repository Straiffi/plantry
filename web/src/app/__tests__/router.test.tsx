import { act, cleanup, screen } from '@testing-library/react'
import { RouterProvider } from '@tanstack/react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'

vi.mock('@/app/authenticated-layout', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router')
  const { Outlet } = actual

  return {
    AuthenticatedLayout: () => <Outlet />,
  }
})

vi.mock('@/app/login-page', () => ({
  LoginPage: () => <div>login-page</div>,
}))

vi.mock('@/app/menu-page', () => ({
  MenuPage: () => <div>menu-page</div>,
}))

vi.mock('@/app/products-page', () => ({
  ProductsPage: () => <div>products-page</div>,
}))

vi.mock('@/app/recipe-detail-page', () => ({
  RecipeDetailPage: () => <div>recipe-detail-page</div>,
}))

vi.mock('@/app/recipes-page', () => ({
  RecipesPage: () => <div>recipes-page</div>,
}))

vi.mock('@/app/settings-page', () => ({
  SettingsPage: () => <div>settings-page</div>,
}))

vi.mock('@/app/shopping-list-page', () => ({
  ShoppingListPage: () => <div>shopping-list-page</div>,
}))

describe('router', () => {
  afterEach(() => {
    cleanup()
    window.history.replaceState({}, '', '/')
  })

  it('resolves the authenticated app routes', async () => {
    window.history.replaceState({}, '', '/shopping-list')

    const { router } = await import('@/app/router')

    renderWithProviders(<RouterProvider router={router} />)

    expect(await screen.findByText('shopping-list-page')).toBeInTheDocument()

    await act(async () => {
      await router.navigate({ to: '/products' })
    })

    expect(await screen.findByText('products-page')).toBeInTheDocument()

    await act(async () => {
      await router.navigate({ to: '/menu' })
    })

    expect(await screen.findByText('menu-page')).toBeInTheDocument()

    await act(async () => {
      await router.navigate({ to: '/recipes' })
    })

    expect(await screen.findByText('recipes-page')).toBeInTheDocument()

    await act(async () => {
      await router.navigate({
        params: { recipeId: 'recipe-1' },
        to: '/recipes/$recipeId',
      })
    })

    expect(await screen.findByText('recipe-detail-page')).toBeInTheDocument()

    await act(async () => {
      await router.navigate({ to: '/settings' })
    })

    expect(await screen.findByText('settings-page')).toBeInTheDocument()
  })
})
