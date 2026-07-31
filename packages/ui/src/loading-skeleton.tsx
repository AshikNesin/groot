import { Card, CardContent, CardHeader } from "./card";
import { cn } from "./lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Skeleton loader component — the atom every placeholder is built from.
 * Reach for the composites below ({@link SkeletonCard}, {@link SkeletonList},
 * {@link SkeletonTable}) before composing one-off layouts with this.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

/** Varied bar widths so repeated rows/cells read as distinct records, not a stripe. */
const BAR_WIDTHS = ["w-48", "w-40", "w-56", "w-32", "w-44", "w-36", "w-52"];

/**
 * A Card whose header and body are placeholder bars. Pass `children` to
 * replace the body lines when the card's content shape is known (form rows, a
 * tall editor block, a field grid, …).
 */
export function SkeletonCard({
  titleWidth = "w-24",
  description = false,
  lines = 3,
  className,
  children,
}: {
  titleWidth?: string;
  /** Also render a second, smaller bar under the title. */
  description?: boolean;
  lines?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className={cn("h-4", titleWidth)} />
        {description && <Skeleton className="h-3 w-3/5" />}
      </CardHeader>
      <CardContent>
        {children ?? (
          <div className="space-y-3">
            {Array.from({ length: lines }, (_, i) => (
              <Skeleton
                key={`skeleton-card-line-${i}`}
                className={cn("h-4", BAR_WIDTHS[i % BAR_WIDTHS.length])}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Repeated list-row placeholders (optional leading block, text bar, secondary
 * bar, trailing pill). Render inside the list's real surface (Card, bordered
 * div) so the layout holds while data loads.
 */
export function SkeletonList({
  rows = 5,
  leading = "square",
  secondaryLine = false,
  trailing = true,
  className,
}: {
  rows?: number;
  /** "square" ≈ checkbox/icon, "circle" ≈ avatar, "none" for plain text rows. */
  leading?: "square" | "circle" | "none";
  secondaryLine?: boolean;
  /** A pill-shaped block at the row's end (badge/action stand-in). */
  trailing?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("divide-y divide-border/40", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={`skeleton-list-row-${i}`} className="flex items-center gap-3 px-4 py-3">
          {leading === "square" && <Skeleton className="size-4 shrink-0 rounded-sm" />}
          {leading === "circle" && <Skeleton className="size-9 shrink-0 rounded-full" />}
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className={cn("h-4", BAR_WIDTHS[i % BAR_WIDTHS.length])} />
            {secondaryLine && (
              <Skeleton className={cn("h-3", BAR_WIDTHS[(i + 3) % BAR_WIDTHS.length])} />
            )}
          </div>
          {trailing && <Skeleton className="h-5 w-16 shrink-0 rounded-4xl" />}
        </div>
      ))}
    </div>
  );
}

/**
 * Header band + divided body rows with one bar per column. Column proportions
 * are approximate on purpose: a placeholder only needs to hold the layout,
 * not mirror exact grid spans. Wrap it in the table's real surface (Card or
 * bordered div).
 */
export function SkeletonTable({
  columns = 4,
  rows = 5,
  header = true,
  className,
}: {
  columns?: number;
  rows?: number;
  /** Render the header band (default true). */
  header?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      {header && (
        <div className="flex items-center gap-4 border-b border-border/60 px-4 py-2.5">
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={`skeleton-table-head-${c}`} className="h-3 w-16" />
          ))}
        </div>
      )}
      <div className="divide-y divide-border/40">
        {Array.from({ length: rows }, (_, r) => (
          <div key={`skeleton-table-row-${r}`} className="flex items-center gap-4 px-4 py-3">
            {Array.from({ length: columns }, (_, c) => (
              <div
                key={`skeleton-table-cell-${r}-${c}`}
                className={cn("min-w-0", c === 0 ? "flex-[2]" : "flex-1")}
              >
                <Skeleton className={cn("h-4", BAR_WIDTHS[(r + c) % BAR_WIDTHS.length])} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
