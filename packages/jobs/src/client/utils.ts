/**
 * Shorten a job ID for display. UUIDs (pg-boss / Postgres) are truncated to
 * the first 6 chars; short numeric IDs (honker / SQLite) are shown in full.
 */
export function formatJobId(id: string): string {
  return id.length > 8 ? id.substring(0, 6) : id;
}
