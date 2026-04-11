import nodemailer from "nodemailer";
import postgres from "postgres";
import { loadEnvFile } from "./lib/load-env.mjs";

loadEnvFile();

const smtpHost = process.env.SMTP_HOST ?? "127.0.0.1";
const allowSelfSigned =
  process.env.SMTP_ALLOW_SELF_SIGNED === undefined
    ? ["127.0.0.1", "localhost"].includes(smtpHost)
    : process.env.SMTP_ALLOW_SELF_SIGNED === "true";

const requiredEnv = [
  "DATABASE_URL",
  "APP_URL",
  "SESSION_SECRET",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_FROM",
];

const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

let ok = true;

function pass(label, detail) {
  console.log(`PASS ${label}${detail ? `: ${detail}` : ""}`);
}

function fail(label, error) {
  ok = false;
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL ${label}: ${message}`);
}

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
});

try {
  const result = await sql`select current_database() as db, now() as now`;
  pass("database", result[0]?.db ?? "connected");
} catch (error) {
  fail("database", error);
} finally {
  await sql.end().catch(() => {});
}

try {
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    tls: {
      rejectUnauthorized: !allowSelfSigned,
    },
  });

  await transporter.verify();
  pass("smtp", `${smtpHost}:${process.env.SMTP_PORT}`);
} catch (error) {
  fail("smtp", error);
}

try {
  const url = new URL(process.env.APP_URL);
  pass("app_url", url.toString());
} catch (error) {
  fail("app_url", error);
}

if (!ok) {
  process.exit(1);
}

console.log("Doctor finished successfully.");
