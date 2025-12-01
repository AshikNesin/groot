import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";

interface PageLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  maxWidth?: "full" | "7xl" | "6xl" | "5xl" | "4xl";
}

/**
 * Complete page layout with container, header, and content area
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
  className,
  maxWidth = "7xl",
}: PageLayoutProps) {
  return (
    <PageContainer maxWidth={maxWidth} className={className}>
      <PageHeader title={title} description={description} actions={actions} />
      <div className="space-y-6">{children}</div>
    </PageContainer>
  );
}
