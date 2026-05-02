import { Outlet, createRootRoute, createRoute, createRouter } from '@tanstack/react-router'

import { AuthenticatedLayout } from '@/app/authenticated-layout'
import { LoginPage } from '@/app/login-page'
import { ProductsPage } from '@/app/products-page'
import { RecipeDetailPage } from '@/app/recipe-detail-page'
import { RecipesPage } from '@/app/recipes-page'
import { SettingsPage } from '@/app/settings-page'
import { ShoppingListPage } from '@/app/shopping-list-page'

const rootRoute = createRootRoute({
  component: Outlet,
})

const loginRoute = createRoute({
  component: LoginPage,
  getParentRoute: () => rootRoute,
  path: '/login',
})

const appRoute = createRoute({
  component: AuthenticatedLayout,
  getParentRoute: () => rootRoute,
  path: '/',
})

const shoppingListRoute = createRoute({
  component: ShoppingListPage,
  getParentRoute: () => appRoute,
  path: '/shopping-list',
})

const productsRoute = createRoute({
  component: ProductsPage,
  getParentRoute: () => appRoute,
  path: '/products',
})

const recipesRoute = createRoute({
  component: RecipesPage,
  getParentRoute: () => appRoute,
  path: '/recipes',
})

const recipeDetailRoute = createRoute({
  component: RecipeDetailPage,
  getParentRoute: () => appRoute,
  path: '/recipes/$recipeId',
})

const settingsRoute = createRoute({
  component: SettingsPage,
  getParentRoute: () => appRoute,
  path: '/settings',
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([
    shoppingListRoute,
    productsRoute,
    recipesRoute,
    recipeDetailRoute,
    settingsRoute,
  ]),
])

export const router = createRouter({
  defaultPreload: 'intent',
  routeTree,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
