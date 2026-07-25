---
"@groot/shell": minor
---

Make the shell Layout/SidebarNav/CommandPalette/Storage app-configurable

The shell app shell (Layout, SidebarNav, CommandPalette) and the Storage page
now accept optional props so child apps can brand the shell and extend the
command palette / user menu without forking the components. All new props are
optional with defaults that preserve the existing groot behavior, so the
boilerplate's own app is unchanged.

- `Layout`: `navItems`, `brand`, `userMenuItems`, `commandGroups` props. The
  sidebar offset (`lg:pl-56`/`lg:pl-16`) and the mobile top bar are now gated
  on `header === undefined` so a custom header no longer double-pads the page.
  The footer user dropdown is driven by `userMenuItems` (default = the prior
  Storage/Jobs/Settings + Log out entries) and supports `to`/`href`/`onSelect`
  entries with optional separators and destructive styling.
- `SidebarNav`: `NavItem.icon` accepts a `LucideIcon` directly (in addition to
  the existing string keys). New `brand` prop (`{ label, icon?, to? }`) replaces
  the hardcoded "Groot" label/logo.
- `CommandPalette`: `CommandPaletteDialog({ groups })` accepts custom
  `CommandGroupEntry[]` (default = the prior Navigation + Account groups).
- `Storage`: optional `onView?: (file: StorageFile) => void` lets an app
  intercept "View" clicks for an in-app viewer (falls back to the existing
  open-in-new-tab behavior). The bulk-upload input was wired but never
  triggered by any button (dead code); the single Upload input is now
  `multiple` and routes 1-file vs multi-file uploads internally.
