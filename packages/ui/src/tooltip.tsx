import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import { cn } from "./lib/utils";

/**
 * Minimal tooltip provider. Mount once near the app root; required for any
 * `Tooltip` below it to function.
 */
function TooltipProvider({
  delayDuration = 300,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />;
}

/**
 * Convenience wrapper: `Provider` + `Root` + `Trigger` + `Content` in one
 * component for the common single-anchor case. For multi-trigger or controlled
 * usage, compose the primitives directly.
 *
 * @example
 * <Tooltip content="Save">
 *   <Button>Save</Button>
 * </Tooltip>
 */
function Tooltip({
  children,
  content,
  side = "right",
  className,
  ...props
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
} & Omit<React.ComponentProps<typeof TooltipPrimitive.Root>, "children"> &
  Omit<React.ComponentProps<typeof TooltipPrimitive.Content>, "content" | "side">) {
  return (
    <TooltipPrimitive.Root {...props}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className={cn(
            "z-50 overflow-hidden rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md",
            "animate-in fade-in-0 zoom-in-95 data-[side=right]:slide-in-from-left-1",
            className,
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export { Tooltip, TooltipProvider };
