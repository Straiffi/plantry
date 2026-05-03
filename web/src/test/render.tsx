import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { I18nextProvider } from 'react-i18next'

import { i18n } from '@/i18n'
import { createPlantryQueryClient } from '@/lib/query-client'

export const createTestQueryClient = () => {
  return createPlantryQueryClient({
    queries: {
      retry: false,
    },
  })
}

export const renderWithProviders = (ui: ReactElement, queryClient = createTestQueryClient()) => {

  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </I18nextProvider>,
  )
}
