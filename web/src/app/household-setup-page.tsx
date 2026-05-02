import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Home, LogIn } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const getCreateErrorMessage = (error: unknown, t: ReturnType<typeof useTranslation>['t']) => {
  if (error instanceof ApiError && error.status === 400) {
    return t('householdSetup.createInvalidName')
  }

  return t('householdSetup.createError')
}

const getJoinErrorMessage = (error: unknown, t: ReturnType<typeof useTranslation>['t']) => {
  if (error instanceof ApiError && (error.status === 400 || error.status === 404)) {
    return t('householdSetup.joinInvalidCode')
  }

  return t('householdSetup.joinError')
}

export const HouseholdSetupPage = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [createError, setCreateError] = useState<string | null>(null)
  const [householdName, setHouseholdName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)

  const handleSuccess = async () => {
    setCreateError(null)
    setJoinError(null)
    await queryClient.invalidateQueries({ queryKey: ['me'] })
  }

  const createHouseholdMutation = useMutation({
    mutationFn: () => api.createHousehold(householdName),
    onSuccess: handleSuccess,
  })

  const joinHouseholdMutation = useMutation({
    mutationFn: () => api.joinHousehold(inviteCode),
    onSuccess: handleSuccess,
  })

  return (
    <div className="min-h-svh bg-background px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-5xl items-center">
        <div className="w-full space-y-8">
          <div className="space-y-3 text-center sm:text-left">
            <h1 className="font-heading text-4xl tracking-tight text-foreground sm:text-5xl">
              {t('householdSetup.title')}
            </h1>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
              {t('householdSetup.description')}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/60 bg-card/90">
              <CardHeader>
                <div className="mb-2 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Home className="size-5" />
                </div>
                <CardTitle>{t('householdSetup.createTitle')}</CardTitle>
                <CardDescription>{t('householdSetup.createDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  onChange={(event) => setHouseholdName(event.target.value)}
                  placeholder={t('householdSetup.namePlaceholder')}
                  value={householdName}
                />
                {createError && <p className="text-sm text-destructive">{createError}</p>}
                <Button
                  className="w-full"
                  disabled={createHouseholdMutation.isPending || !householdName.trim()}
                  loading={createHouseholdMutation.isPending}
                  onClick={() => createHouseholdMutation.mutate(undefined, {
                    onError: (error) => {
                      setCreateError(getCreateErrorMessage(error, t))
                    },
                  })}
                  type="button"
                >
                  {t('householdSetup.createAction')}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/90">
              <CardHeader>
                <div className="mb-2 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <LogIn className="size-5" />
                </div>
                <CardTitle>{t('householdSetup.joinTitle')}</CardTitle>
                <CardDescription>{t('householdSetup.joinDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  onChange={(event) => setInviteCode(event.target.value)}
                  placeholder={t('householdSetup.codePlaceholder')}
                  value={inviteCode}
                />
                {joinError && <p className="text-sm text-destructive">{joinError}</p>}
                <Button
                  className="w-full"
                  disabled={joinHouseholdMutation.isPending || !inviteCode.trim()}
                  loading={joinHouseholdMutation.isPending}
                  onClick={() => joinHouseholdMutation.mutate(undefined, {
                    onError: (error) => {
                      setJoinError(getJoinErrorMessage(error, t))
                    },
                  })}
                  type="button"
                  variant="outline"
                >
                  {t('householdSetup.joinAction')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
