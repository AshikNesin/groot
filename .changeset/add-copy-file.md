---
"@groot/core": patch
---

feat(core): add `copyFile` storage helper

Mirrors the existing `renameFile` util but uses `files.copy()` so the source
is preserved. Throws `Boom.notFound` when the source key does not exist,
matching `renameFile` semantics.
