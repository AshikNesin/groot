import { formatLocaleDateTime } from "@groot/client/lib/utils";
import type { JobLog } from "../types";
import { Console } from "console-feed";

/** Streaming log panel rendered with console-feed. */
export function JobLogs({ logs }: { logs: JobLog[] }) {
  return (
    <div>
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
        Logs
      </h2>
      <div className="bg-muted/50 border border-dashed overflow-hidden max-h-[400px] overflow-y-auto">
        {logs.length === 0 ? (
          <div className="p-4 text-muted-foreground italic text-xs">No logs available</div>
        ) : (
          <Console
            logs={logs.map((log) => ({
              id: log.id.toString(),
              method: (log.level === "warning" ? "warn" : log.level) as
                | "log"
                | "warn"
                | "error"
                | "info"
                | "debug",
              data: [
                `[${formatLocaleDateTime(log.timestamp)}]`,
                log.message,
                ...(log.data && Object.keys(log.data as object).length > 0 ? [log.data] : []),
              ],
            }))}
            variant="light"
          />
        )}
      </div>
    </div>
  );
}
