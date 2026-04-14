import { cn } from "@/core/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Skeleton loader component
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={cn("animate-pulse rounded-md bg-gray-200", className)} {...props} />;
}

/**
 * Skeleton variants for common use cases
 */
export const SkeletonVariants = {
  /**
   * Table row skeleton
   */
  TableRow: () => (
    <div className="flex items-center space-x-4 py-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  ),

  /**
   * Card skeleton
   */
  Card: () => (
    <div className="border border-gray-200 rounded-lg p-6">
      <div className="space-y-3">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  ),

  /**
   * List item skeleton
   */
  ListItem: () => (
    <div className="flex items-center space-x-4">
      <Skeleton className="h-10 w-10 rounded" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  ),

  /**
   * Text skeleton
   */
  Text: () => (
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
    </div>
  ),
};

/**
 * Multiple skeleton loaders
 */
export function SkeletonList({
  count = 3,
  variant = "ListItem",
}: {
  count?: number;
  variant?: keyof typeof SkeletonVariants;
}) {
  const SkeletonComponent = SkeletonVariants[variant];

  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Skeletons are static placeholders with no state
        <SkeletonComponent key={`skeleton-${variant}-${i}`} />
      ))}
    </div>
  );
}
