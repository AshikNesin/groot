---
"@groot/core": minor
"@groot/ui": minor
"@groot/shell": minor
"@groot/jobs": minor
"groot": minor
---

refactor: unify API client, form handling, and server response flow

A cross-cutting refactor of how the frontend talks to the API and how
controllers shape responses, plus a shared Form primitive.

## @groot/core

- Removed the `*System` namespace barrels (`AISystem`, `AuthSystem`,
  `ErrorSystem`, `KVSystem`, plus the passkey/settings/storage equivalents).
  Callers now use direct named imports instead of convenience namespaces.
- Added `utils/controller.utils.ts` with `requireUser(req)` and
  `validatedBody<T>(req)` helpers, replacing repeated inline `req.user` /
  `req.body as` boilerplate across controllers.
- Added `utils/api-response.utils.ts` to standardize controller response
  shapes.
- Extracted shared Zod field shapes (`emailField`, `passwordField`) in
  `auth.validation.ts` so the client can reuse them for form validation
  (single source of truth).
- Streamlined `error-handler`, `error-response`, `route-handler`, and
  `validation` middlewares.

## @groot/ui

- Added a `Form` component (`form.tsx`) with `react-hook-form` integration and
  field helpers.

## @groot/shell

- Reworked `lib/api.ts` (the `apiClient`) for simpler, more consistent request
  handling.
- Added `useToastMutation` hook to standardize mutation + toast feedback.
- Refactored `Login`, storage dialogs (`CreateFolderDialog`, `RenameDialog`),
  `PasskeyManager`, `AppSettings`, and the `useStorage` / `useAppSettings`
  hooks to build on the new Form component and apiClient.

## @groot/jobs

- Refactored the client API layer (`api.ts`), `useJobs`, `useJobDetail`, and
  `JobsTable` to align with the new apiClient patterns.
