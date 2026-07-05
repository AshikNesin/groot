import { json } from "@codemirror/lang-json";
import { EditorView } from "@codemirror/view";
import CodeMirror, { type ReactCodeMirrorProps } from "@uiw/react-codemirror";

/**
 * JSON editor built on CodeMirror.
 *
 * Owns the heavy `@codemirror/*` + `@uiw/react-codemirror` imports so callers
 * can code-split them: import this via `React.lazy(() => …)` behind a
 * `<Suspense>` and CodeMirror lands in its own chunk instead of the main bundle.
 */
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
  const extensions = [json(), ...(lineWrapping ? [EditorView.lineWrapping] : [])];
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
