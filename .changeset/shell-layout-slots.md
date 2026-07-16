---
"@groot/shell": minor
---

Add `header` / `padded` / `mainClassName` / `className` slots to the shell `Layout`

`<Layout/>` now accepts:
- `header?: ReactNode` — render a custom header/nav (e.g. an app `<Navbar/>`)
  instead of the default shell header (logo + command palette + user menu).
- `padded?: boolean` (default `true`) — toggle `<main>`'s default padding. Set
  `false` when pages own their own padding via `PageContainer`.
- `mainClassName?` / `className?` — extra classes merged onto `<main>` / the
  outer wrapper.

Fully backward compatible: `<Layout/>` with no props behaves exactly as before.
Lets apps brand the shell without forking the whole layout component.
