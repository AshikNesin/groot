---
"@groot/jobs": minor
---

Add generic link resolution for job data fields and job state labels.

- **JobDataLinkContext**: New `JobsProvider` + `useJobDataLink` hook so consuming apps can configure a `linkResolver` that maps `(key, value)` to `{ to, label? }`.
- **JobDataView**: Structured key-value renderer with recursive flattening (dot-notation keys). Linkable values render as `<Link>` with an ExternalLink icon.
- **JobJsonBlock**: Added Structured/JSON toggle — defaults to structured view when a linkResolver is configured, raw JSON otherwise.
- **JobsTable**: Added job state label.
