/**
 * honker adapter — the SQLite job queue implementation.
 *
 * Wraps `@russellthehippo/honker-node`, a durable SQLite-backed queue with
 * retries, visibility timeouts, dead-letter rows, and cron scheduling. Selected
 * when `DATABASE_ENGINE=sqlite`.
 *
 * honker is push-driven: workers claim jobs via an async iterator woken by
 * `PRAGMA data_version` changes, so there is no polling loop in app code. Jobs
 * are stored in the `_honker_live` / `_honker_dead` tables inside the same
 * SQLite file as the app data. Because honker's job `id` is an integer and the
 * rest of the package (plus the client dashboard) uses string IDs, IDs are
 * stringified on the way out.
 *
 * The dashboard queries use direct SQL reads against `_honker_live` /
 * `_honker_dead` and map honker's column set into the {@link QueueJob} shape.
 * Fields honker has no analogue for (singleton key, keep-until, policy) are
 * filled with nulls/empty strings to stay shape-compatible with the pg-boss
 * adapter — the dashboard renders them as "—" regardless.
 */
import honkerDefault, {
  type Database as HonkerDb,
  type JsonValue,
  type ClaimWaker,
} from "@russellthehippo/honker-node";
// honker-node ships as CommonJS with no `exports` map, so ESM named value
// imports (e.g. `open`) don't resolve. The default import is the whole module
// object; type-only named imports are erased at runtime and work fine.
const openHonker = honkerDefault.open;
import { resolveSqlitePath } from "@groot/core/database/client";
import { env } from "@groot/core/env";
import { logger } from "@groot/core/logger";
import { defaultJobOptions } from "./config";
import { isValidJobState, VALID_JOB_STATES } from "./constants";
import type {
  JobContext,
  JobQueueAdapter,
  QueueJob,
  ScheduleJobOptions,
  SendJobOptions,
  WorkOptions,
} from "./adapter";
import type { GetJobsOptions } from "./types";

// honker's query() returns Array<Record<string, any>>. These interfaces describe
// the rows we read; we cast through unknown since the runtime shape matches.
interface HonkerJobRow {
  id: number;
  queue: string;
  payload: string | null;
  state: string;
  priority: number;
  run_at: number | null;
  worker_id: string | null;
  claim_expires_at: number | null;
  attempts: number;
  max_attempts: number;
  created_at: number;
  expires_at: number | null;
}

interface HonkerDeadRow {
  id: number;
  queue: string;
  payload: string | null;
  priority: number;
  run_at: number | null;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  created_at: number;
  died_at: number;
}

interface HonkerScheduleRow {
  name: string;
  queue: string;
  cron_expr: string;
  payload: string | null;
  priority: number;
  expires_s: number | null;
  next_fire_at: number;
  enabled: boolean;
  max_attempts: number;
}

/** Map honker's internal state names onto the dashboard's pg-boss vocabulary. */
function mapState(state: string): string {
  switch (state) {
    case "pending":
      return "created";
    case "processing":
      return "active";
    case "done":
      return "completed";
    case "dead":
      return "failed";
    default:
      return state;
  }
}

function parsePayload(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : { value: parsed };
  } catch {
    return { raw };
  }
}

function toIso(unix: number | null): string {
  if (!unix) return "";
  return new Date(unix * 1000).toISOString();
}

function normalizeHonkerJob(row: HonkerJobRow): QueueJob {
  return {
    id: String(row.id),
    name: row.queue,
    data: parsePayload(row.payload),
    state: mapState(row.state),
    priority: row.priority ?? 0,
    retrylimit: row.max_attempts ?? 0,
    retrycount: Math.max(0, (row.attempts ?? 0) - 1),
    retrydelay: 0,
    retrybackoff: false,
    startafter: toIso(row.run_at),
    startedon: row.state === "processing" ? toIso(row.claim_expires_at) : null,
    singletonkey: null,
    singletonon: null,
    expirein: row.expires_at ? toIso(row.expires_at) : "",
    createdon: toIso(row.created_at),
    completedon: row.state === "done" ? toIso(row.created_at) : null,
    keepuntil: "",
    output: null,
    deadletter: null,
  };
}

