import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getServerEnv } from "@/lib/env";
import * as schema from "@/lib/db/schema";

type Database = ReturnType<typeof drizzle>;

const globalForDb = globalThis as typeof globalThis & {
  __gympulseSql?: ReturnType<typeof postgres>;
  __gympulseDb?: Database;
};

function createDatabase() {
  const sql = postgres(getServerEnv().DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    prepare: false,
  });

  return {
    sql,
    db: drizzle(sql, { schema }),
  };
}

const database = globalForDb.__gympulseDb && globalForDb.__gympulseSql
  ? {
      sql: globalForDb.__gympulseSql,
      db: globalForDb.__gympulseDb,
    }
  : createDatabase();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__gympulseSql = database.sql;
  globalForDb.__gympulseDb = database.db;
}

export const sql = database.sql;
export const db = database.db;
