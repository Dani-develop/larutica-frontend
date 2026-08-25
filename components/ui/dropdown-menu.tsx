"use client"

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"

const DropdownMenu = DropdownMenuPrimitive.Root

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const DropdownMenuGroup = DropdownMenuPrimitive.Group

const DropdownMenuPortal = DropdownMenuPrimitive.Portal

const DropdownMenuSub = DropdownMenuPrimitive.Sub

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

type SubTriggerProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.SubTrigger
> & {
  inset?: boolean
  ref?: React.Ref<React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>>
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ref,
  ...props
}: SubTriggerProps) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      ref={ref}
      className={cn(
        "flex min-h-9 cursor-default select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none transition-colors focus:bg-primary/10 focus:text-foreground data-[state=open]:bg-primary/10 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        inset && "pl-8",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  )
}

type SubContentProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.SubContent
> & {
  ref?: React.Ref<React.ElementRef<typeof DropdownMenuPrimitive.SubContent>>
}

function DropdownMenuSubContent({
  className,
  ref,
  ...props
}: SubContentProps) {
  return (
    <DropdownMenuPrimitive.SubContent
      ref={ref}
      className={cn(
        "z-50 min-w-48 max-w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-xl shadow-black/10 ring-1 ring-border/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1.5 data-[side=left]:slide-in-from-right-1.5 data-[side=right]:slide-in-from-left-1.5 data-[side=top]:slide-in-from-bottom-1.5",
        className
      )}
      {...props}
    />
  )
}

type ContentProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Content
> & {
  header?: React.ReactNode
  showHeader?: boolean
  ref?: React.Ref<React.ElementRef<typeof DropdownMenuPrimitive.Content>>
}

function DropdownMenuContent({
  className,
  sideOffset = 8,
  collisionPadding = 12,
  header = "Acciones",
  showHeader = true,
  children,
  ref,
  ...props
}: ContentProps) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          "z-50 min-w-48 max-w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-xl shadow-black/10 ring-1 ring-border/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1.5 data-[side=left]:slide-in-from-right-1.5 data-[side=right]:slide-in-from-left-1.5 data-[side=top]:slide-in-from-bottom-1.5",
          className
        )}
        {...props}
      >
        {showHeader && (
          <>
            <DropdownMenuPrimitive.Label className="px-2.5 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {header}
            </DropdownMenuPrimitive.Label>
            <DropdownMenuPrimitive.Separator className="-mx-1.5 mb-1 h-px bg-border/80" />
          </>
        )}
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  )
}

type ItemProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Item
> & {
  inset?: boolean
  ref?: React.Ref<React.ElementRef<typeof DropdownMenuPrimitive.Item>>
}

function DropdownMenuItem({ className, inset, ref, ...props }: ItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex min-h-9 cursor-default select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none transition-colors focus:bg-primary/10 focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_button]:h-auto [&_button]:min-h-0 [&_button]:w-full [&_button]:justify-start [&_button]:gap-2 [&_button]:bg-transparent [&_button]:p-0 [&_button]:text-sm [&_button]:font-normal [&_button]:text-inherit [&_button]:shadow-none [&_button:hover]:bg-transparent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
        inset && "pl-8",
        className
      )}
      {...props}
    />
  )
}

type CheckboxItemProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.CheckboxItem
> & {
  ref?: React.Ref<React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>>
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ref,
  ...props
}: CheckboxItemProps) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      ref={ref}
      className={cn(
        "relative flex min-h-9 cursor-default select-none items-center gap-2 rounded-md py-2 pl-8 pr-2.5 text-sm outline-none transition-colors focus:bg-primary/10 focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

type RadioItemProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.RadioItem
> & {
  ref?: React.Ref<React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>>
}

function DropdownMenuRadioItem({
  className,
  children,
  ref,
  ...props
}: RadioItemProps) {
  return (
    <DropdownMenuPrimitive.RadioItem
      ref={ref}
      className={cn(
        "relative flex min-h-9 cursor-default select-none items-center gap-2 rounded-md py-2 pl-8 pr-2.5 text-sm outline-none transition-colors focus:bg-primary/10 focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Circle className="size-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

type LabelProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Label
> & {
  inset?: boolean
  ref?: React.Ref<React.ElementRef<typeof DropdownMenuPrimitive.Label>>
}

function DropdownMenuLabel({ className, inset, ref, ...props }: LabelProps) {
  return (
    <DropdownMenuPrimitive.Label
      ref={ref}
      className={cn(
        "px-2.5 py-1.5 text-xs font-semibold text-muted-foreground",
        inset && "pl-8",
        className
      )}
      {...props}
    />
  )
}

type SeparatorProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Separator
> & {
  ref?: React.Ref<React.ElementRef<typeof DropdownMenuPrimitive.Separator>>
}

function DropdownMenuSeparator({ className, ref, ...props }: SeparatorProps) {
  return (
    <DropdownMenuPrimitive.Separator
      ref={ref}
      className={cn("-mx-1.5 my-1 h-px bg-border/80", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}
