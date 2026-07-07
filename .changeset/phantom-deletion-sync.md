---
"groot": patch
---

fix(sync): stop silently dropping synced files that were never committed

The sync engine's `kept-local-deletion` bucket treated any file present in the
baseline but missing from the working tree as an intentional local deletion.
But the baseline is built from groot's tree, not the child repo's own history —
so a file a prior sync wrote into the working tree but the child never
committed (then swept, e.g. by `git clean -fd`) was indistinguishable from a
deliberate `git rm`. The result: core synced files (stores, components, shared
modules, skills, test mirrors) silently vanished from every future sync, only
surfacing as a build break or as dozens of "Kept Local Deletions" the user has
no memory of creating.

The engine now consults the child repo's own history when classifying a
missing-locally file: if the path was ever tracked on `HEAD` it's a real
deletion (honored); if it was never committed it's a phantom and is restored
from upstream on the next sync. The check is history-based (`git log -- <path>`)
rather than a `cat-file -e HEAD:path` tree check, so committed `git rm`s are
still respected — only never-tracked files are restored. Self-healing: one
extra sync repopulates every lost file.
