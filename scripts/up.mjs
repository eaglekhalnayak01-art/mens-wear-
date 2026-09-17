#!/usr/bin/env node
/**
 * One command to bring the shop up on a fresh machine — or after a sandbox reset.
 *
 *   npm run up
 *
 * Everything is idempotent and nothing destructive: it installs dependencies only if
 * they are missing, creates .env.local with a random SESSION_SECRET only if that file
 * does not exist, seeds the database only if data/app.db is absent, then runs the dev
 * server. An existing shop (real data, real settings, real uploads) is left exactly as
 * it is — which matters, because `npm run setup` would otherwise rewrite the demo
 * catalogue and its settings rows.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const dryRun = process.argv.includes("--dry-run");
const has = (p) => fs.existsSync(path.join(root, p));
const steps = [];

function run(cmd, args, why) {
  steps.push(`${why} → ${cmd} ${args.join(" ")}`);
  if (dryRun) return;
  const res = spawnSync(cmd, args, { stdio: "inherit", cwd: root });
  if (res.status !== 0) {
    console.error(`\n "${why}" failed (exit ${res.status}). Fix that, then run npm run up again.\n`);
    process.exit(res.status ?? 1);
  }
}

if (!has("node_modules/next/package.json")) run("npm", ["install", "--no-audit", "--no-fund"], "Installing dependencies");

if (!has(".env.local")) {
  steps.push("Creating .env.local with a fresh SESSION_SECRET");
  if (!dryRun) {
    const secret = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(
      path.join(root, ".env.local"),
      [
        "# Mens Wear — local environment. Git-ignored: never commit this file.",
        "",
        `SESSION_SECRET=${secret}`,
        "DATABASE_PATH=./data/app.db",
        "UPLOAD_DIR=./data/uploads",
        "",
        "# Owner login used by `npm run setup`. The address is not a secret, so it is",
        "# written here; no password ever is. An empty ADMIN_PASSWORD makes the seeder print",
        "# a one-time password once, and `npm run admin:set` is how you choose your own.",
        'ADMIN_NAME="Mens Wear Owner"',
        "ADMIN_EMAIL=admin@menswear.in",
        "ADMIN_PASSWORD=",
        "",
        "# Development only: the OTP API returns the code so you can test sign-in.",
        "AUTH_DEMO_RETURN_OTP=true",
        "OTP_TRANSPORT=log",
        "",
        "NEXT_PUBLIC_SITE_URL=http://localhost:3000",
        "",
      ].join("\n"),
    );
    console.log("\n  Created .env.local — no ADMIN_PASSWORD, so the seeder will print");
    console.log("  a one-time owner password. Change it with: npm run admin:set\n");
  }
}

if (!has("data/app.db")) run("npm", ["run", "setup"], "Building and seeding the database");

console.log(dryRun ? "\nPlanned:\n" : "\nStarting the dev server…\n");
for (const line of steps) console.log(`  • ${line}`);
if (!steps.length) console.log("  • nothing to prepare — environment is already complete");

run("npm", ["run", "dev"], "npm run dev");
