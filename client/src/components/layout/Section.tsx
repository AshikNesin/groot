import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SectionProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

/**
 * Content section with optional title and description
 *
 * @example
 * ```tsx
 * <Section title="Recent Activity" description="Your latest transactions">
 *   <TransactionList />
 * </Section>
 * ```
 */
export function Section({
  children,
  className,
  title,
  description,
}: SectionProps) {
  return (
    <div className={cn("mb-6", className)}>
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h2 className="text-lg font-medium text-gray-900">{title}</h2>
          )}
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
