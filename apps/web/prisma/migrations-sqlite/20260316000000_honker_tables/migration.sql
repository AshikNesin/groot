-- Honker job-queue tables. These tables are created at runtime by
-- @russellthehippo/honker-node (the SQLite job queue, selected when
-- DATABASE_ENGINE=sqlite) using CREATE TABLE ... IF NOT EXISTS. They are
-- declared here so Prisma's migration history reflects the runtime schema and
-- `prisma migrate dev` does not report drift against tables it never created.
--
-- The matching Prisma models (schema.sqlite.prisma) carry @@ignore, so Prisma
-- never generates DDL for them — the canonical definitions live in this file.
-- DDL is guarded with IF NOT EXISTS, so applying this migration against a DB
-- honker already initialized is a no-op. There are no Postgres honker tables:
-- postgres uses pg-boss, which keeps its tables in a separate schema.
CREATE TABLE IF NOT EXISTS "_honker_notifications" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "channel" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS "_honker_notifications_recent" ON "_honker_notifications"("channel", "id");
CREATE TABLE IF NOT EXISTS "_honker_live" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "queue" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "run_at" INTEGER NOT NULL DEFAULT (unixepoch()),
    "worker_id" TEXT,
    "claim_expires_at" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "created_at" INTEGER NOT NULL DEFAULT (unixepoch()),
    "expires_at" INTEGER
);
CREATE INDEX IF NOT EXISTS "_honker_live_claim" ON "_honker_live"("queue", "priority" DESC, "run_at", "id") WHERE "state" IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS "_honker_live_pending_deadline" ON "_honker_live"("queue", "run_at") WHERE "state" = 'pending';
CREATE INDEX IF NOT EXISTS "_honker_live_processing_deadline" ON "_honker_live"("queue", "claim_expires_at") WHERE "state" = 'processing';
CREATE TABLE IF NOT EXISTS "_honker_dead" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "queue" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "run_at" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" INTEGER NOT NULL DEFAULT (unixepoch()),
    "died_at" INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS "_honker_locks" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "owner" TEXT NOT NULL,
    "expires_at" INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS "_honker_rate_limits" (
    "name" TEXT NOT NULL,
    "window_start" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY ("name", "window_start")
);
CREATE TABLE IF NOT EXISTS "_honker_scheduler_tasks" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "queue" TEXT NOT NULL,
    "cron_expr" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "expires_s" INTEGER,
    "next_fire_at" INTEGER NOT NULL,
    "enabled" INTEGER NOT NULL DEFAULT 1,
    "max_attempts" INTEGER NOT NULL DEFAULT 3
);
CREATE TABLE IF NOT EXISTS "_honker_results" (
    "job_id" INTEGER NOT NULL PRIMARY KEY,
    "value" TEXT,
    "created_at" INTEGER NOT NULL DEFAULT (unixepoch()),
    "expires_at" INTEGER
);
CREATE TABLE IF NOT EXISTS "_honker_stream" (
    "offset" INTEGER PRIMARY KEY AUTOINCREMENT,
    "topic" TEXT NOT NULL,
    "key" TEXT,
    "payload" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS "_honker_stream_topic" ON "_honker_stream"("topic", "offset");
CREATE TABLE IF NOT EXISTS "_honker_stream_consumers" (
    "name" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "offset" INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY ("name", "topic")
);
