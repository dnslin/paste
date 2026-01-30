import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const defaultUrl = "file:./data/paste.db";
const dbUrl = process.env.DATABASE_URL ?? defaultUrl;

const filePath = dbUrl.startsWith("file:") ? dbUrl.slice(5) : dbUrl;
const resolvedPath = path.isAbsolute(filePath)
  ? filePath
  : path.join(process.cwd(), filePath);

const sqlite = new Database(resolvedPath);

export const db = drizzle(sqlite, { schema });
