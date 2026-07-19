import { Card } from "@groot/ui/card";
import { cn } from "@groot/ui/lib/utils";
import type { JobStats } from "@groot/jobs/client/types";
import { Activity, CheckCircle, Clock, RefreshCw, X, XCircle } from "lucide-react";

type StatItem = {
  key: string;
  label: string;
  value: number;
  colorClass: string;
  icon: React.ReactNode;
};

type Props = {
  stats: JobStats;
  activeState: string;
  onSelectState: (state: string) => void;
};

/** Compact, clickable stat row that filters the jobs list by state. */
export function JobsStats({ stats, activeState, onSelectState }: Props) {
  const items: StatItem[] = [
    {
      key: "all",
      label: "Total",
      value: stats.active + stats.created + stats.retry + stats.failed + stats.completed,
      colorClass: "text-foreground",
      icon: <Activity className="size-3.5" />,
    },
    {
      key: "active",
      label: "Active",
      value: stats.active,
      colorClass: "text-info",
      icon: <Activity className="size-3.5" />,
    },
    {
      key: "created",
      label: "Created",
      value: stats.created,
      colorClass: "text-muted-foreground",
      icon: <Clock className="size-3.5" />,
    },
    {
      key: "retry",
      label: "Retry",
      value: stats.retry,
      colorClass: "text-warning",
      icon: <RefreshCw className="size-3.5" />,
    },
    {
      key: "failed",
      label: "Failed",
      value: stats.failed,
      colorClass: "text-destructive",
      icon: <XCircle className="size-3.5" />,
    },
    {
      key: "completed",
      label: "Completed",
      value: stats.completed,
      colorClass: "text-success",
      icon: <CheckCircle className="size-3.5" />,
    },
    {
      key: "cancelled",
      label: "Cancelled",
      value: stats.cancelled,
      colorClass: "text-muted-foreground",
      icon: <X className="size-3.5" />,
    },
  ];

  return (
    <Card size="sm" className="flex flex-row flex-wrap items-stretch gap-0 p-0">
      {items.map((item, idx) => {
        const isActive = activeState === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelectState(item.key)}
            className={cn(
              "flex min-w-[7rem] flex-1 flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/50",
              "focus-visible:bg-muted/50 focus-visible:outline-none",
              isActive && "bg-muted/60",
              idx !== 0 && "border-l border-border/60",
            )}
          >
            <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {item.icon}
              {item.label}
            </span>
            <span className={cn("text-xl font-semibold tabular-nums", item.colorClass)}>
              {item.value.toLocaleString()}
            </span>
          </button>
        );
      })}
    </Card>
  );
}
