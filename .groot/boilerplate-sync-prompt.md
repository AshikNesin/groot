# Boilerplate Sync Prompt

Use this prompt to sync changes from the boilerplate repo to this project.

---

## Prompt for AI

```
I need to sync changes from my boilerplate repo to this project.

**Setup:**
- This project: {{CURRENT_REPO}}
- Boilerplate repo: {{BOILERPLATE_REPO}}
- Sync config: `.groot/boilerplate-sync.json`

**Your task:**

1. **Read the sync config** from `.groot/boilerplate-sync.json` to understand:
   - Last synced commit
   - Which files to include/exclude
   - Merge strategies

2. **Fetch new commits** from the boilerplate repo:
   ```bash
   # Pull latest changes in boilerplate
   git -C /Users/ashiknesin/Code/groot pull origin main

   # List commits since last sync
   git -C /Users/ashiknesin/Code/groot log --oneline <LAST_SYNC_COMMIT>..HEAD
   ```

3. **Identify changed files** that match the include patterns:
   ```bash
   git -C /Users/ashiknesin/Code/groot diff --name-only <LAST_SYNC_COMMIT>..HEAD
   ```

4. **For each relevant file change:**
   - Show the diff between boilerplate and this project
   - Determine if this is:
     - **New file**: Copy directly
     - **Existing file**: Smart merge (preserve local customizations)
     - **Conflict**: Ask me how to resolve

5. **Apply changes** with my approval for each significant change

6. **Update the sync config** with the new commit hash:
   ```json
   {
     "last_sync": {
       "commit": "<NEW_COMMIT_HASH>",
       "date": "<TODAY>",
       "message": "<SUMMARY_OF_CHANGES>"
     }
   }
   ```

**Important guidelines:**
- Never overwrite project-specific files (client/*, server/*, prisma/schema.prisma)
- For package.json: only suggest dependency additions, don't remove project-specific deps
- For .gitignore: append new entries, don't remove existing ones
- Always show me a summary of what will change before applying
- If a change looks breaking or major, ask for confirmation

---

## Quick Reference

### Files that ARE synced:
- Config files (biome.json, tsconfig.json, vite.config.ts, etc.)
- Scripts (scripts/**)
- Test infrastructure (tests/**)
- Pre-commit hooks (.pre-commit-config.yaml, .gitleaks.toml)
- Claude settings (.claude/**)
- Deployment config (nixpacks.toml, Procfile)

### Files that are NOT synced:
- Application code (client/**, server/**)
- Database schema (prisma/schema.prisma, prisma/migrations/**)
- Project-specific docs (README.md)
- Dependencies (package.json, pnpm-lock.yaml) - handled specially
- Environment files (.env*)
