---
"groot": patch
---

Fix CI release-notes extraction, boilerplate sync/upstream tooling, and changeset access config:

- **release workflow:** GitHub Release notes no longer always fall back to `--generate-notes`. The `awk` range pattern matched the version header as both start and end, so it emitted only the header line and `head -n -1` stripped it, always producing empty notes. `changesets/action` is also now pinned to a commit SHA (was a floating `@v1` tag).
- **groot sync:** `extractChangelog` no longer captures the entire changelog when `last_sync.version` is unset (commit-SHA `fromRef` had no version to anchor the stop boundary). Breaking-change detection now matches scoped conventional commits like `feat(scope)!:`. Cloning no longer hardcodes `--branch main` (detects the default branch).
- **groot upstream:** Both clones and the PR `--base` now use the boilerplate's detected default branch instead of hardcoded `main`. `gh pr create --repo` now correctly parses SSH URLs (`ssh://git@github.com/...`, `git@github.com:...`) in addition to HTTPS.
- **changeset config:** `access` set to `public` to match the ISC-licensed open-source intent.
