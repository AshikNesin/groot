import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Rendered above the title (e.g. a `Breadcrumb`). */
  breadcrumb?: ReactNode;
  /** Rendered inline after the title (e.g. a `StatusBadge`). */
  titleAdornment?: ReactNode;
  className?: string;
}

/**
 * Page header with title, optional description, and actions.
 *
 * The single source of truth for page-title typography — pages must not
 * hand-roll an `<h1>`. Detail pages that need a breadcrumb trail or a status
 * pill beside the title use the `breadcrumb` / `titleAdornment` slots.
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Dashboard"
 *   description="Overview of your account"
 *   actions={<Button>New Item</Button>}
 * />
 * ```
 */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  titleAdornment,
  className,
}: PageHeaderProps) {
  return (
    <div className={className}>
      {breadcrumb && <div className="mb-4">{breadcrumb}</div>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h1>
            {titleAdornment}
          </div>
          {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
        </div>
        {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
