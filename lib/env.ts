import "server-only";

type ServerEnv = {
  DATABASE_URL: string;
  APP_URL: string;
  SESSION_COOKIE_NAME: string;
  SESSION_SECRET: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_FROM: string;
  SMTP_ALLOW_SELF_SIGNED: boolean;
  ML_SERVICE_URL: string;
};

let cachedEnv: ServerEnv | null = null;

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const smtpPort = Number(process.env.SMTP_PORT ?? "25");

  if (!Number.isFinite(smtpPort) || smtpPort <= 0) {
    throw new Error("SMTP_PORT must be a positive number.");
  }

  cachedEnv = {
    DATABASE_URL: requireEnv("DATABASE_URL"),
    APP_URL: requireEnv("APP_URL").replace(/\/+$/, ""),
    SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME ?? "gympulse_session",
    SESSION_SECRET: requireEnv("SESSION_SECRET"),
    SMTP_HOST: process.env.SMTP_HOST ?? "127.0.0.1",
    SMTP_PORT: smtpPort,
    SMTP_FROM: process.env.SMTP_FROM ?? "noreply@gympulse.space",
    SMTP_ALLOW_SELF_SIGNED:
      process.env.SMTP_ALLOW_SELF_SIGNED === undefined
        ? ["127.0.0.1", "localhost"].includes(process.env.SMTP_HOST ?? "127.0.0.1")
        : process.env.SMTP_ALLOW_SELF_SIGNED === "true",
    ML_SERVICE_URL: (process.env.ML_SERVICE_URL ?? "http://127.0.0.1:8001").replace(/\/+$/, ""),
  };

  return cachedEnv;
}
