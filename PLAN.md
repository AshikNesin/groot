# UI Design System Audit & Consolidation Plan

## TL;DR / Verdict

**Do NOT build a new design system.** The codebase already has the correct foundation — a CSS-variable + shadcn/ui token system in `index.css` / `tailwind.config.js` that the `ui/` components are wired into. The actual problem is **incomplete adoption**: ~40% of the UI bypasses that system with raw `gray-*` classes, a second dead token layer (`design-tokens.ts`) competes with it, 6 UI components have zero consumers, and every page hand-rolls its own container/layout — including double-nesting inside the `Layout` shell.

The fix is a **consolidation & migration**, not a rebuild. This is cheaper, lower-risk, and directly targets the inconsistency. Estimated effort: ~3 focused sessions.

---

## What I Found

### 1. There are TWO competing design systems (one is dead)

| System                                                                              | Where                                         | Status                                                           |
| ----------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| **CSS-variable tokens** (`--background`, `--foreground`, `--primary`, `--success`…) | `client/src/index.css` + `tailwind.config.js` | ✅ Live — used by 20/29 `ui/` components                         |
| **JS design tokens** (`grayScale`, `tableStyles`, `buttonStyles`…)                  | `client/src/core/lib/design-tokens.ts`        | ❌ **100% dead** — 0 consumers, only re-exported from `utils.ts` |

`design-tokens.ts` is 200+ lines defining a "Stripe-inspired" system (`grayScale`, `statusColors`, `pageLayout`, `tableStyles`, `buttonStyles`, `typography`…). **Nothing imports any of it.** It's pure cargo, and worse, it describes a _different_ palette (`bg-black`/`text-gray-900`) than the live CSS system (`bg-primary`/`text-foreground`), so anyone reading the codebase gets two contradictory "sources of truth."

### 2. Even `ui/` components partially bypass the live system

- 3 `ui/` files hardcode raw `gray-*` instead of tokens: `loading-skeleton.tsx`, `loading-spinner.tsx`, `empty-state.tsx`
- `status-badge.tsx` hardcodes `text-green-600` / `text-yellow-600` / `text-blue-600` for icons — even though `--success`, `--warning`, `--info` CSS vars exist and the sibling `badge.tsx` uses them

### 3. Six UI components have zero consumers (dead)

| Component                                       | File                  | Status                                                                            |
| ----------------------------------------------- | --------------------- | --------------------------------------------------------------------------------- |
| `Popover`                                       | `ui/popover.tsx`      | 0 imports (the `bg-popover` matches elsewhere are the CSS var, not the component) |
| `Progress`                                      | `ui/progress.tsx`     | 0 imports                                                                         |
| `Sheet`                                         | `ui/sheet.tsx`        | 0 imports                                                                         |
| `Switch`                                        | `ui/switch.tsx`       | 0 imports (all `switch` matches are JS `switch` statements)                       |
| `EmptyState` / `EmptyTableState` / `ErrorState` | `ui/empty-state.tsx`  | 0 imports (all 3 exports dead)                                                    |
| `StatusBadge`                                   | `ui/status-badge.tsx` | 0 imports                                                                         |

### 4. The layout layer is broken (double containers, ignored helpers)

The app shell `Layout.tsx` already wraps `<Outlet/>` in a container:

```tsx
<main className="flex-1 mx-auto max-w-5xl w-full px-4 sm:px-6 py-8">
  <Outlet />
</main>
```

But **every page adds its own container too**, causing double-nesting and width conflicts:

| Page                               | What it renders inside `Layout`'s `max-w-5xl` | Net effect                              |
| ---------------------------------- | --------------------------------------------- | --------------------------------------- |
| `Jobs.tsx`                         | `min-h-screen` + `max-w-7xl`                  | Capped at 5xl — the 7xl is defeated     |
| `JobDetail.tsx`                    | `min-h-screen` + `max-w-5xl`                  | Redundant; also duplicates the block 3× |
| `Storage.tsx`                      | `min-h-screen` + `max-w-7xl`                  | Capped at 5xl                           |
| `Dashboard` / `Todos` / `Settings` | `<PageLayout>` (adds its own container)       | Redundant                               |

