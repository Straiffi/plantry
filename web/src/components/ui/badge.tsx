import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    defaultVariants: {
      variant: 'default',
    },
    variants: {
      variant: {
        default: 'border-transparent bg-primary/12 text-primary',
        muted: 'border-border bg-muted text-muted-foreground',
        outline: 'border-border bg-background text-foreground',
      },
    },
  },
)

type Props = HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>

export const Badge = ({ className, variant, ...props }: Props) => {
  return <div className={cn(badgeVariants({ className, variant }))} {...props} />
}
