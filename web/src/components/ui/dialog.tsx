import { Dialog as DialogPrimitive } from 'radix-ui'
import type { ComponentProps, HTMLAttributes } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const Dialog = (props: ComponentProps<typeof DialogPrimitive.Root>) => {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

export const DialogTrigger = (props: ComponentProps<typeof DialogPrimitive.Trigger>) => {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

export const DialogClose = (props: ComponentProps<typeof DialogPrimitive.Close>) => {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

export const DialogPortal = (props: ComponentProps<typeof DialogPrimitive.Portal>) => {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

type DialogOverlayProps = ComponentProps<typeof DialogPrimitive.Overlay>

export const DialogOverlay = ({ className, ...props }: DialogOverlayProps) => {
  return (
    <DialogPrimitive.Overlay
      className={cn('fixed inset-0 z-50 bg-black/20 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0', className)}
      data-slot="dialog-overlay"
      {...props}
    />
  )
}

type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}

export const DialogContent = ({ children, className, showCloseButton = false, ...props }: DialogContentProps) => {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-6 border border-border bg-popover p-6 text-sm text-popover-foreground shadow-md outline-none sm:max-w-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
          className,
        )}
        data-slot="dialog-content"
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close asChild>
            <Button className="absolute right-4 top-4" size="icon-sm" variant="ghost">
              <span aria-hidden="true">x</span>
              <span className="sr-only">Close</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

type DivProps = HTMLAttributes<HTMLDivElement>

export const DialogHeader = ({ className, ...props }: DivProps) => {
  return <div className={cn('flex flex-col gap-2', className)} data-slot="dialog-header" {...props} />
}

export const DialogFooter = ({ className, ...props }: DivProps) => {
  return <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} data-slot="dialog-footer" {...props} />
}

type DialogTitleProps = ComponentProps<typeof DialogPrimitive.Title>

export const DialogTitle = ({ className, ...props }: DialogTitleProps) => {
  return <DialogPrimitive.Title className={cn('font-heading text-lg font-semibold uppercase tracking-wider', className)} data-slot="dialog-title" {...props} />
}

type DialogDescriptionProps = ComponentProps<typeof DialogPrimitive.Description>

export const DialogDescription = ({ className, ...props }: DialogDescriptionProps) => {
  return <DialogPrimitive.Description className={cn('text-sm leading-relaxed text-muted-foreground', className)} data-slot="dialog-description" {...props} />
}