function normalizeDeadJob(row: HonkerDeadRow): QueueJob {
  return {
    id: String(row.id),
    name: row.queue,
    data: parsePayload(row.payload),
    state: "failed",
    priority: row.priority ?? 0,
    retrylimit: row.max_attempts ?? 0,
    retrycount: Math.max(0, (row.attempts ?? 0) - 1),
    retrydelay: 0,
    retrybackoff: false,
    startafter: toIso(row.run_at),
    startedon: null,
    singletonkey: null,
    singletonon: null,
    expirein: "",
    createdon: toIso(row.created_at),
    completedon: toIso(row.died_at),
    keepuntil: "",
    output: null,
    deadletter: row.last_error ?? null,
  };
}

function rows<T>(res: Array<Record<string, unknown>>): T[] {
  return res as unknown as T[];
}

export class HonkerAdapter implements JobQueueAdapter {
  private db: HonkerDb;
  /** Active claim wakers per queue, for clean shutdown. */
  private activeWakers: ClaimWaker[] = [];
  private abort: AbortController | null = null;

  constructor() {
    // honker manages its own connection to the SQLite file (separate from
    // Prisma's better-sqlite3 handle). Both open the same file; SQLite's
    // locking handles concurrent access from one process.
    const filePath = resolveSqlitePath(env.DATABASE_URL ?? "file:./data/dev.db");
    this.db = openHonker(filePath, { watcherPollIntervalMs: 50 });
  }

  async start(): Promise<void> {
    // honker bootstraps its schema lazily on first queue/scheduler use.
    logger.info("honker job queue initialized (SQLite)");
  }

  async stop(): Promise<void> {
    this.abort?.abort();
    for (const w of this.activeWakers) {
      try {
        w.close();
      } catch {
        /* ignore */
      }
    }
    this.activeWakers = [];
    try {
      this.db.close();
    } catch {
      /* ignore */
    }
  }

  async send(name: string, data: unknown, options?: SendJobOptions): Promise<string> {
    const merged = { ...defaultJobOptions, ...options };
    const queue = this.db.queue(name, {
      visibilityTimeoutS: 30,
      maxAttempts: merged.retryLimit ?? 3,
    });
    const id = queue.enqueue(data as JsonValue, {
      priority: merged.priority,
      delay: merged.delaySeconds,
      expires: merged.expireInSeconds,
    });
    return String(id);
  }

  async schedule(
    name: string,
    data: unknown,
    cron: string,
    _options?: ScheduleJobOptions,
  ): Promise<void> {
    // honker schedules are named; the schedule name IS the job name. The
    // target queue is the same string. `cron` may be a 5-field cron, 6-field
    // cron, or `@every <duration>`.
    this.db.scheduler().add({
      name,
      queue: name,
      schedule: cron,
      payload: data as JsonValue,
      maxAttempts: 3,
    });
  }

  async unschedule(name: string): Promise<void> {
    this.db.scheduler().remove(name);
  }

  async getSchedules() {
    const list = this.db.scheduler().list() as unknown as HonkerScheduleRow[];
    return list.map((r) => ({
      name: r.name,
      cron: r.cron_expr,
      timezone: undefined,
      data: parsePayload(r.payload),
      key: r.name,
    }));
  }

  async createQueue(_name: string): Promise<void> {
    // honker creates queues implicitly on enqueue. Nothing to do.
  }

  async work(
    name: string,
    options: WorkOptions,
    handler: (jobs: JobContext[]) => Promise<void>,
  ): Promise<void> {
    const queue = this.db.queue(name, {
      visibilityTimeoutS: 30,
      maxAttempts: 3,
    });
    const workerId = `${name}-${process.pid}`;
    // Use claimWaker so we can close() it cleanly on shutdown. The waker's
    // next() resolves with a Job on DB updates / due deadlines, or null when
    // aborted/closed.
    this.abort = this.abort ?? new AbortController();
    const waker = queue.claimWaker({ idlePollS: options.pollingIntervalSeconds ?? 5 });
    this.activeWakers.push(waker);

    void (async () => {
      while (!this.abort?.signal.aborted) {
        let job;
        try {
          job = await waker.next(workerId, { signal: this.abort!.signal });
        } catch {
          break; // aborted
        }
        if (!job) break;
        const batch: JobContext[] = [{ id: String(job.id), name, data: job.payload }];
        try {
          await handler(batch);
          job.ack();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          // retry() requeues with a delay; returns false once attempts are
          // exhausted, in which case fail() dead-letters the job.
          const retried = job.retry(options.pollingIntervalSeconds ?? 5, msg);
          if (!retried) {
            try {
              job.fail(msg);
            } catch {
              /* already dead-lettered */
            }
          }
        }
      }
    })();
  }

