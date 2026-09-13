/**
 * Creates the sqlite file and applies the schema. Idempotent — safe on every
 * boot of `npm run setup`.
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const ROOT = process.cwd();
const file = path.resolve(ROOT, process.env.DATABASE_PATH || "./data/app.db");
const schema = path.join(ROOT, "src", "server", "db", "schema.sql");

fs.mkdirSync(path.dirname(file), { recursive: true });
const db = new DatabaseSync(file);
db.exec("PRAGMA journal_mode = WAL");
db.exec(fs.readFileSync(schema, "utf8"));

const tables = db
  .prepare(`SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name`)
  .all()
  .map((row) => row.name);

console.log(`Database ready at ${path.relative(ROOT, file)}`);
console.log(`${tables.length} tables/views: ${tables.join(", ")}`);
db.close();
