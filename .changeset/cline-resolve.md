---
"groot": minor
---

feat(groot): resolve conflicts with the Cline SDK + GLM Coding Plan

`pnpm groot:resolve` no longer shells out to the global `pi` CLI
(`@earendil-works/pi-coding-agent`). It now runs the [Cline SDK](https://docs.cline.bot/sdk)
in-process — pinned as a `devDependency` (`@cline/sdk`) — on the
[GLM Coding Plan](https://docs.z.ai/devpack/tool/cline) over Z.AI's
OpenAI-compatible endpoint.

Why: downstream repos no longer need to `npm install -g` a separate binary and
authenticate it; `pnpm install` alone provides everything, version-pinned.

Migration for `groot:resolve` users:

- Set your Z.AI (GLM) API key: `export ZAI_API_KEY=...` (documented in
  `.env.schema`). The old `pi` global install + `/login` is no longer used.
- The `--thinking` flag is removed (no GLM equivalent); `--model` is kept and
  defaults to `glm-5.2`. Override the provider entirely with
  `GROOT_RESOLVE_PROVIDER` / `GROOT_RESOLVE_BASE_URL` / `GROOT_RESOLVE_MODEL`.
- Resolution is now more robust: the agent writes each resolved file through a
  controlled `write_resolved_file` tool that refuses to leave conflict markers
  behind. The deterministic `package.json` merge and the rest of the sync flow
  are unchanged.

Requires Node 22+ (the Cline SDK floor); `engines.node` is now declared
explicitly.
