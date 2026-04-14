import { cn } from "@/core/lib/utils";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * Page header with title, optional description, and actions
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Dashboard"
 *   description="Overview of your account"
 *   actions={<Button>New Item</Button>}
 * />
 * ```
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-8", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-medium text-gray-900">{title}</h1>
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
        {actions && <div className="ml-4 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
