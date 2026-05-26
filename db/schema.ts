import { jsonb, pgTable, text, timestamp, uuid, integer, boolean } from "drizzle-orm/pg-core";
import type { ReportPayload, ReportSourceData } from "./types";

export const reports = pgTable("reports", {
  ticker: text("ticker").primaryKey(),
  payload: jsonb("payload").$type<ReportPayload>().notNull(),
  sourceData: jsonb("source_data").$type<ReportSourceData>().notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  status: text("status").notNull(),
  version: integer("version").notNull().default(1),
});

export const generationJobs = pgTable("generation_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticker: text("ticker").notNull(),
  ipHash: text("ip_hash"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  durationMs: integer("duration_ms"),
  cacheHit: boolean("cache_hit").notNull().default(false),
  outcome: text("outcome").notNull(),
  errorMessage: text("error_message"),
});

export const config = pgTable("config", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});
