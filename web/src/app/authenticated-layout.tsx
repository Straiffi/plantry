import { Navigate, Outlet } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { api } from '@/lib/api'
import { authClient } from '@/lib/auth-client'
import { AppContext } from '@/app/app-context'
import { HouseholdSetupPage } from '@/app/household-setup-page'
import { LoadingPage } from '@/app/loading-page'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const AuthenticatedLayout = () => {
  const { t } = useTranslation()
  const sessionState = authClient.useSession()
  const meQuery = useQuery({
    enabled: !!sessionState.data,
    queryFn: api.getMe,
    queryKey: ['me'],
  })
  useQuery({
    enabled: Boolean(sessionState.data && meQuery.data?.household && meQuery.data.householdMembership),
    queryFn: () => api.getProducts(false),
    queryKey: ['products', 'active'],
    staleTime: 300000,
  })

  if (sessionState.isPending || (sessionState.data && meQuery.isPending)) {
    return <LoadingPage />
  }

  if (!sessionState.data) {
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
