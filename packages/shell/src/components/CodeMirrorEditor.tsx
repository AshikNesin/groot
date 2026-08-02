import { useEffect, useMemo, useState, type ComponentType } from "react";
import type { ReactCodeMirrorProps } from "@uiw/react-codemirror";
import type { Extension } from "@codemirror/state";

export interface CodeMirrorLinkRange {
  from: number;
  to: number;
  href: string;
}

const editorPromise = Promise.all([
  import("@uiw/react-codemirror"),
  import("@codemirror/lang-json"),
  import("@codemirror/view"),
]).then(([cm, langJson, view]) => ({
  CodeMirror: cm.default as ComponentType<Record<string, unknown>>,
  json: langJson.json,
  Decoration: view.Decoration,
  EditorView: view.EditorView,
}));

type EditorModules = Awaited<typeof editorPromise>;

interface CodeMirrorEditorProps {
  value: string;
  onChange?: (value: string) => void;
  height?: string;
  editable?: boolean;
  lineWrapping?: boolean;
  basicSetup?: ReactCodeMirrorProps["basicSetup"];
  linkRanges?: CodeMirrorLinkRange[];
  onLinkClick?: (href: string) => void;
}

export function CodeMirrorEditor({
  value,
  onChange,
  height,
  editable = true,
  lineWrapping = false,
  basicSetup,
  linkRanges = [],
  onLinkClick,
}: CodeMirrorEditorProps) {
  const [mods, setMods] = useState<EditorModules | null>(null);

  useEffect(() => {
    editorPromise.then(setMods);
  }, []);

  const extensions = useMemo<Extension[]>(() => {
    if (!mods) return [];

    const extensions: Extension[] = [mods.json()];
    if (lineWrapping) extensions.push(mods.EditorView.lineWrapping);

    if (linkRanges.length > 0 && onLinkClick) {
      const linkMark = mods.Decoration.mark({ class: "cm-json-link" });
      const decorations = mods.Decoration.set(
        linkRanges.map((range) => linkMark.range(range.from, range.to)),
        true,
      );

      extensions.push(
        mods.EditorView.decorations.of(decorations),
        mods.EditorView.domEventHandlers({
          click(event, view) {
            const position = view.posAtCoords({ x: event.clientX, y: event.clientY });
            const range =
              position === null
                ? undefined
                : linkRanges.find(({ from, to }) => position >= from && position <= to);
            if (!range) return false;
            onLinkClick(range.href);
            return true;
          },
        }),
      );
    }

    return extensions;
  }, [mods, lineWrapping, linkRanges, onLinkClick]);

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
