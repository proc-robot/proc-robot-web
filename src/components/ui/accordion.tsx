"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { Accordion as AccordionPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Accordion({
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b last:border-b-0", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      // Radix renders `isOpen && children`, so a collapsed panel shipped no
      // content at all: FAQ answers reached the browser only inside the RSC
      // payload, i.e. as script data rather than page text. Crawlers that
      // don't run JavaScript — AI assistants included — never saw them, and
      // FAQPage markup may only describe what the page actually contains.
      // `forceMount` puts the answers in the server HTML.
      forceMount
      // With forceMount, Radix stops managing `hidden`, so the collapsed state
      // is ours. `hidden` (display:none) reproduces exactly the semantics
      // Radix's own attribute had — including keeping collapsed answers out of
      // the accessibility tree — and is the pattern Google documents for
      // accordion FAQs. A height-based hide would leave every answer exposed
      // to screen readers.
      //
      // It can't be left to the animation: accordion-up ends at height 0 but
      // its fill-mode is `none`, so the content would spring back open the
      // instant the 200ms animation finished.
      className="overflow-hidden text-sm data-[state=closed]:hidden data-[state=open]:animate-accordion-down"
      {...props}
    >
      <div className={cn("pt-0 pb-4", className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
