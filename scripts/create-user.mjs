import { randomUUID } from "node:crypto";
import { hash } from "@node-rs/argon2";
import postgres from "postgres";
import { loadEnvFile } from "./lib/load-env.mjs";

loadEnvFile();

function parseArgs(argv) {
  const result = {
    email: process.env.USER_EMAIL ?? "",
    password: process.env.USER_PASSWORD ?? "",
    verified: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--email") {
      result.email = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (value === "--password") {
      result.password = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (value === "--verified") {
      result.verified = true;
    }
  }

  return result;
}

const { email, password, verified } = parseArgs(process.argv.slice(2));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

if (!email || !password) {
  console.error("Usage: npm run create:user -- --email you@example.com --password secret123 [--verified]");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
});

try {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await sql`
    select id
    from users
    where email = ${normalizedEmail}
    limit 1
  `;

  if (existing.length > 0) {
    console.error(`User already exists: ${normalizedEmail}`);
    process.exit(1);
  }

  const passwordHash = await hash(password, {
    algorithm: 2,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  const now = new Date().toISOString();

  await sql`
    insert into users (
      id,
      email,
      password_hash,
      email_verified_at,
      created_at,
      updated_at
    )
    values (
      ${randomUUID()},
      ${normalizedEmail},
      ${passwordHash},
      ${verified ? now : null},
      ${now},
      ${now}
    )
  `;

  console.log(`Created user ${normalizedEmail}${verified ? " (verified)" : ""}`);
} finally {
  await sql.end();
}
