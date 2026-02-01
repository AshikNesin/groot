import { cn } from "@/lib/utils";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  X,
  XCircle,
} from "lucide-react";
import { Badge } from "./badge";
import type { BadgeProps } from "./badge";

export type StatusVariant =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "pending"
  | "active"
  | "completed"
  | "failed"
  | "cancelled"
  | "retry"
  | "created";

interface StatusBadgeProps {
  status: StatusVariant | string;
  label?: string;
  showIcon?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  label,
  showIcon = true,
  className,
}: StatusBadgeProps) {
  const statusLower = status.toLowerCase();

  const getStatusConfig = (
    status: string,
  ): {
    variant: BadgeProps["variant"];
    icon: React.ReactNode;
    defaultLabel: string;
  } => {
    switch (status) {
      case "active":
        return {
          variant: "default",
          icon: <Activity className="w-3 h-3" />,
          defaultLabel: "Active",
        };
      case "created":
      case "pending":
        return {
          variant: "secondary",
          icon: <Clock className="w-3 h-3" />,
          defaultLabel: status === "created" ? "Created" : "Pending",
        };
      case "retry":
        return {
          variant: "outline",
          icon: <RefreshCw className="w-3 h-3" />,
          defaultLabel: "Retry",
        };
      case "failed":
      case "error":
        return {
          variant: "destructive",
          icon: <XCircle className="w-3 h-3" />,
          defaultLabel: status === "failed" ? "Failed" : "Error",
        };
      case "completed":
      case "success":
        return {
          variant: "outline",
          icon: <CheckCircle className="w-3 h-3 text-green-600" />,
          defaultLabel: status === "completed" ? "Completed" : "Success",
        };
      case "cancelled":
        return {
          variant: "secondary",
          icon: <X className="w-3 h-3" />,
          defaultLabel: "Cancelled",
        };
      case "warning":
        return {
          variant: "outline",
          icon: <AlertCircle className="w-3 h-3 text-yellow-600" />,
          defaultLabel: "Warning",
        };
      case "info":
        return {
          variant: "outline",
          icon: <AlertCircle className="w-3 h-3 text-blue-600" />,
          defaultLabel: "Info",
        };
      default:
        return {
          variant: "outline",
          icon: null,
          defaultLabel: status.charAt(0).toUpperCase() + status.slice(1),
        };
    }
  };

  const config = getStatusConfig(statusLower);
  const displayLabel = label || config.defaultLabel;

  return (
    <Badge
      variant={config.variant}
      className={cn("flex items-center gap-1 w-fit", className)}
    >
      {showIcon && config.icon}
      {displayLabel}
    </Badge>
  );
}
