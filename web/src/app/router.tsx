import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'

import { HomePage } from '@/app/home-page'
import { RootLayout } from '@/app/root-layout'

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  component: HomePage,
  getParentRoute: () => rootRoute,
  path: '/',
})

const routeTree = rootRoute.addChildren([indexRoute])

export const router = createRouter({
  defaultPreload: 'intent',
  routeTree,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
