---
"@groot/ui": minor
---

Add the missing state primitives and converge the badge/table surfaces so pages stop hand-rolling them.

- **New `EmptyState` / `ErrorState`** — one canonical icon + title + description + action shape, replacing the six divergent empty/error stacks that had grown across Todos, Jobs, Storage, Settings, and Passkeys.
- **`LoadingState`** now accepts `size` and `className`, so surfaces needing a fixed height (e.g. `h-96` inside a card) can use it instead of wrapping `LoadingSpinner` in a bespoke box.
- **`StatusBadge` is now built on `Badge`**, inheriting its pill shape and typography. It previously rendered as an unrounded rectangle at `text-[11px]`, so the same semantic looked different depending on which component a page reached for. Status pills change appearance slightly as a result.
- **`Table` now matches the app's real table density** (`px-4 py-3` cells, `px-4 py-2.5` heads) and `TableHead` applies the shared uppercase column-header style. The new **`tableColumnHeaderClass`** export lets grid-based tables (whose rows are links, so they can't use `<th>`) share that exact token instead of redeclaring it locally.
- `LoadingSpinner` uses `size-*` shorthand.
- **New generic skeleton family** — `SkeletonCard` (title bar + body lines, or a custom body via `children`), `SkeletonList` (rows with optional leading block, secondary line, trailing pill), and `SkeletonTable` (header band + per-column bars) join the base `Skeleton`. Pages compose these instead of defining per-page skeleton components. **Breaking-ish:** the old `SkeletonList` variant API (`count`/`variant` with hardcoded TableRow/Card/ListItem/Text shapes) is replaced by the new row-oriented props (`rows`/`leading`/`secondaryLine`/`trailing`); it had no consumers in this repo.
