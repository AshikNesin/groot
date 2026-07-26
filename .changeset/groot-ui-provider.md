---
"@groot/ui": minor
---

Add `GrootUIProvider` — a single root provider composing `ConfirmProvider` and the `Toaster`. App authors now mount one `<GrootUIProvider>` instead of remembering to wire up each cross-cutting UI provider individually (previously a hidden, transitive requirement for any consumer of `useConfirm()`). The individual exports remain available for callers that need finer control.
