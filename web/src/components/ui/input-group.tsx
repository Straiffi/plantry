import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps, HTMLAttributes } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export const InputGroup = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        'group/input-group relative flex h-10 w-full min-w-0 items-center border border-transparent border-b-input bg-transparent transition-[color,border-color] has-[[data-slot=input-group-control]:focus-visible]:border-b-ring has-[>textarea]:h-auto',
        className,
      )}
      data-slot="input-group"
      role="group"
      {...props}
    />
  )
}

const inputGroupAddonVariants = cva('flex h-auto items-center justify-center gap-2 py-2 text-sm font-medium text-muted-foreground select-none [&>svg:not([class*=size-])]:size-3.5', {
  defaultVariants: {
    align: 'inline-start',
  },
  variants: {
    align: {
      'block-end': 'order-last w-full justify-start pb-3',
      'block-start': 'order-first w-full justify-start pt-3',
      'inline-end': 'order-last',
      'inline-start': 'order-first',
    },
  },
})

type InputGroupAddonProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof inputGroupAddonVariants>

export const InputGroupAddon = ({ align = 'inline-start', className, ...props }: InputGroupAddonProps) => {
  return <div className={cn(inputGroupAddonVariants({ align }), className)} data-align={align} data-slot="input-group-addon" role="group" {...props} />
}

const inputGroupButtonVariants = cva('flex items-center gap-2 shadow-none', {
  defaultVariants: {
    size: 'xs',
  },
  variants: {
    size: {
      'icon-sm': 'size-9 p-0',
      'icon-xs': 'size-6 p-0 text-xs',
      sm: '',
      xs: 'h-7 gap-1 px-3 text-xs',
    },
  },
})

type InputGroupButtonProps = Omit<ComponentProps<typeof Button>, 'size'> & VariantProps<typeof inputGroupButtonVariants>

export const InputGroupButton = ({ className, size = 'xs', type = 'button', variant = 'ghost', ...props }: InputGroupButtonProps) => {
  const buttonSize = size === 'icon-xs' ? 'icon' : size

  return <Button className={cn(inputGroupButtonVariants({ className, size }))} size={buttonSize} type={type} variant={variant} {...props} />
}

export const InputGroupText = ({ className, ...props }: HTMLAttributes<HTMLSpanElement>) => {
  return <span className={cn('flex items-center gap-2 text-sm text-muted-foreground [&_svg:not([class*=size-])]:size-3.5', className)} {...props} />
}

export const InputGroupInput = ({ className, ...props }: ComponentProps<'input'>) => {
  return <Input className={cn('flex-1 border-0 bg-transparent px-0 ring-0 focus-visible:ring-0', className)} data-slot="input-group-control" {...props} />
}

export const InputGroupTextarea = ({ className, ...props }: ComponentProps<'textarea'>) => {
  return <Textarea className={cn('flex-1 border-0 bg-transparent py-2 ring-0 focus-visible:ring-0', className)} data-slot="input-group-control" {...props} />
}
