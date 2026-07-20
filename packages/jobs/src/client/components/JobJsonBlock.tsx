import { Card, CardContent, CardHeader, CardTitle } from "@groot/ui/card";
import { lazy, Suspense } from "react";

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

/** Read-only, pretty-printed JSON panel. Used for job `data` and `output`. */
export function JobJsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
