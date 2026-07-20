---
"@groot/jobs": minor
---

Redesign jobs UI for consistency and add loading skeletons

The jobs pages used a bespoke layout that diverged from the rest of the app:
a small custom header, heavy `border-dashed` styling on stat cards / tables /
detail blocks, and inconsistent button sizing. They now match the app's
established design language:

- Jobs and JobDetail use the shared `PageLayout` / `PageContainer` for a
  consistent header (title + description + actions) and spacing.
- Stat cards are now a single compact clickable Card row (dub-inspired) instead
  of seven dashed-border boxes.
- The jobs table and scheduled-jobs panel are wrapped in Cards with clean
  rounded borders; detail sections (Overview, Data, Output, Logs, Singleton,
  Error) use Card + CardHeader/CardTitle.
- Actions, filter controls, and dialog triggers use the standard Button size
  scale and `size-*` icons.

Loading states are now proper skeletons that match the loaded layout instead
of a centered spinner or a sudden layout jump:

- A reusable `skeletons.tsx` module (`JobsStatsSkeleton`, `JobsTableSkeleton` /
  `JobRowSkeleton`, `ScheduledJobsSkeleton`, `JobDetailSkeleton`) shares the
  shapes across every loading surface so they stay in sync with the real
  components.
- Stats, the jobs table, scheduled jobs, and the job detail page all render
  their skeleton while their data loads.
