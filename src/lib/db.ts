import pg from "pg";

import { ENVIRONMENT_KEYS } from "@/src/lib/constants";
import { logger } from "@/src/lib/logger";

const { Pool } = pg;

type DatabaseStatus = "connected" | "disabled" | "error";

let pool: pg.Pool | null = null;
let disabledLogged = false;
let lastStatus: DatabaseStatus | null = null;

function databaseUrl(): string | null {
  const value = process.env[ENVIRONMENT_KEYS.databaseUrl]?.trim();
  if (!value) {
    if (!disabledLogged) {
      logger.info("Persistent incident memory disabled; DATABASE_URL is not configured.");
      disabledLogged = true;
    }
    lastStatus = "disabled";
    return null;
  }
  return value;
}

function shouldUseSsl(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    const hostname = url.hostname.toLowerCase();
    return hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "::1";
  } catch {
    return true;
  }
}

export function getDatabasePool(): pg.Pool | null {
  const connectionString = databaseUrl();
  if (!connectionString) return null;

  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 3_000,
      allowExitOnIdle: true,
      ...(shouldUseSsl(connectionString)
        ? { ssl: { rejectUnauthorized: false } }
        : {}),
    });

    pool.on("error", (error) => {
      lastStatus = "error";
      logger.warn("PostgreSQL pool emitted an error", { error: error.message });
    });
  }

  return pool;
}

export function isPersistentDatabaseConfigured(): boolean {
  return Boolean(process.env[ENVIRONMENT_KEYS.databaseUrl]?.trim());
}

export async function checkDatabaseStatus(): Promise<DatabaseStatus> {
  const db = getDatabasePool();
  if (!db) return "disabled";

  try {
    await db.query("SELECT 1");
    lastStatus = "connected";
    return "connected";
  } catch (error) {
    lastStatus = "error";
    logger.warn("PostgreSQL health check failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return "error";
  }
}

export function getLastDatabaseStatus(): DatabaseStatus {
  if (!isPersistentDatabaseConfigured()) return "disabled";
  return lastStatus ?? "connected";
}
