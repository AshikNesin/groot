import type { LucideIcon } from "lucide-react";
import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "./lib/utils";

/**
 * Canonical empty / error state — the single source of truth for "there is
 * nothing here" and "we couldn't load this" surfaces.
 *
 * If you need to render an empty list, a failed fetch, or a "nothing selected"
 * placeholder, use this instead of hand-rolling an icon + heading + copy stack.
 * Every surface then shares one icon size, one circle treatment, and one
 * vertical rhythm.
 */
interface EmptyStateProps {
  /** Lucide icon rendered inside the circular badge. */
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  /** Optional action row (e.g. a retry or create button). */
  action?: ReactNode;
  /** Tints the icon badge for failure surfaces. */
  variant?: "default" | "destructive";
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "default",
  className,
}: EmptyStateProps) {
  const destructive = variant === "destructive";

  return (
    <div
      className={cn("flex flex-col items-center justify-center px-6 py-16 text-center", className)}
    >
      <div
        className={cn(
          "mb-3 flex size-12 items-center justify-center rounded-full",
          destructive ? "bg-destructive/10" : "bg-muted",
        )}
      >
        <Icon
          className={cn("size-6", destructive ? "text-destructive" : "text-muted-foreground")}
        />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-4 flex items-center gap-2">{action}</div>}
    </div>
  );
}

type ErrorStateProps = Omit<EmptyStateProps, "variant" | "icon"> & {
  icon?: LucideIcon;
};

/**
 * {@link EmptyState} preset for failed loads: destructive tint plus a default
 * warning icon. Pass `action` to surface a retry control.
 */
export function ErrorState({ icon = AlertCircle, title, ...props }: ErrorStateProps) {
  return <EmptyState icon={icon} title={title} variant="destructive" {...props} />;
}
