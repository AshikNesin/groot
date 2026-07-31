import type { ReactNode } from "react";
import { PageContainer } from "./PageContainer";
import { PageHeader } from "./PageHeader";

interface PageLayoutProps {
  children: ReactNode;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Rendered above the title (e.g. a `Breadcrumb`). */
  breadcrumb?: ReactNode;
  /** Rendered inline after the title (e.g. a `StatusBadge`). */
  titleAdornment?: ReactNode;
  className?: string;
  maxWidth?: "full" | "7xl" | "6xl" | "5xl" | "4xl";
}

/**
 * Complete page layout with container, header, and content area.
 *
 * Every routed page should render through this (or `PageContainer` +
 * `PageHeader`) so titles, max-widths, and header-to-content spacing stay
 * identical across the app.
 *
 * @example
 * ```tsx
 * <PageLayout
 *   title="Dashboard"
 *   description="Overview of your finances"
 *   actions={<Button>Action</Button>}
 * >
 *   <Card>Content here</Card>
 * </PageLayout>
 * ```
 */
export function PageLayout({
  children,
  title,
  description,
  actions,
  breadcrumb,
  titleAdornment,
  className,
  maxWidth = "5xl",
}: PageLayoutProps) {
  return (
    <PageContainer maxWidth={maxWidth} className={className}>
      <PageHeader
        title={title}
        description={description}
        actions={actions}
        breadcrumb={breadcrumb}
        titleAdornment={titleAdornment}
      />
      <div className="mt-8 space-y-6">{children}</div>
    </PageContainer>
  );
}
