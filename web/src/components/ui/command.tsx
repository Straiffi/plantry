import { Command as CommandPrimitive } from 'cmdk'
import type { ComponentProps } from 'react'
import { CheckIcon, SearchIcon } from 'lucide-react'

import { InputGroup, InputGroupAddon } from '@/components/ui/input-group'
import { cn } from '@/lib/utils'

type CommandProps = ComponentProps<typeof CommandPrimitive>

export const Command = ({ className, ...props }: CommandProps) => {
  return <CommandPrimitive className={cn('flex size-full flex-col overflow-hidden bg-popover text-popover-foreground', className)} data-slot="command" {...props} />
}

type CommandInputProps = ComponentProps<typeof CommandPrimitive.Input>

export const CommandInput = ({ className, ...props }: CommandInputProps) => {
  return (
    <div className="p-1" data-slot="command-input-wrapper">
      <InputGroup className="border-transparent border-b-input bg-transparent px-3">
        <CommandPrimitive.Input className={cn('w-full px-2 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50', className)} data-slot="command-input" {...props} />
        <InputGroupAddon>
          <SearchIcon className="size-3.5 shrink-0 opacity-50" />
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

type CommandListProps = ComponentProps<typeof CommandPrimitive.List>

export const CommandList = ({ className, ...props }: CommandListProps) => {
  return <CommandPrimitive.List className={cn('max-h-72 overflow-x-hidden overflow-y-auto outline-none', className)} data-slot="command-list" {...props} />
}

type CommandEmptyProps = ComponentProps<typeof CommandPrimitive.Empty>

export const CommandEmpty = ({ className, ...props }: CommandEmptyProps) => {
  return <CommandPrimitive.Empty className={cn('py-6 text-center text-sm', className)} data-slot="command-empty" {...props} />
}

type CommandGroupProps = ComponentProps<typeof CommandPrimitive.Group>

export const CommandGroup = ({ className, ...props }: CommandGroupProps) => {
  return <CommandPrimitive.Group className={cn('overflow-hidden p-1.5 text-foreground', className)} data-slot="command-group" {...props} />
}

type CommandSeparatorProps = ComponentProps<typeof CommandPrimitive.Separator>

export const CommandSeparator = ({ className, ...props }: CommandSeparatorProps) => {
  return <CommandPrimitive.Separator className={cn('-mx-1.5 my-1.5 h-px bg-border/50', className)} data-slot="command-separator" {...props} />
}

type CommandItemProps = ComponentProps<typeof CommandPrimitive.Item>

export const CommandItem = ({ children, className, ...props }: CommandItemProps) => {
  return (
    <CommandPrimitive.Item
      className={cn(
        'group/command-item relative flex cursor-default items-center gap-2 px-3 py-2 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-muted data-[selected=true]:text-foreground',
        className,
      )}
      data-slot="command-item"
      {...props}
    >
      {children}
      <CheckIcon className="ml-auto opacity-0 group-data-[checked=true]/command-item:opacity-100" />
    </CommandPrimitive.Item>
  )
}
