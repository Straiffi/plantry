import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'

import { i18n, i18nReady } from '@/i18n'
import { router } from '@/app/router'
import { createPlantryQueryClient } from '@/lib/query-client'
import './index.css'

const queryClient = createPlantryQueryClient()

void i18nReady.then(() => {
  document.title = i18n.t('app.name')
})

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
