import { useState } from 'react'
import { Navigate } from '@tanstack/react-router'
import { BookOpen, ChefHat, ShoppingBasket } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { LoadingPage } from '@/app/loading-page'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const highlights = [
  {
    icon: ShoppingBasket,
    key: 'auth.highlights.sharedList',
  },
  {
    icon: ChefHat,
    key: 'auth.highlights.recipeFlow',
  },
  {
    icon: BookOpen,
    key: 'auth.highlights.catalog',
  },
] as const

export const LoginPage = () => {
  const { t } = useTranslation()
  const { data, isPending } = authClient.useSession()
  const [isSigningIn, setIsSigningIn] = useState(false)

  if (isPending) {
    return <LoadingPage />
  }

  if (data) {
    return <Navigate to="/shopping-list" />
  }

  const handleSignIn = async () => {
    setIsSigningIn(true)

    try {
      await authClient.signIn.social({
        callbackURL: '/shopping-list',
        provider: 'google',
      })
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <div className="min-h-svh bg-background px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100svh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            {t('auth.kicker')}
          </div>

          <div className="space-y-4">
            <h1 className="max-w-3xl font-heading text-4xl leading-none tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {t('auth.title')}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              {t('auth.description')}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {highlights.map((highlight) => {
              const Icon = highlight.icon

              return (
                <Card key={highlight.key} className="border-border/60 bg-card/90">
                  <CardHeader className="pb-3">
                    <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle className="text-base">{t(`${highlight.key}.title`)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-6">{t(`${highlight.key}.description`)}</CardDescription>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        <Card className="border-border/60 bg-card/95">
          <CardHeader className="space-y-3">
            <CardTitle className="font-heading text-3xl">{t('auth.panelTitle')}</CardTitle>
            <CardDescription className="text-base leading-7">{t('auth.panelDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Button className="h-12 w-full rounded-xl text-base" disabled={isSigningIn} onClick={handleSignIn}>
              {isSigningIn ? t('auth.signingIn') : t('auth.googleButton')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
