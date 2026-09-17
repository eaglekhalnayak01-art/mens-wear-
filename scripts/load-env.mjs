/**
 * Minimal `.env.local` reader for the CLI scripts.
 *
 * Next.js loads the env file for the app, but `npm run db:seed` and
 * `npm run admin:set` run as plain node — without this they would ignore the
 * DATABASE_PATH / ADMIN_* you set in .env.local, and a fresh machine would
 * quietly create a second owner account with a random password.
 *
 * Only real KEY=VALUE lines are read; existing process.env always wins, so an
 * explicit `ADMIN_EMAIL=x npm run db:seed` still overrides the file.
 */
import fs from "node:fs";
import path from "node:path";

function unquote(raw) {
  const value = raw.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value.replace(/\s+#.*$/, "").trim();
}

export function loadLocalEnv(root = process.cwd()) {
  const file = path.join(root, ".env.local");
  if (!fs.existsSync(file)) return {};
  const applied = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    const value = unquote(trimmed.slice(eq + 1));
    if (process.env[key] === undefined) {
      process.env[key] = value;
      applied[key] = value;
    }
  }
  return applied;
}