Meanwhile `PageLayout` / `PageHeader` / `Section` / `PageContainer` exist precisely to standardize this — but only 3/6 pages use them, and those components themselves hardcode `text-gray-900`/`text-gray-500` instead of tokens.

### 5. Pages are inconsistent at the class level

**120 raw hardcoded color instances across 9 non-`ui/` files.** Top offenders:

```
27× text-gray-500   16× text-gray-900   10× bg-gray-50
 8× text-red-600     6× text-red-500      6× bg-gray-400
 5× text-gray-600    5× bg-red-50         4× text-blue-500 …
```

`Jobs.tsx` alone defines **three** hand-rolled status-color maps (`stateDotClass`, `stateTextClass`, `stateBgClass`) with raw colors — duplicating logic `StatusBadge` was built for (but nobody uses `StatusBadge`).

### 6. Status semantics are defined three different ways

1. `badge.tsx` — `success` / `warning` / `info` / `destructive` variants (tokenized)
2. `status-badge.tsx` — maps status strings → badge variants (but hardcodes icon colors)
3. `Jobs.tsx` `DotBadge` — entirely bespoke

There is no single answer to "what color is a failed job?"

### 7. No barrel file for `ui/`

Every consumer deep-imports (`@/ui/button`, `@/ui/dialog`…). Minor, but it makes the surface area hard to see and grep.

### 8. Dark mode is wired but unused

The CSS-variable architecture exists specifically to support theming — yet there are **0** `dark:` utilities or `.dark` class usages anywhere. The infrastructure is dormant.

---

## Recommendation: Consolidate, Don't Rebuild

Building a third system on top of two existing ones would deepen the problem. The live CSS-variable system is industry-standard (shadcn/ui), already works, and already supports theming. The work is **migration + deletion**, not invention.

### Principles for the migration

1. **One token layer.** CSS variables (`--background`, `--primary`, `--success`…) are the single source of truth. Semantic Tailwind classes (`bg-primary`, `text-foreground`, `text-success`) are the only allowed color API.
2. **No raw palette colors** (`gray-*`, `red-*`, `blue-*`, `green-*`, `yellow-*`) outside `index.css` and `tailwind.config.js`.
3. **One layout pattern.** The shell owns the container; pages own only their content. `PageLayout`/`PageHeader`/`Section` are the composition primitives — and they get tokenized.
4. **One status component.** `StatusBadge` becomes the only way to render a job/health status, and its colors come from tokens.
5. **Delete dead code first** — it currently makes the system look bigger and more tangled than it is.

---

## Phased Plan

### Phase 0 — Delete the dead ✅ DONE

Removes confusion before the migration. Each item below is independently shippable.

- [x] Delete `client/src/core/lib/design-tokens.ts` and its re-exports in `utils.ts`
- [x] Delete `client/src/ui/empty-state.tsx` (`EmptyState`, `EmptyTableState`, `ErrorState` — all unused)
- [x] Delete `client/src/ui/status-badge.tsx` (unused; will be re-added in Phase 3 in tokenized form)
- [x] Delete `client/src/ui/popover.tsx`, `ui/progress.tsx`, `ui/sheet.tsx`, `ui/switch.tsx` (0 consumers)
- [x] Add `client/src/ui/index.ts` barrel re-exporting the survivors

### Phase 1 — Fix the layout shell (≈1 session)

Unblocks every page migration.

- [ ] Decide the container contract: **shell owns `<main className="flex-1 w-full px-4 sm:px-6 py-8">` with NO max-width**; pages opt into a width via `<PageLayout maxWidth="7xl">`. (Current `max-w-5xl` in the shell silently overrides wider pages.)
- [ ] Tokenize `PageHeader` / `Section` / `PageContainer`: replace `text-gray-900` → `text-foreground`, `text-gray-500` → `text-muted-foreground`, etc.
- [ ] Migrate `Dashboard`, `Todos`, `Settings` to the new container contract (they already use `PageLayout`, so this is mostly removing redundant wrappers)

