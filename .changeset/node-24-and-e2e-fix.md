---
"groot": minor
---

Bump required Node engine to `24.x` and fix flaky Todos e2e selector.

- **engines.node**: `>=22` → `24.x` (more restrictive; drop Node 22/23 support)
- **e2e**: `Todos` page test now matches the page `<h1>` (`level: 1`) instead of any heading containing "todo", which was matching todo card titles (`<h3>`)
- **.gitignore**: ignore local `.claude/settings.local.json`
