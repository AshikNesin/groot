---
"@groot/shell": patch
---

PageHeader actions now wrap on narrow viewports (fixes mobile overflow), and the vite client config dedupes its `@groot/*` alias list into a single const shared by the build and the test runner.
