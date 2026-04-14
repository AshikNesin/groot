import { cn } from "@/core/lib/utils";
import type { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "full" | "7xl" | "6xl" | "5xl" | "4xl";
}

/**
 * Page container with max-width and padding
 *
 * @example
 * ```tsx
 * <PageContainer maxWidth="7xl">
 *   <h1>My Page</h1>
 * </PageContainer>
 * ```
 */
export function PageContainer({ children, className, maxWidth = "7xl" }: PageContainerProps) {
  const maxWidthClasses = {
    full: "max-w-full",
    "7xl": "max-w-7xl",
    "6xl": "max-w-6xl",
    "5xl": "max-w-5xl",
    "4xl": "max-w-4xl",
  };

  return (
    <div className={cn(maxWidthClasses[maxWidth], "mx-auto px-4 sm:px-6 lg:px-8 py-8", className)}>
      {children}
    </div>
  );
}
