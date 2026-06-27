import { cn } from "@/core/lib/utils";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";

/**
 * Canonical status badge — the single source of truth for rendering a job /
 * health status. Colors come exclusively from design tokens.
 *
 * If you need to show a status, use this instead of hand-rolling color maps.
 */

export type StatusVariant =
  | "active"
  | "created"
  | "pending"
  | "retry"
  | "failed"
  | "error"
  | "completed"
  | "success"
  | "cancelled"
  | "warning"
  | "info"
  | "expired";

interface StatusConfig {
  /** small colored dot */
  dot: string;
  /** label text color */
  text: string;
  /** pill background */
  bg: string;
  label: string;
  icon?: LucideIcon;
}

const STATUS_CONFIG: Record<StatusVariant, StatusConfig> = {
  active: {
    dot: "bg-info",
    text: "text-info",
    bg: "bg-info/10",
    label: "Active",
    icon: Activity,
  },
  created: {
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
    bg: "bg-muted/40",
    label: "Created",
    icon: Clock,
  },
  pending: {
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
    bg: "bg-muted/40",
    label: "Pending",
    icon: Clock,
  },
  retry: {
    dot: "bg-warning",
    text: "text-warning",
    bg: "bg-warning/10",
    label: "Retry",
    icon: RefreshCw,
  },
  failed: {
    dot: "bg-destructive",
    text: "text-destructive",
    bg: "bg-destructive/10",
    label: "Failed",
    icon: XCircle,
  },
  error: {
    dot: "bg-destructive",
    text: "text-destructive",
    bg: "bg-destructive/10",
    label: "Error",
    icon: AlertCircle,
  },
  completed: {
    dot: "bg-success",
    text: "text-success",
    bg: "bg-success/10",
    label: "Completed",
    icon: CheckCircle,
  },
  success: {
    dot: "bg-success",
    text: "text-success",
    bg: "bg-success/10",
    label: "Success",
    icon: CheckCircle,
  },
  cancelled: {
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
    bg: "bg-muted/40",
    label: "Cancelled",
    icon: X,
  },
  warning: {
    dot: "bg-warning",
    text: "text-warning",
    bg: "bg-warning/10",
    label: "Warning",
    icon: AlertCircle,
  },
  info: {
    dot: "bg-info",
    text: "text-info",
    bg: "bg-info/10",
    label: "Info",
    icon: AlertCircle,
  },
  expired: {
    dot: "bg-destructive",
    text: "text-destructive",
    bg: "bg-destructive/10",
    label: "Expired",
    icon: AlertCircle,
  },
};

interface StatusBadgeProps {
  status: StatusVariant | string;
  label?: string;
  showIcon?: boolean;
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  label,
  showIcon = false,
  showDot = true,
  className,
}: StatusBadgeProps) {
  const config =
    STATUS_CONFIG[(status as StatusVariant).toLowerCase() as StatusVariant] ??
    ({
      dot: "bg-muted-foreground",
      text: "text-muted-foreground",
      bg: "bg-muted/40",
      label: status.charAt(0).toUpperCase() + status.slice(1),
    } as StatusConfig);

  const displayLabel = label ?? config.label;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium",
        config.bg,
        className,
      )}
    >
      {showDot && <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />}
      {showIcon && Icon && <Icon className="h-3 w-3" />}
      <span className={config.text}>{displayLabel}</span>
    </span>
  );
}
