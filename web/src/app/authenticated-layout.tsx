import { Navigate, Outlet } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { api } from '@/lib/api'
import { AppContext } from '@/app/app-context'
import { HouseholdSetupPage } from '@/app/household-setup-page'
import { LoadingPage } from '@/app/loading-page'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const isUnauthorizedError = (error: unknown) => {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 401
}

export const AuthenticatedLayout = () => {
  const { t } = useTranslation()
  const meQuery = useQuery({
    queryFn: api.getMe,
    queryKey: ['me'],
  })
  useQuery({
    enabled: Boolean(meQuery.data?.household && meQuery.data.householdMembership),
    queryFn: () => api.getProducts(false),
    queryKey: ['products', 'active'],
    staleTime: 300000,
  })

  if (meQuery.isPending) {
    return <LoadingPage />
  }

  if (isUnauthorizedError(meQuery.error)) {
    return <Navigate to="/login" />
  }

  if (meQuery.error || !meQuery.data) {
    return (
      <div className="min-h-svh bg-background px-4 py-10">
        <Card className="mx-auto max-w-lg">
          <CardHeader>
            <CardTitle>{t('app.workspaceErrorTitle')}</CardTitle>
            <CardDescription>{t('app.workspaceErrorDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => meQuery.refetch()}>{t('app.retry')}</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!meQuery.data.household || !meQuery.data.householdMembership) {
    return <HouseholdSetupPage />
  }

  return (
    <AppContext.Provider value={meQuery.data}>
      <AppShell>
        <Outlet />
      </AppShell>
    </AppContext.Provider>
  )
}
