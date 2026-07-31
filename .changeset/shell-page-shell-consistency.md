---
"@groot/shell": minor
---

Make the page shell the single owner of page chrome, and adopt the shared primitives across shell pages.

- **`PageHeader` / `PageLayout` gain `breadcrumb` and `titleAdornment` slots**, and `description` widens from `string` to `ReactNode`. Detail pages previously copy-pasted `PageHeader`'s `<h1>` classes because there was nowhere to put a breadcrumb trail or a status pill.
- **`Section` gains `meta` and `actions` slots** and now renders a `text-sm` heading, matching the "label + count" pattern that pages were hand-rolling. It had no consumers before.
- **`Storage` now renders through `PageLayout`**, dropping its own `max-w-7xl` container and `text-2xl font-medium` `<h1>` (which disagreed with every other page title). Its breadcrumb uses the `Breadcrumb` primitive and its file list uses `Table`/`TableRow`/`TableCell` instead of a raw `<table>`.
- **`AppSettings` and `PasskeyManager` now use `Card`** instead of hand-rolled `rounded-xl border border-border bg-card` divs, so the Settings page no longer has visibly different card edges than the rest of the app (`Card` uses a ring, not a border).
- **Destructive confirmations now use `useConfirm()`** in `AppSettings` and `PasskeyManager`, replacing two bespoke `Dialog`s that could be dismissed by an overlay click. `useAppSettings` no longer returns the now-unused `showDeleteDialog` / `setShowDeleteDialog` / `requestDelete`.
- `ProtectedRoute` uses `LoadingSpinner` instead of a hand-rolled spinner div; redundant `mr-2` margins on icons inside gap-spaced menu items are removed.
