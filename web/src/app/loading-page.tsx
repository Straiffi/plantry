import { useTranslation } from 'react-i18next'

export const LoadingPage = () => {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-8 text-center">
        <div className="mx-auto mb-4 size-12 animate-pulse rounded-full bg-primary/15" />
        <p className="text-sm font-medium text-muted-foreground">{t('app.loading')}</p>
      </div>
    </div>
  )
}
