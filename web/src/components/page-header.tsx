import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type Props = {
  actions?: ReactNode
  description?: string
  title: string
  titleClassName?: string
}

export const PageHeader = ({ actions, description, title, titleClassName }: Props) => {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-5">
      <div className="min-w-0 flex-1 space-y-2">
        <h1 className={cn('font-heading text-2xl tracking-tight text-foreground sm:text-4xl', titleClassName)}>{title}</h1>
        {description && <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex w-full shrink-0 items-stretch gap-3 sm:w-auto sm:items-center">{actions}</div>}
    </div>
  )
}
