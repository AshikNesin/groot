import { cn } from "./lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Loading spinner component
 */
const SIZE_CLASSES = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-3",
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
 * Centered loading spinner with optional text
 */
export function LoadingState({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
