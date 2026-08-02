import { Card, CardContent, CardHeader, CardTitle } from "@groot/ui/card";
import { lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import type { CodeMirrorLinkRange } from "@groot/shell/components/CodeMirrorEditor";
import { useJobDataLink } from "./JobDataLinkContext";

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

export function stringifyWithLinks(
  value: unknown,
  resolveLink?: (key: string, value: unknown) => { to: string } | null,
) {
  type Serialized = { text: string; ranges: CodeMirrorLinkRange[] };

  const serialize = (current: unknown, key: string, level: number): Serialized => {
    if (Array.isArray(current)) {
      if (current.length === 0) return { text: "[]", ranges: [] };
      const items = current.map((item, index) => serialize(item, `${key}[${index}]`, level + 1));
      let offset = 2;
      const indent = "  ".repeat(level + 1);
      const ranges = items.flatMap(({ ranges, text }) => {
        const adjusted = ranges.map((range) => ({
          ...range,
          from: range.from + offset + indent.length,
          to: range.to + offset + indent.length,
        }));
        offset += indent.length + text.length + 2;
        return adjusted;
      });
      return {
        text: `[\n${items
          .map(({ text }) => `${"  ".repeat(level + 1)}${text}`)
          .join(",\n")}\n${"  ".repeat(level)}]`,
        ranges,
      };
    }

    if (current !== null && typeof current === "object") {
      const entries = Object.entries(current).filter(
        ([, item]) => JSON.stringify(item) !== undefined,
      );
      if (entries.length === 0) return { text: "{}", ranges: [] };
      let offset = 2;
      const indent = "  ".repeat(level + 1);
      const serializedEntries = entries.map(([entryKey, item]) => {
        const serialized = serialize(item, entryKey, level + 1);
        const keyLength = JSON.stringify(entryKey).length;
        const valueOffset = offset + indent.length + keyLength + 2;
        const result = {
          ...serialized,
          ranges: serialized.ranges.map((range) => ({
            ...range,
            from: range.from + valueOffset,
            to: range.to + valueOffset,
          })),
        };
        offset += indent.length + keyLength + 2 + serialized.text.length + 2;
        return { entryKey, ...result };
      });
      return {
        text: `{\n${serializedEntries
          .map(
            ({ entryKey, text }) => `${"  ".repeat(level + 1)}${JSON.stringify(entryKey)}: ${text}`,
          )
          .join(",\n")}\n${"  ".repeat(level)}}`,
        ranges: serializedEntries.flatMap(({ ranges }) => ranges),
      };
    }

    const text = JSON.stringify(current) ?? "null";
    const link = resolveLink?.(key, current);
    return {
      text,
      ranges: link ? [{ from: 0, to: text.length, href: link.to }] : [],
    };
  };

  const serialized = serialize(value, "", 0);
  return { json: serialized.text, linkRanges: serialized.ranges };
}

export function JobJsonBlock({ label, value }: { label: string; value: unknown }) {
  const navigate = useNavigate();
  const { resolveLink } = useJobDataLink();
  const { json, linkRanges } = stringifyWithLinks(value, resolveLink);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border border-border/60">
          <Suspense fallback={<div className="h-48" />}>
            <CodeMirrorEditor
              value={json}
              editable={false}
              lineWrapping
              basicSetup={READONLY_SETUP}
              linkRanges={linkRanges}
              onLinkClick={navigate}
            />
          </Suspense>
        </div>
      </CardContent>
    </Card>
  );
}
