import { Select as SelectPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, LoaderCircle } from 'lucide-react'

import { cn } from '@/lib/utils'

export const Select = (props: ComponentProps<typeof SelectPrimitive.Root>) => {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

export const SelectValue = (props: ComponentProps<typeof SelectPrimitive.Value>) => {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

type SelectTriggerProps = ComponentProps<typeof SelectPrimitive.Trigger> & {
  loading?: boolean
  size?: 'default' | 'sm'
}

export const SelectTrigger = ({ children, className, disabled, loading = false, size = 'default', ...props }: SelectTriggerProps) => {
  return (
    <SelectPrimitive.Trigger
      aria-busy={loading || undefined}
      className={cn(
        'flex w-full items-center justify-between gap-1.5 border border-transparent border-b-input bg-transparent px-0 py-2 text-sm whitespace-nowrap outline-none focus-visible:border-b-ring disabled:cursor-not-allowed disabled:opacity-50 data-placeholder:text-muted-foreground',
        size === 'default' ? 'h-10' : 'h-9',
        className,
      )}
      data-size={size}
      data-slot="select-trigger"
      disabled={disabled || loading}
      {...props}
    >
      {children}
      {loading && <LoaderCircle aria-hidden className="size-3.5 animate-spin text-muted-foreground" />}
      {!loading && (
        <SelectPrimitive.Icon asChild>
          <ChevronDownIcon className="size-3.5 text-muted-foreground" />
        </SelectPrimitive.Icon>
      )}
    </SelectPrimitive.Trigger>
  )
}

type SelectContentProps = ComponentProps<typeof SelectPrimitive.Content>

export const SelectContent = ({ align = 'center', children, className, position = 'item-aligned', ...props }: SelectContentProps) => {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        align={align}
        className={cn(
          'relative z-50 max-h-80 min-w-36 overflow-hidden border border-border bg-popover text-popover-foreground shadow-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
          className,
        )}
        data-slot="select-content"
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport className={cn(position === 'popper' && 'min-w-(--radix-select-trigger-width)')}>
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

type SelectLabelProps = ComponentProps<typeof SelectPrimitive.Label>

export const SelectLabel = ({ className, ...props }: SelectLabelProps) => {
  return <SelectPrimitive.Label className={cn('px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground', className)} data-slot="select-label" {...props} />
}

type SelectItemProps = ComponentProps<typeof SelectPrimitive.Item>

export const SelectItem = ({ children, className, ...props }: SelectItemProps) => {
  return (
    <SelectPrimitive.Item
      className={cn('relative flex w-full cursor-default items-center gap-2.5 py-2 pl-3 pr-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50', className)}
      data-slot="select-item"
      {...props}
    >
      <span className="absolute right-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

type SelectSeparatorProps = ComponentProps<typeof SelectPrimitive.Separator>

export const SelectSeparator = ({ className, ...props }: SelectSeparatorProps) => {
  return <SelectPrimitive.Separator className={cn('-mx-1.5 my-1.5 h-px bg-border/50', className)} data-slot="select-separator" {...props} />
}

type ScrollProps = ComponentProps<typeof SelectPrimitive.ScrollUpButton>

export const SelectScrollUpButton = ({ className, ...props }: ScrollProps) => {
  return (
    <SelectPrimitive.ScrollUpButton className={cn('flex items-center justify-center bg-popover py-1', className)} data-slot="select-scroll-up-button" {...props}>
      <ChevronUpIcon className="size-3.5" />
    </SelectPrimitive.ScrollUpButton>
  )
}

type ScrollDownProps = ComponentProps<typeof SelectPrimitive.ScrollDownButton>

export const SelectScrollDownButton = ({ className, ...props }: ScrollDownProps) => {
  return (
    <SelectPrimitive.ScrollDownButton className={cn('flex items-center justify-center bg-popover py-1', className)} data-slot="select-scroll-down-button" {...props}>
      <ChevronDownIcon className="size-3.5" />
    </SelectPrimitive.ScrollDownButton>
  )
}
