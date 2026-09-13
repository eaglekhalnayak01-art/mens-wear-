#!/usr/bin/env node
/**
 * Set the shop's owner credentials from the terminal, so the password is typed by
 * the owner and never passes through source code, a seed file or a chat log.
 *
 *   npm run admin:set -- --email you@yourshop.in --name "Your Name"
 *
 * The password is asked for on the hidden prompt. If the account does not exist it
 * is created; if it does, its password is replaced and every existing session is
 * revoked, so a stolen cookie dies at the same moment the password changes.
 */
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import readline from "node:readline";
import fs from "node:fs";
import path from "node:path";

const PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 };

function scrypt(plain) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(plain.normalize("NFKC"), salt, PARAMS.keylen, {
    N: PARAMS.N,
    r: PARAMS.r,
    p: PARAMS.p,
    maxmem: 128 * PARAMS.N * PARAMS.r * 2,
  });
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), derived.toString("base64")].join("$");
}

function ask(question, hidden = false) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (!hidden) {
    return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); }));
  }
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onKey = (key) => {
      if (key === "\r" || key === "\n") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onKey);
        rl.close();
        process.stdout.write("\n");
        resolve(value);
      } else if (key === "\u0003") {
        process.stdout.write("\nCancelled.\n");
        process.exit(130);
      } else if (key === "\u007f") {
        value = value.slice(0, -1);
      } else if (!key.includes("\u001b")) {
        value += key;
      }
    };
    stdin.on("data", onKey);
  });
}

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
}

const root = process.cwd();
const dbFile = process.env.DATABASE_PATH ?? path.join(root, "data", "app.db");
if (!fs.existsSync(dbFile)) {
  console.error(`No database at ${dbFile}. Run \`npm run db:setup\` first.`);
  process.exit(1);
}

const email = (flag("--email") ?? process.env.ADMIN_EMAIL ?? (await ask("Owner email: "))).toLowerCase();
const name = flag("--name") ?? process.env.ADMIN_NAME ?? "Owner";
if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
  console.error("That does not look like an email address.");
  process.exit(1);
}

// ADMIN_PASSWORD lets a setup script or a first boot do this without a terminal —
// the value still only ever reaches the database as a scrypt hash.
const fromEnv = Boolean(process.env.ADMIN_PASSWORD);
const first = fromEnv ? process.env.ADMIN_PASSWORD : await ask("New password (min 12 characters, hidden): ", true);
const second = fromEnv ? first : await ask("Type it again: ", true);
if (first.length < 12) {
  console.error("Too short. Use at least 12 characters — a sentence with a space works well.");
  process.exit(1);
}
if (first !== second) {
  console.error("The two entries did not match. Nothing was changed.");
  process.exit(1);
}

const hash = scrypt(first);
const db = new DatabaseSync(dbFile);
db.exec("PRAGMA journal_mode = WAL");

const existing = db.prepare(`SELECT id FROM admin_users WHERE lower(email) = ?`).get(email);
if (existing) {
  db.prepare(
    `UPDATE admin_users
        SET password_hash = ?, failed_attempts = 0, locked_until = NULL, name = COALESCE(NULLIF(?, ''), name)
      WHERE id = ?`,
  ).run(hash, name, existing.id);
  console.log(`Password replaced for ${email}.`);
} else {
  db.prepare(`INSERT INTO admin_users (name, email, password_hash, role) VALUES (?,?,?,'owner')`).run(name, email, hash);
  console.log(`Owner account created for ${email}.`);
}

// Every old session dies, so a copy of the shop left open on another machine stops working.
const revoked = db.prepare(`UPDATE auth_sessions SET revoked_at = ? WHERE subject_type = 'admin' AND revoked_at IS NULL`).run(new Date().toISOString());
console.log(`Signed out ${revoked.changes} admin session(s). Sign in again with the new password.`);
db.close();
