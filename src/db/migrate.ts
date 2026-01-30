import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const defaultUrl = "file:./data/paste.db";
const dbUrl = process.env.DATABASE_URL ?? defaultUrl;

const filePath = dbUrl.startsWith("file:") ? dbUrl.slice(5) : dbUrl;
const resolvedPath = path.isAbsolute(filePath)
  ? filePath
  : path.join(process.cwd(), filePath);

fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

const sqlite = new Database(resolvedPath);
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

sqlite.close();