### Phase 2 — Migrate the bypass pages (≈1–2 sessions)

Apply the contract to the pages that currently ignore it.

- [ ] `Jobs.tsx`: drop `min-h-screen`/`max-w-7xl` wrappers, wrap content in `<PageLayout maxWidth="7xl">`, replace the 3 hand-rolled status-color maps + `DotBadge` with the tokenized `StatusBadge` from Phase 3
- [ ] `JobDetail.tsx`: remove the triple-duplicated container block, wrap in `<PageLayout maxWidth="5xl">`
- [ ] `Storage.tsx`: wrap in `<PageLayout maxWidth="7xl">`, replace the hand-rolled `<table>` with the `ui/table` primitives
- [ ] `Login.tsx`: tokenized standalone layout (it's outside the shell)

### Phase 3 — Close the status-component gap (≈30 min)

- [ ] Re-introduce `StatusBadge` reading colors **only** from tokens (`text-success`, `text-warning`, `text-destructive`, `text-info`). Define the canonical `status → variant` map here as the single source of truth.
- [ ] Migrate all call sites (notably `Jobs.tsx`'s `DotBadge`) to it.

### Phase 4 — Sweep raw colors (≈1 session, mostly mechanical)

- [ ] Replace remaining `gray-*` / `red-*` / `blue-*` / `green-*` / `yellow-*` in `app/` and `core/components/` with semantic tokens. The 120 instances collapse to ~6 token names.
- [ ] Add an ESLint rule (e.g. `no-restricted-syntax` / `tailwindcss/no-contradicting-classname` or a custom regex banning `-(gray|red|blue|green|yellow|slate|zinc)-[0-9]` outside `index.css`) to prevent regression.

### Phase 5 — Tokenize the remaining `ui/` stragglers (≈15 min)

- [ ] `loading-skeleton.tsx`, `loading-spinner.tsx`: swap `gray-*` → tokens

---

## Explicit Non-Goals

- **Building a new component library or token system from scratch.** The existing CSS-variable system is the target, not the victim.
- **Dark mode.** The architecture supports it, but turning it on is a separate product decision and out of scope here. Phase 4's lint rule keeps the door open.
- **Visual redesign / restyling.** Colors and spacing should look identical after migration; only the _mechanism_ changes.
- **Adding new components** beyond the tokenized `StatusBadge`.

---

## Resolved Decisions

1. **Container contract — RESOLVED (shell drops width, pages opt in):** The shell's `max-w-5xl` already wins today by CSS cascade, so Jobs/Storage's `max-w-7xl` is _dead_ (never rendered), not intent waiting to be honored. Going wide becomes an explicit `PageLayout maxWidth="7xl"` opt-in. Shell keeps structural chrome only (`min-h-screen bg-background flex flex-col` + header band + `px-4 sm:px-6 py-8` padding on `<main>`); drops `max-w-5xl`. `PageLayout`/`PageContainer` default width changes `7xl → 5xl` to match today's rendered reality. Header band stays at 5xl (its own band, decoupled). Net visual change: zero — widths just become honest. (Subsumes the former decisions 1 + 4.)
2. **Barrel imports — RESOLVED (adopt barrel):** `import { Button, Dialog } from "@/ui"`. Matches the existing barrel convention (`core/components/layout/index.ts`, `core/lib/utils`). Surface is ~22 components post-Phase-0, small enough to scan. No circular-import risk — `ui/` components don't import each other (the `bg-popover` matches are the CSS variable, not the `Popover` component). Vite/Rollup tree-shakes ESM barrels cleanly.
3. **Lint enforcement — RESOLVED (ship with Phase 4):** Add the "no raw palette colors" rule in Phase 4, together with the sweep. Banning X and removing all X is one unit of work; shipping together makes the rule a forcing function (red CI = sweep incomplete). `index.css` + `tailwind.config.js` are allowlisted.
