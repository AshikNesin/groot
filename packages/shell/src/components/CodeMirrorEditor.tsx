import { useEffect, useMemo, useState, type ComponentType } from "react";
import type { ReactCodeMirrorProps } from "@uiw/react-codemirror";

/**
 * JSON editor built on CodeMirror.
 *
 * Owns the heavy `@codemirror/*` + `@uiw/react-codemirror` imports so callers
 * can code-split them: import this via `React.lazy(() => …)` behind a
 * `<Suspense>` and CodeMirror lands in its own chunk instead of the main bundle.
 */

// Dynamically load the heavy CodeMirror packages so they are excluded from
// the main chunk. The promises resolve on first render; subsequent renders
// reuse the cached modules.
const editorPromise = Promise.all([
  import("@uiw/react-codemirror"),
  import("@codemirror/lang-json"),
  import("@codemirror/view"),
]).then(([cm, langJson, view]) => ({
  CodeMirror: cm.default as ComponentType<Record<string, unknown>>,
  json: langJson.json,
  EditorView: view.EditorView,
}));

type EditorModules = Awaited<typeof editorPromise>;

interface CodeMirrorEditorProps {
  value: string;
  onChange?: (value: string) => void;
  height?: string;
  editable?: boolean;
  /** Enable `EditorView.lineWrapping` (wrap long lines instead of horizontal scroll). */
  lineWrapping?: boolean;
  basicSetup?: ReactCodeMirrorProps["basicSetup"];
}

export function CodeMirrorEditor({
  value,
  onChange,
  height,
  editable = true,
  lineWrapping = false,
  basicSetup,
}: CodeMirrorEditorProps) {
  const [mods, setMods] = useState<EditorModules | null>(null);

  useEffect(() => {
    editorPromise.then(setMods);
  }, []);

  // Keep the extension array referentially stable across renders that don't
  // change lineWrapping — @uiw/react-codemirror reconfigures on reference change.
  const extensions = useMemo(() => {
    if (!mods) return [];
    return [mods.json(), ...(lineWrapping ? [mods.EditorView.lineWrapping] : [])];
  }, [mods, lineWrapping]);

  if (!mods) return null;

  const { CodeMirror } = mods;

  return (
    <CodeMirror
      value={value}
      height={height}
      extensions={extensions}
      onChange={onChange}
      editable={editable}
      theme="light"
      basicSetup={basicSetup}
    />
  );
}
