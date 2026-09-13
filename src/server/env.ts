/**
 * Typed environment access. This is the ONLY module allowed to read
 * `process.env`, so it stays obvious which values are secrets (server-only)
 * and which are safe to expose. Nothing here is ever forwarded to the browser.
 */
import path from "node:path";

function str(name: string, fallback = ""): string {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}
function bool(name: string, fallback = false): boolean {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

const isProduction = process.env.NODE_ENV === "production";

export const env = {
  isProduction,
  isDev: process.env.NODE_ENV !== "production",

  /** Cookie-signing secret. In production a missing secret must fail loudly. */
  sessionSecret: str("SESSION_SECRET", "dev-only-insecure-session-secret-change-me"),

  databasePath: path.resolve(process.cwd(), str("DATABASE_PATH", "./data/app.db")),
  uploadDir: path.resolve(process.cwd(), str("UPLOAD_DIR", "./data/uploads")),

  siteUrl: str("NEXT_PUBLIC_SITE_URL", "http://localhost:3000").replace(/\/$/, ""),

  /** Owner account created by the seeder. */
  adminEmail: str("ADMIN_EMAIL"),
  adminPassword: str("ADMIN_PASSWORD"),
  adminName: str("ADMIN_NAME", "Store Owner"),

  otp: {
    transport: str("OTP_TRANSPORT", "log") as "log" | "webhook" | "off",
    webhookUrl: str("SMS_WEBHOOK_URL"),
    webhookToken: str("SMS_WEBHOOK_TOKEN"),
    /** Only honoured outside production — lets the demo flow be completed. */
    returnCode: !isProduction && bool("AUTH_DEMO_RETURN_OTP", true),
  },

  payments: {
    razorpayKeyId: str("RAZORPAY_KEY_ID"),
    razorpayKeySecret: str("RAZORPAY_KEY_SECRET"),
    get onlineEnabled() {
      return this.razorpayKeyId.length > 0 && this.razorpayKeySecret.length > 0;
    },
  },
};

if (isProduction && env.sessionSecret === "dev-only-insecure-session-secret-change-me") {
  throw new Error("SESSION_SECRET must be set to a strong random value in production.");
}