  async offWork(_name: string): Promise<void> {
    // honker has no per-queue offWork. Claim wakers are closed en masse by
    // stop() during shutdown; mid-run per-queue stop isn't supported.
  }

  // --- Dashboard queries (direct SQL reads against honker's tables) ---

  async getJobById(queueName: string, jobId: string): Promise<QueueJob | null> {
    const live = rows<HonkerJobRow>(
      this.db.query("SELECT * FROM _honker_live WHERE id = ? AND queue = ?", [
        Number(jobId),
        queueName,
      ]),
    );
    if (live[0]) return normalizeHonkerJob(live[0]);
    const dead = rows<HonkerDeadRow>(
      this.db.query("SELECT * FROM _honker_dead WHERE id = ? AND queue = ?", [
        Number(jobId),
        queueName,
      ]),
    );
    return dead[0] ? normalizeDeadJob(dead[0]) : null;
  }

  async getQueueStats(): Promise<Record<string, number>> {
    const live = rows<{ state: string; count: number }>(
      this.db.query("SELECT state, COUNT(*) as count FROM _honker_live GROUP BY state"),
    );
    const deadCount = rows<{ count: number }>(
      this.db.query("SELECT COUNT(*) as count FROM _honker_dead"),
    );
    const stats: Record<string, number> = {};
    for (const s of VALID_JOB_STATES) stats[s] = 0;
    for (const row of live) stats[mapState(row.state)] = Number(row.count);
    stats["failed"] += Number(deadCount[0]?.count ?? 0);
    return stats;
  }

  async getAvailableQueues(): Promise<string[]> {
    const r = rows<{ queue: string }>(this.db.query("SELECT DISTINCT queue FROM _honker_live"));
    return r.map((x) => x.queue).filter((q) => !q.startsWith("_"));
  }

  async fetchJobs(queueName: string, limit: number): Promise<QueueJob[]> {
    const r = rows<HonkerJobRow>(
      this.db.query("SELECT * FROM _honker_live WHERE queue = ? ORDER BY id DESC LIMIT ?", [
        queueName,
        limit,
      ]),
    );
    return r.map(normalizeHonkerJob);
  }

  async getFailedJobs(limit: number): Promise<QueueJob[]> {
    const r = rows<HonkerDeadRow>(
      this.db.query("SELECT * FROM _honker_dead ORDER BY died_at DESC LIMIT ?", [limit]),
    );
    return r.map(normalizeDeadJob);
  }

  async getJobsByState(
    state: string,
    limit: number,
    offset: number,
  ): Promise<{ jobs: QueueJob[]; total: number }> {
    if (!isValidJobState(state)) return { jobs: [], total: 0 };
    if (state === "failed") {
      const total =
        rows<{ count: number }>(this.db.query("SELECT COUNT(*) as count FROM _honker_dead"))[0]
          ?.count ?? 0;
      const dead = rows<HonkerDeadRow>(
        this.db.query("SELECT * FROM _honker_dead ORDER BY died_at DESC LIMIT ? OFFSET ?", [
          limit,
          offset,
        ]),
      );
      return { jobs: dead.map(normalizeDeadJob), total: Number(total) };
    }
    const honkerState = state === "created" ? "pending" : state === "active" ? "processing" : state;
    const total =
      rows<{ count: number }>(
        this.db.query("SELECT COUNT(*) as count FROM _honker_live WHERE state = ?", [honkerState]),
      )[0]?.count ?? 0;
    const r = rows<HonkerJobRow>(
      this.db.query(
        "SELECT * FROM _honker_live WHERE state = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
        [honkerState, limit, offset],
      ),
    );
    return { jobs: r.map(normalizeHonkerJob), total: Number(total) };
  }

