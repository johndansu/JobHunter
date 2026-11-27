import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (see web/.env.example)");

// One pool per process; survive Next.js dev hot reloads.
const g = globalThis as unknown as { __jhSql?: ReturnType<typeof postgres> };
export const client = g.__jhSql ?? postgres(url, { max: 10 });
if (process.env.NODE_ENV !== "production") g.__jhSql = client;

export const db = drizzle(client, { schema });
export { schema };
