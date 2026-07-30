---
"@groot/core": minor
---

Database engine is now inferred from the `DATABASE_URL` scheme (`postgresql://` → Postgres, `file:` / bare path → SQLite) instead of a separate `DATABASE_ENGINE` env var. The old knob is removed from `.env.schema`; existing consumers that relied on `DATABASE_ENGINE` should delete it (the scheme now drives `dbEngine`, `isPostgres`, and `isSqlite` everywhere).
