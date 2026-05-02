import type { ReactNode } from 'react'

type Props = {
  actions?: ReactNode
  description?: string
  title: string
}

export const PageHeader = ({ actions, description, title }: Props) => {
  return (
    <div className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <h1 className="font-heading text-3xl tracking-tight text-foreground sm:text-4xl">{title}</h1>
        {description && <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}
