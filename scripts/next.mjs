/**
 * Cross-platform launcher for the Next.js CLI.
 *
 * Exists so we can pass a Node flag (silencing the `node:sqlite` experimental
 * warning) without depending on `cross-env`, and so the server always binds to
 * 0.0.0.0 (works behind a preview proxy or on a phone on the same Wi-Fi).
 *
 * Usage: node scripts/next.mjs dev | build | start
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const [subcommand = "dev", ...extra] = process.argv.slice(2);
const port = process.env.PORT ?? "3000";
const serverArgs =
  subcommand === "dev" || subcommand === "start" ? ["-H", "0.0.0.0", "-p", port] : [];

const child = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", nextBin, subcommand, ...extra, ...serverArgs], {
  stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
