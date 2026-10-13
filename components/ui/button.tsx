import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

// Solid buttons lift into a window on hover (components/ui/window-card.tsx): a
// dark border and a hard offset shadow, pressed flat again on click. Ghost and
// link buttons stay quiet.
const lift =
  "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-foreground hover:shadow-[3px_3px_0_var(--foreground)] active:translate-x-0 active:translate-y-0 active:shadow-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding text-[13px] font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,translate] duration-150 ease-out-quad select-none active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: `bg-primary text-primary-foreground shadow-soft hover:bg-primary/85 ${lift}`,
        outline: `border-border bg-background hover:bg-bg-secondary aria-expanded:bg-bg-secondary ${lift}`,
        secondary: `border-border bg-secondary text-secondary-foreground hover:bg-bg-tertiary aria-expanded:bg-bg-tertiary ${lift}`,
        ghost:
          "hover:bg-bg-secondary aria-expanded:bg-bg-secondary",
        destructive: `bg-destructive text-white hover:bg-destructive/90 ${lift}`,
        link: "text-text-secondary underline-offset-4 hover:underline",
        pro: `border-pro-border bg-pro text-pro-foreground shadow-raised hover:bg-pro-hover ${lift}`,
        // At most one per screen (design.md 2.7).
        brand: `bg-brand text-brand-foreground shadow-soft hover:brightness-[.92] ${lift}`,
      },
      size: {
        default:
          "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
