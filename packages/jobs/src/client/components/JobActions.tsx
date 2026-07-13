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
    <div className="flex items-center gap-1.5 shrink-0">
      {state === "failed" && (
        <Button variant="outline" onClick={actions.onRetry} size="sm" className="h-7 text-xs">
          <RefreshCw className="w-3 h-3 mr-1.5" />
          Retry
        </Button>
      )}
      {(state === "completed" || state === "failed") && (
        <Button variant="outline" onClick={actions.onRerun} size="sm" className="h-7 text-xs">
          <Play className="w-3 h-3 mr-1.5" />
          Re-run
        </Button>
      )}
      {state === "cancelled" && (
        <Button variant="outline" onClick={actions.onResume} size="sm" className="h-7 text-xs">
          <Play className="w-3 h-3 mr-1.5" />
          Resume
        </Button>
      )}
      {(state === "active" || state === "created" || state === "retry") && (
        <Button variant="outline" onClick={actions.onCancel} size="sm" className="h-7 text-xs">
          <X className="w-3 h-3 mr-1.5" />
          Cancel
        </Button>
      )}
      <Button
        variant="ghost"
        onClick={actions.onDelete}
        size="sm"
        className="h-7 text-xs text-destructive"
      >
        <Trash2 className="w-3 h-3 mr-1.5" />
        Delete
      </Button>
    </div>
  );
}
