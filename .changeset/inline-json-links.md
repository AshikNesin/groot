---
"@groot/jobs": patch
"@groot/shell": patch
---

feat: render job-data links inline within the JSON view

Replaces the separate Structured/JSON toggle in `JobJsonBlock` with a single
read-only JSON panel that highlights resolver-matched values as clickable
links. Link ranges are computed while pretty-printing (`stringifyWithLinks`)
and rendered as CodeMirror decorations that navigate on click.

- `JobJsonBlock` no longer toggles between `JobDataView` and raw JSON; it always
  shows JSON with inline link highlights.
- `CodeMirrorEditor` gains `linkRanges` and `onLinkClick` props to drive
  `Decoration.mark` ranges + click handling, plus a `.cm-json-link` style.
