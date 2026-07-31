import { cn } from "./lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Loading spinner component
 */
const SIZE_CLASSES = {
  sm: "size-4 border-2",
  md: "size-8 border-2",
  lg: "size-12 border-3",
} as const;

export function LoadingSpinner({ className, size = "md" }: LoadingSpinnerProps) {
  return (
    <output
      className={cn(
        "animate-spin rounded-full border-muted border-t-foreground",
        SIZE_CLASSES[size],
        className,
      )}
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </output>
  );
}

/**
 * Centered loading spinner with optional text — the canonical "this surface is
 * loading" block. Use `className` to give it a fixed height when it stands in
 * for content of a known size (e.g. `h-96` inside a card).
 */
export function LoadingState({
  text = "Loading...",
  size = "lg",
  className,
}: {
  text?: string;
  size?: LoadingSpinnerProps["size"];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12", className)}>
      <LoadingSpinner size={size} />
      <p className="mt-4 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
