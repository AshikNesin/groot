/**
 * UI component barrel — single import surface for all primitives.
 *
 *   import { Button, Dialog, Input } from "@/ui";
 *
 * Design tokens live in client/src/index.css (Tailwind v4 CSS-first: oklch
 * `@theme inline` variables) and are surfaced via semantic Tailwind classes
 * (bg-primary, text-foreground, border-border, …). Do not use raw palette
 * colors (gray-*, red-*, …) outside index.css.
 */

export * from "./alert";
export * from "./badge";
export * from "./breadcrumb";
export * from "./button";
export * from "./card";
export * from "./checkbox";
export * from "./command";
export * from "./dialog";
export * from "./dropdown-menu";
export * from "./input";
export * from "./input-group";
export * from "./label";
export { Skeleton, SkeletonList } from "./loading-skeleton";
export { LoadingSpinner, LoadingState } from "./loading-spinner";
export * from "./pagination";
export * from "./select";
export { StatusBadge } from "./status-badge";
export type { StatusVariant } from "./status-badge";
export * from "./table";
export * from "./tabs";
export * from "./textarea";
export { Toaster } from "./sonner";
