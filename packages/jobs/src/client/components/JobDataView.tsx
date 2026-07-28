import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { useJobDataLink } from "./JobDataLinkContext";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isScalar(value: unknown): boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  );
}

function formatScalar(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return String(value);
  if (typeof value === "number") return String(value);
  return String(value);
}

interface FieldRowProps {
  fieldKey: string;
  value: unknown;
  depth: number;
}

function FieldRow({ fieldKey, value, depth }: FieldRowProps) {
  const { resolveLink } = useJobDataLink();
  const link = resolveLink ? resolveLink(fieldKey, value) : null;

  if (isScalar(value)) {
    return (
      <div
        className="grid grid-cols-[1fr_2fr] gap-4 py-1.5 px-3"
        style={{ paddingLeft: `${depth * 12 + 12}px` }}
      >
        <dt className="text-xs font-medium text-muted-foreground truncate" title={fieldKey}>
          {fieldKey}
        </dt>
        <dd className="text-xs text-foreground break-all">
          {link ? (
            <Link
              to={link.to}
              className="inline-flex items-center gap-1 text-primary hover:underline"
              title={link.label || formatScalar(value)}
            >
              {link.label || formatScalar(value)}
              <ExternalLink className="size-3 shrink-0" />
            </Link>
          ) : (
            <span className="font-mono">{formatScalar(value)}</span>
          )}
        </dd>
      </div>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <div
          className="grid grid-cols-[1fr_2fr] gap-4 py-1.5 px-3"
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
        >
          <dt className="text-xs font-medium text-muted-foreground truncate" title={fieldKey}>
            {fieldKey}
          </dt>
          <dd className="text-xs font-mono text-muted-foreground">[]</dd>
        </div>
      );
    }

    return (
      <div>
        <div className="py-1.5 px-3" style={{ paddingLeft: `${depth * 12 + 12}px` }}>
          <span className="text-xs font-medium text-muted-foreground">{fieldKey}</span>
        </div>
        {value.map((item, index) => (
          <div key={index}>
            {isPlainObject(item) ? (
              <ObjectFields data={item} parentKey={`${fieldKey}[${index}]`} depth={depth + 1} />
            ) : (
              <div
                className="grid grid-cols-[1fr_2fr] gap-4 py-1.5 px-3"
                style={{ paddingLeft: `${(depth + 1) * 12 + 12}px` }}
              >
                <dt className="text-xs font-medium text-muted-foreground">[{index}]</dt>
                <dd className="text-xs text-foreground break-all">
                  {isScalar(item) ? (
                    <span className="font-mono">{formatScalar(item)}</span>
                  ) : (
                    <span className="font-mono text-muted-foreground">
                      {Array.isArray(item) ? "[…]" : "{…}"}
                    </span>
                  )}
                </dd>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (isPlainObject(value)) {
    return (
      <div>
        <div className="py-1.5 px-3" style={{ paddingLeft: `${depth * 12 + 12}px` }}>
          <span className="text-xs font-medium text-muted-foreground">{fieldKey}</span>
        </div>
        <ObjectFields data={value} parentKey={fieldKey} depth={depth + 1} />
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-[1fr_2fr] gap-4 py-1.5 px-3"
      style={{ paddingLeft: `${depth * 12 + 12}px` }}
    >
      <dt className="text-xs font-medium text-muted-foreground truncate" title={fieldKey}>
        {fieldKey}
      </dt>
      <dd className="text-xs font-mono text-muted-foreground">{typeof value}</dd>
    </div>
  );
}

interface ObjectFieldsProps {
  data: Record<string, unknown>;
  parentKey?: string;
  depth?: number;
}

function ObjectFields({ data, parentKey = "", depth = 0 }: ObjectFieldsProps) {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return (
      <div
        className="py-1.5 px-3 text-xs font-mono text-muted-foreground"
        style={{ paddingLeft: `${depth * 12 + 12}px` }}
      >
        {"{}"}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/30">
      {entries.map(([key, value]) => {
        const fullKey = parentKey ? `${parentKey}.${key}` : key;
        return <FieldRow key={fullKey} fieldKey={key} value={value} depth={depth} />;
      })}
    </div>
  );
}

interface JobDataViewProps {
  label: string;
  value: unknown;
  showHeader?: boolean;
}

export function JobDataView({ label, value, showHeader = true }: JobDataViewProps) {
  if (!isPlainObject(value)) {
    return (
      <div className={showHeader ? "rounded-lg border border-border/60" : ""}>
        {showHeader && (
          <div className="border-b border-border/60 px-4 py-3">
            <h3 className="text-sm font-medium">{label}</h3>
          </div>
        )}
        <div className={showHeader ? "p-4" : ""}>
          <pre className="text-xs font-mono text-muted-foreground">
            {JSON.stringify(value, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className={showHeader ? "rounded-lg border border-border/60" : ""}>
      {showHeader && (
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-sm font-medium">{label}</h3>
        </div>
      )}
      <div className="py-1">
        <ObjectFields data={value} />
      </div>
    </div>
  );
}
