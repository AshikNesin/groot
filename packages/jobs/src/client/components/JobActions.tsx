import { Button } from "@groot/ui/button";
import type { Job } from "@groot/jobs/client/types";
import { Play, RefreshCw, Trash2, X } from "lucide-react";

type Actions = {
  onRetry: () => void;
  onRerun: () => void;
  onResume: () => void;
  onCancel: () => void;
  onDelete: () => void;
};

/** State-dependent action buttons for a job (retry / re-run / resume / cancel / delete). */
export function JobActions({ state, ...actions }: { state: Job["state"] } & Actions) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      {state === "failed" && (
        <Button variant="outline" onClick={actions.onRetry} size="sm">
          <RefreshCw className="size-4" />
          Retry
        </Button>
      )}
      {(state === "completed" || state === "failed") && (
        <Button variant="outline" onClick={actions.onRerun} size="sm">
          <Play className="size-4" />
          Re-run
        </Button>
      )}
      {state === "cancelled" && (
        <Button variant="outline" onClick={actions.onResume} size="sm">
          <Play className="size-4" />
          Resume
        </Button>
      )}
      {(state === "active" || state === "created" || state === "retry") && (
        <Button variant="outline" onClick={actions.onCancel} size="sm">
          <X className="size-4" />
          Cancel
        </Button>
      )}
      <Button
        variant="ghost"
        onClick={actions.onDelete}
        size="sm"
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="size-4" />
        Delete
      </Button>
    </div>
  );
}
