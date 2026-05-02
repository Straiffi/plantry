import { Popover as PopoverPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export const Popover = (props: ComponentProps<typeof PopoverPrimitive.Root>) => {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

export const PopoverTrigger = (props: ComponentProps<typeof PopoverPrimitive.Trigger>) => {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

export const PopoverAnchor = (props: ComponentProps<typeof PopoverPrimitive.Anchor>) => {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

type PopoverContentProps = ComponentProps<typeof PopoverPrimitive.Content>

export const PopoverContent = ({ align = 'center', className, sideOffset = 6, ...props }: PopoverContentProps) => {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        className={cn(
          'z-50 flex w-72 flex-col gap-4 border border-border bg-popover p-4 text-sm text-popover-foreground shadow-md outline-hidden data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
          className,
        )}
        data-slot="popover-content"
        sideOffset={sideOffset}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}
