import type { JobStats } from "@groot/client/types/jobs";
import { Activity, CheckCircle, Clock, RefreshCw, X, XCircle } from "lucide-react";

function StatCard({
  label,
  value,
  colorClass,
  icon,
  isActive,
  onClick,
}: {
  label: string;
  value: number;
  colorClass: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left border border-dashed p-4 flex flex-col gap-1 transition-colors hover:bg-accent/50 ${
        isActive ? "bg-accent/50 border-solid" : "bg-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className={`text-2xl font-semibold tabular-nums ${colorClass}`}>
        {value.toLocaleString()}
      </span>
    </button>
  );
}

type Props = {
  stats: JobStats;
  activeState: string;
  onSelectState: (state: string) => void;
};

/** Clickable stat cards that filter the jobs list by state. */
export function JobsStats({ stats, activeState, onSelectState }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
      <StatCard
        label="Total"
        value={stats.active + stats.created + stats.retry + stats.failed + stats.completed}
        colorClass="text-foreground"
        icon={<Activity className="w-3.5 h-3.5" />}
        isActive={activeState === "all"}
        onClick={() => onSelectState("all")}
      />
      <StatCard
        label="Active"
        value={stats.active}
        colorClass="text-info"
        icon={<Activity className="w-3.5 h-3.5" />}
        isActive={activeState === "active"}
        onClick={() => onSelectState("active")}
      />
      <StatCard
        label="Created"
        value={stats.created}
        colorClass="text-muted-foreground"
        icon={<Clock className="w-3.5 h-3.5" />}
        isActive={activeState === "created"}
        onClick={() => onSelectState("created")}
      />
      <StatCard
        label="Retry"
        value={stats.retry}
        colorClass="text-warning"
        icon={<RefreshCw className="w-3.5 h-3.5" />}
        isActive={activeState === "retry"}
        onClick={() => onSelectState("retry")}
      />
      <StatCard
        label="Failed"
        value={stats.failed}
        colorClass="text-destructive"
        icon={<XCircle className="w-3.5 h-3.5" />}
        isActive={activeState === "failed"}
        onClick={() => onSelectState("failed")}
      />
      <StatCard
        label="Completed"
        value={stats.completed}
        colorClass="text-success"
        icon={<CheckCircle className="w-3.5 h-3.5" />}
        isActive={activeState === "completed"}
        onClick={() => onSelectState("completed")}
      />
      <StatCard
        label="Cancelled"
        value={stats.cancelled}
        colorClass="text-muted-foreground"
        icon={<X className="w-3.5 h-3.5" />}
        isActive={activeState === "cancelled"}
        onClick={() => onSelectState("cancelled")}
      />
    </div>
  );
}
