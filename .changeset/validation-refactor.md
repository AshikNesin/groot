---
"@groot/core": minor
"@groot/jobs": minor
---

refactor(core): migrate backend validation from middleware to strictly-typed controller helpers

Replaced the `validateBody`, `validateQuery`, and `validateParams` Express middlewares with inline controller helpers `parseBody`, `parseQuery`, and `parseParams`. This change improves type safety by directly leveraging `z.output<typeof Schema>` inside the controllers, eliminating the need for unsafe `as T` casting.

- The `req.validated` property has been removed from the Express Request type.
- All core and shared feature modules (auth, passkey, storage, jobs, settings) have been migrated.