  async getJobs(options: GetJobsOptions): Promise<{ jobs: QueueJob[]; total: number }> {
    const { state, name, limit = 50, offset = 0, startDate, endDate } = options;
    if (state === "failed") {
      const deadTotal =
        rows<{ count: number }>(
          this.db.query(
            name
              ? "SELECT COUNT(*) as count FROM _honker_dead WHERE queue = ?"
              : "SELECT COUNT(*) as count FROM _honker_dead",
            name ? [name] : [],
          ),
        )[0]?.count ?? 0;
      const dead = rows<HonkerDeadRow>(
        this.db.query(
          name
            ? "SELECT * FROM _honker_dead WHERE queue = ? ORDER BY died_at DESC LIMIT ? OFFSET ?"
            : "SELECT * FROM _honker_dead ORDER BY died_at DESC LIMIT ? OFFSET ?",
          name ? [name, limit, offset] : [limit, offset],
        ),
      );
      return { jobs: dead.map(normalizeDeadJob), total: Number(deadTotal) };
    }
    const where: string[] = [];
    const params: JsonValue[] = [];
    if (state) {
      const honkerState =
        state === "created" ? "pending" : state === "active" ? "processing" : state;
      where.push("state = ?");
      params.push(honkerState);
    }
    if (name) {
      where.push("queue = ?");
      params.push(name);
    }
    if (startDate) {
      where.push("created_at >= ?");
      params.push(Math.floor(new Date(startDate).getTime() / 1000));
    }
    if (endDate) {
      where.push("created_at <= ?");
      params.push(Math.floor(new Date(endDate).getTime() / 1000));
    }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const total =
      rows<{ count: number }>(
        this.db.query(`SELECT COUNT(*) as count FROM _honker_live ${whereClause}`, params),
      )[0]?.count ?? 0;
    const r = rows<HonkerJobRow>(
      this.db.query(
        `SELECT * FROM _honker_live ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      ),
    );
    return { jobs: r.map(normalizeHonkerJob), total: Number(total) };
  }

  async purgeJobsByState(state: string): Promise<number> {
    if (!isValidJobState(state)) return 0;
    if (state === "failed") {
      const before =
        rows<{ count: number }>(this.db.query("SELECT COUNT(*) as count FROM _honker_dead"))[0]
          ?.count ?? 0;
      this.db.query("DELETE FROM _honker_dead");
      return Number(before);
    }
    const honkerState = state === "created" ? "pending" : state === "active" ? "processing" : state;
    const before =
      rows<{ count: number }>(
        this.db.query("SELECT COUNT(*) as count FROM _honker_live WHERE state = ?", [honkerState]),
      )[0]?.count ?? 0;
    this.db.query("DELETE FROM _honker_live WHERE state = ?", [honkerState]);
    return Number(before);
  }

  async deleteJob(queueName: string, jobId: string): Promise<boolean> {
    this.db.query("DELETE FROM _honker_live WHERE id = ? AND queue = ?", [
      Number(jobId),
      queueName,
    ]);
    this.db.query("DELETE FROM _honker_dead WHERE id = ? AND queue = ?", [
      Number(jobId),
      queueName,
    ]);
    return true;
  }

  async retryJob(queueName: string, jobId: string): Promise<boolean> {
    // Re-enqueue the payload as a fresh job and drop the dead row. This mirrors
    // pg-boss "retry" semantics (a new runnable job) rather than resuming the
    // original row.
    const dead = rows<HonkerDeadRow>(
      this.db.query("SELECT * FROM _honker_dead WHERE id = ? AND queue = ?", [
        Number(jobId),
        queueName,
      ]),
    );
    if (dead[0]) {
      this.db.queue(queueName).enqueue(parsePayload(dead[0].payload) as JsonValue);
      this.db.query("DELETE FROM _honker_dead WHERE id = ?", [Number(jobId)]);
      return true;
    }
    // For live jobs, bump run_at back to now so the worker reclaims.
    this.db.query(
      "UPDATE _honker_live SET run_at = ?, state = 'pending' WHERE id = ? AND queue = ?",
      [Math.floor(Date.now() / 1000), Number(jobId), queueName],
    );
    return true;
  }

  async cancelJob(queueName: string, jobId: string): Promise<boolean> {
    this.db.query("UPDATE _honker_live SET state = 'done' WHERE id = ? AND queue = ?", [
      Number(jobId),
      queueName,
    ]);
    return true;
  }

  async resumeJob(queueName: string, jobId: string): Promise<boolean> {
    this.db.query(
      "UPDATE _honker_live SET state = 'pending', run_at = ? WHERE id = ? AND queue = ?",
      [Math.floor(Date.now() / 1000), Number(jobId), queueName],
    );
    return true;
  }
}
