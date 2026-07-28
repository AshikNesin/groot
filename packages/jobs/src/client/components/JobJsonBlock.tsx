import { Button } from "@groot/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@groot/ui/card";
import { lazy, Suspense, useState } from "react";
import { JobDataView } from "./JobDataView";
import { useJobDataLink } from "./JobDataLinkContext";

// Code-split the editor so the job list isn't blocked on it.
const CodeMirrorEditor = lazy(() =>
  import("@groot/shell/components/CodeMirrorEditor").then((m) => ({
    default: m.CodeMirrorEditor,
  })),
);

const READONLY_SETUP = {
  lineNumbers: true,
  foldGutter: true,
  highlightActiveLineGutter: false,
  highlightActiveLine: false,
} as const;

/** Read-only, pretty-printed JSON panel. Used for job `data` and `output`.
 *  When a linkResolver is configured via JobsProvider, shows a toggle
 *  between structured (linked) and raw JSON views.
 */
export function JobJsonBlock({ label, value }: { label: string; value: unknown }) {
  const { resolveLink } = useJobDataLink();
  const hasLinkResolver = !!resolveLink;
  const [showJson, setShowJson] = useState(!hasLinkResolver);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{label}</CardTitle>
        {hasLinkResolver && (
          <div className="flex gap-1">
            <Button
              variant={showJson ? "ghost" : "secondary"}
              size="sm"
              onClick={() => setShowJson(false)}
            >
              Structured
            </Button>
            <Button
              variant={showJson ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowJson(true)}
            >
              JSON
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {showJson || !hasLinkResolver ? (
          <div className="overflow-hidden rounded-lg border border-border/60">
            <Suspense fallback={<div className="h-48" />}>
              <CodeMirrorEditor
                value={JSON.stringify(value, null, 2)}
                editable={false}
                lineWrapping
                basicSetup={READONLY_SETUP}
              />
            </Suspense>
          </div>
        ) : (
          <JobDataView label={label} value={value} showHeader={false} />
        )}
      </CardContent>
    </Card>
  );
}
