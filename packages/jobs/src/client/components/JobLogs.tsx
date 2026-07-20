import { Card, CardContent, CardHeader, CardTitle } from "@groot/ui/card";
import { formatLocaleDateTime } from "@groot/shell/lib/utils";
import type { JobLog } from "@groot/jobs/client/types";
import { Console } from "console-feed";

/** Streaming log panel rendered with console-feed. */
export function JobLogs({ logs }: { logs: JobLog[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Logs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/30 max-h-[400px] overflow-y-auto">
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
      </CardContent>
    </Card>
  );
}
