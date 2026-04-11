import nodemailer from "nodemailer";
import { loadEnvFile } from "./lib/load-env.mjs";

loadEnvFile();

function parseArgs(argv) {
  const result = {
    to: process.env.TEST_MAIL_TO ?? "",
    subject: "GymPulse SMTP test",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--to") {
      result.to = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (value === "--subject") {
      result.subject = argv[index + 1] ?? result.subject;
      index += 1;
    }
  }

  return result;
}

const { to, subject } = parseArgs(process.argv.slice(2));

if (!to) {
  console.error("Usage: npm run mail:test -- --to you@example.com");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "127.0.0.1",
  port: Number(process.env.SMTP_PORT ?? "25"),
  secure: false,
});

await transporter.sendMail({
  from: process.env.SMTP_FROM ?? "noreply@gympulse.space",
  to,
  subject,
  text: `GymPulse SMTP test sent at ${new Date().toISOString()}`,
  html: `<p>GymPulse SMTP test sent at <strong>${new Date().toISOString()}</strong></p>`,
});

console.log(`Sent test email to ${to}`);
