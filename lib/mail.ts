import "server-only";

import nodemailer from "nodemailer";
import { getServerEnv } from "@/lib/env";

const transporter = nodemailer.createTransport({
  host: getServerEnv().SMTP_HOST,
  port: getServerEnv().SMTP_PORT,
  secure: false,
  tls: {
    rejectUnauthorized: !getServerEnv().SMTP_ALLOW_SELF_SIGNED,
  },
});

function buildUrl(path: string) {
  return new URL(path, getServerEnv().APP_URL).toString();
}

async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  await transporter.sendMail({
    from: getServerEnv().SMTP_FROM,
    ...options,
  });
}

export async function sendVerificationEmail(to: string, token: string) {
  const url = buildUrl(`/auth/verify-email?token=${encodeURIComponent(token)}`);

  await sendMail({
    to,
    subject: "Confirm your GymPulse account",
    text: `Confirm your account by opening this link: ${url}`,
    html: `<p>Confirm your account by opening this link:</p><p><a href="${url}">${url}</a></p>`,
  });
}

export async function sendMagicLinkEmail(to: string, token: string) {
  const url = buildUrl(`/auth/magic-login?token=${encodeURIComponent(token)}`);

  await sendMail({
    to,
    subject: "Your GymPulse magic link",
    text: `Use this link to sign in: ${url}`,
    html: `<p>Use this link to sign in:</p><p><a href="${url}">${url}</a></p>`,
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = buildUrl(`/reset-password?token=${encodeURIComponent(token)}`);

  await sendMail({
    to,
    subject: "Reset your GymPulse password",
    text: `Reset your password here: ${url}`,
    html: `<p>Reset your password here:</p><p><a href="${url}">${url}</a></p>`,
  });
}
