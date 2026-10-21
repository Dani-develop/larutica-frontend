"use client"

import * as React from "react"
import { Label as LabelPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function RequiredMark({ className }: { className?: string }) {
  return (
    <span
      className={cn("text-destructive font-medium", className)}
      aria-hidden="true"
    >
      *
    </span>
  )
}

type LabelProps = React.ComponentProps<typeof LabelPrimitive.Root> & {
  required?: boolean
}

function Label({ className, children, required, ...props }: LabelProps) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-1 text-sm leading-normal font-semibold select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      {required ? <RequiredMark /> : null}
    </LabelPrimitive.Root>
  )
}

export { Label, RequiredMark }
