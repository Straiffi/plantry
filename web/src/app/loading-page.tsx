import { useTranslation } from 'react-i18next'

export const LoadingPage = () => {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-svh items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(164,122,76,0.15),_transparent_40%),var(--background)] px-6">
      <div className="w-full max-w-sm rounded-[2rem] border border-border/60 bg-card/90 p-8 text-center shadow-[0_18px_60px_rgba(62,44,32,0.08)] backdrop-blur">
        <div className="mx-auto mb-4 size-12 animate-pulse rounded-full bg-primary/15" />
        <p className="text-sm font-medium text-muted-foreground">{t('app.loading')}</p>
      </div>
    </div>
  )
}
