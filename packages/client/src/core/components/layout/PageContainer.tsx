import type { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "full" | "7xl" | "6xl" | "5xl" | "4xl";
}

/**
 * Page content max-width wrapper.
 *
 * The app shell (`Layout`) owns horizontal padding + background; this wrapper
 * owns only the max-width. Default is `5xl` (matches the prior rendered
 * reality). Use `7xl` for wide data pages (e.g. Jobs, Storage).
 */
const MAX_WIDTH_CLASSES = {
  full: "max-w-full",
  "7xl": "max-w-7xl",
  "6xl": "max-w-6xl",
  "5xl": "max-w-5xl",
  "4xl": "max-w-4xl",
} as const;

export function PageContainer({ children, className, maxWidth = "5xl" }: PageContainerProps) {
  return (
    <div className={`${MAX_WIDTH_CLASSES[maxWidth]} mx-auto ${className ?? ""}`}>{children}</div>
  );
}
