---
"groot": patch
---

Reuse a clean local `~/Code/groot` checkout during `groot:sync` and `groot:upstream` instead of re-cloning the boilerplate on every run. Falls back to a fresh clone when the local checkout is missing, dirty, has a mismatched origin, or can't be fast-forwarded. Reused checkouts are never modified destructively or deleted.
