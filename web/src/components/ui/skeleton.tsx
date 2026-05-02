import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

type Props = HTMLAttributes<HTMLDivElement>

export const Skeleton = ({ className, ...props }: Props) => {
  return <div className={cn('animate-pulse rounded-md bg-muted/70', className)} {...props} />
}
