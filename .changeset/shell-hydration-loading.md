---
"@groot/shell": minor
---

Refine shell loading and hydration states: read the sidebar collapsed preference synchronously from `localStorage` (fixes the collapse flash on reload), give `<main>` a min-height for a stable footprint while content loads, and show a centered spinner during the initial auth check instead of a blank screen.
