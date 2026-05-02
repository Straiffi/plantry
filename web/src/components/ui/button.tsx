import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap border border-transparent text-xs font-semibold uppercase tracking-widest transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-3.5',
  {
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      size: {
        default: 'h-10 gap-1.5 px-6',
        icon: 'size-10',
        'icon-sm': 'size-9',
        lg: 'h-11 gap-1.5 px-8',
        sm: 'h-9 gap-1 px-4',
        xs: 'h-7 gap-1 px-3 [&_svg:not([class*=size-])]:size-3',
      },
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/80',
        destructive: 'bg-destructive/10 text-destructive hover:bg-destructive/20',
        ghost: 'hover:bg-muted hover:text-foreground',
        link: 'text-primary underline underline-offset-4 hover:underline',
        outline: 'border-border bg-transparent hover:bg-muted hover:text-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      },
    },
  },
)

type Props = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

export const Button = ({
  asChild = false,
  className,
  size = 'default',
  variant = 'default',
  ...props
}: Props) => {
  const Comp = asChild ? Slot : 'button'

  return <Comp className={cn(buttonVariants({ className, size, variant }))} data-size={size} data-variant={variant} {...props} />
}
