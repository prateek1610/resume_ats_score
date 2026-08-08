import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

let initialization: Promise<unknown> | null = null;

async function ensureSchema(database: D1Database) {
  initialization ??= database.batch([
    database.prepare(`CREATE TABLE IF NOT EXISTS resume_reports (
      id text PRIMARY KEY NOT NULL,
      owner_email text NOT NULL,
      filename text NOT NULL,
      storage_key text,
      content_type text NOT NULL,
      file_size integer NOT NULL,
      mode text NOT NULL,
      job_description text,
      overall_score integer NOT NULL,
      keyword_score integer NOT NULL,
      structure_score integer NOT NULL,
      impact_score integer NOT NULL,
      essentials_score integer NOT NULL,
      matched_keywords text NOT NULL,
      missing_keywords text NOT NULL,
      strengths text NOT NULL,
      recommendations text NOT NULL,
      sections text NOT NULL,
      stats text NOT NULL,
      analysis_details text,
      structured_resume text,
      expires_at integer,
      created_at integer NOT NULL
    )`),
    database.prepare("CREATE INDEX IF NOT EXISTS resume_reports_owner_created_idx ON resume_reports (owner_email, created_at)"),
    database.prepare("CREATE INDEX IF NOT EXISTS resume_reports_expires_idx ON resume_reports (expires_at)"),
    database.prepare(`CREATE TABLE IF NOT EXISTS rate_limit_windows (
      key text PRIMARY KEY NOT NULL,
      scope text NOT NULL,
      window_start integer NOT NULL,
      request_count integer NOT NULL,
      updated_at integer NOT NULL
    )`),
    database.prepare("CREATE INDEX IF NOT EXISTS rate_limit_windows_updated_idx ON rate_limit_windows (updated_at)"),
  ]).catch((error) => {
    initialization = null;
    throw error;
  });
  await initialization;
}

export async function getDb() {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  await ensureSchema(env.DB);
  return drizzle(env.DB, { schema });
}

export async function getDbBinding() {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) throw new Error("Database is unavailable.");
  await ensureSchema(env.DB);
  return env.DB;
}
