import { Label as LabelPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

type Props = ComponentProps<typeof LabelPrimitive.Root>

export const Label = ({ className, ...props }: Props) => {
  return (
    <LabelPrimitive.Root
      className={cn(
        'flex items-center gap-2 text-xs font-semibold uppercase tracking-wide select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      data-slot="label"
      {...props}
    />
  )
}
