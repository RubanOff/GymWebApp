import "server-only";

import { verify as verifyArgon2, hash as hashArgon2 } from "@node-rs/argon2";
import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import {
  emailVerificationTokens,
  magicLoginTokens,
  passwordResetTokens,
  sessions,
  users,
  type UserRow,
} from "@/lib/db/schema";
import { addDays, addHours, createId, createOpaqueToken, hashToken } from "@/lib/db/tokens";
import { getServerEnv } from "@/lib/env";
import {
  sendMagicLinkEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "@/lib/mail";

const SESSION_TTL_DAYS = 30;
const EMAIL_TOKEN_HOURS = 24;
const MAGIC_LINK_MINUTES = 30;
const RESET_TOKEN_HOURS = 1;

export type AuthUser = {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
};

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "UNAUTHORIZED"
      | "INVALID_CREDENTIALS"
      | "EMAIL_NOT_VERIFIED"
      | "EMAIL_ALREADY_IN_USE"
      | "INVALID_TOKEN"
      | "EXPIRED_TOKEN",
  ) {
    super(message);
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function cookieName() {
  return getServerEnv().SESSION_COOKIE_NAME;
}

function cookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}

function mapUser(user: Pick<UserRow, "id" | "email" | "emailVerifiedAt">): AuthUser {
  return {
    id: user.id,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt,
  };
}

async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(cookieName(), token, cookieOptions(expiresAt));
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName());
}

async function createSession(userId: string) {
  const token = createOpaqueToken();
  const expiresAt = addDays(new Date(), SESSION_TTL_DAYS);

  await db.insert(sessions).values({
    id: createId(),
    userId,
    tokenHash: hashToken(token),
    expiresAt: expiresAt.toISOString(),
  });

  await setSessionCookie(token, expiresAt);
}

async function getSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(cookieName())?.value ?? null;
}

export async function getCurrentUser() {
  const token = await getSessionToken();

  if (!token) {
    return null;
  }

  const result = await db
    .select({
      id: users.id,
      email: users.email,
      emailVerifiedAt: users.emailVerifiedAt,
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date().toISOString())))
    .limit(1);

  const session = result[0];

  if (!session) {
    await clearSessionCookie();
    return null;
  }

  return mapUser(session);
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireApiUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthError("Authentication required.", "UNAUTHORIZED");
  }

  return user;
}

export async function signOut() {
  const token = await getSessionToken();

  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }

  await clearSessionCookie();
}

async function hashPassword(password: string) {
  return hashArgon2(password, {
    algorithm: 2,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}

async function verifyPassword(hash: string, password: string) {
  return verifyArgon2(hash, password);
}

async function findUserByEmail(email: string) {
  const rows = await db.select().from(users).where(eq(users.email, normalizeEmail(email))).limit(1);
  return rows[0] ?? null;
}

async function issueEmailVerification(userId: string, email: string) {
  const token = createOpaqueToken();

  await db.insert(emailVerificationTokens).values({
    id: createId(),
    userId,
    tokenHash: hashToken(token),
    expiresAt: addHours(new Date(), EMAIL_TOKEN_HOURS).toISOString(),
  });

  await sendVerificationEmail(email, token);
}

async function issueMagicLogin(userId: string, email: string) {
  const token = createOpaqueToken();

  await db.insert(magicLoginTokens).values({
    id: createId(),
    userId,
    tokenHash: hashToken(token),
    expiresAt: addHours(new Date(), MAGIC_LINK_MINUTES / 60).toISOString(),
  });

  await sendMagicLinkEmail(email, token);
}

async function issuePasswordReset(userId: string, email: string) {
  const token = createOpaqueToken();

  await db.insert(passwordResetTokens).values({
    id: createId(),
    userId,
    tokenHash: hashToken(token),
    expiresAt: addHours(new Date(), RESET_TOKEN_HOURS).toISOString(),
  });

  await sendPasswordResetEmail(email, token);
}

export async function signUp(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    throw new AuthError("A user with this email already exists.", "EMAIL_ALREADY_IN_USE");
  }

  const passwordHash = await hashPassword(password);
  const userId = createId();

  await db.insert(users).values({
    id: userId,
    email: normalizedEmail,
    passwordHash,
  });

  await issueEmailVerification(userId, normalizedEmail);
}

export async function signIn(email: string, password: string) {
  const user = await findUserByEmail(email);

  if (!user?.passwordHash) {
    throw new AuthError("Invalid email or password.", "INVALID_CREDENTIALS");
  }

  const valid = await verifyPassword(user.passwordHash, password);

  if (!valid) {
    throw new AuthError("Invalid email or password.", "INVALID_CREDENTIALS");
  }

  if (!user.emailVerifiedAt) {
    throw new AuthError("Please confirm your email before signing in.", "EMAIL_NOT_VERIFIED");
  }

  await createSession(user.id);
}

export async function sendMagicLink(email: string) {
  const user = await findUserByEmail(email);

  if (!user) {
    return;
  }

  await issueMagicLogin(user.id, user.email);
}

export async function sendForgotPasswordEmail(email: string) {
  const user = await findUserByEmail(email);

  if (!user) {
    return;
  }

  await issuePasswordReset(user.id, user.email);
}

function isExpired(expiresAt: string) {
  return new Date(expiresAt).getTime() <= Date.now();
}

export async function verifyEmailToken(token: string) {
  const rows = await db
    .select({
      tokenId: emailVerificationTokens.id,
      userId: emailVerificationTokens.userId,
      expiresAt: emailVerificationTokens.expiresAt,
      usedAt: emailVerificationTokens.usedAt,
    })
    .from(emailVerificationTokens)
    .where(eq(emailVerificationTokens.tokenHash, hashToken(token)))
    .limit(1);

  const record = rows[0];

  if (!record) {
    throw new AuthError("Verification link is invalid.", "INVALID_TOKEN");
  }

  if (record.usedAt || isExpired(record.expiresAt)) {
    throw new AuthError("Verification link has expired.", "EXPIRED_TOKEN");
  }

  await db
    .update(emailVerificationTokens)
    .set({ usedAt: new Date().toISOString() })
    .where(eq(emailVerificationTokens.id, record.tokenId));

  await db
    .update(users)
    .set({
      emailVerifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, record.userId));
}

export async function signInWithMagicToken(token: string) {
  const rows = await db
    .select({
      tokenId: magicLoginTokens.id,
      userId: magicLoginTokens.userId,
      expiresAt: magicLoginTokens.expiresAt,
      usedAt: magicLoginTokens.usedAt,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(magicLoginTokens)
    .innerJoin(users, eq(users.id, magicLoginTokens.userId))
    .where(eq(magicLoginTokens.tokenHash, hashToken(token)))
    .limit(1);

  const record = rows[0];

  if (!record) {
    throw new AuthError("Magic link is invalid.", "INVALID_TOKEN");
  }

  if (record.usedAt || isExpired(record.expiresAt)) {
    throw new AuthError("Magic link has expired.", "EXPIRED_TOKEN");
  }

  await db
    .update(magicLoginTokens)
    .set({ usedAt: new Date().toISOString() })
    .where(eq(magicLoginTokens.id, record.tokenId));

  if (!record.emailVerifiedAt) {
    await db
      .update(users)
      .set({
        emailVerifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, record.userId));
  }

  await createSession(record.userId);
}

export async function resetPassword(token: string, newPassword: string) {
  const rows = await db
    .select({
      tokenId: passwordResetTokens.id,
      userId: passwordResetTokens.userId,
      expiresAt: passwordResetTokens.expiresAt,
      usedAt: passwordResetTokens.usedAt,
    })
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, hashToken(token)))
    .limit(1);

  const record = rows[0];

  if (!record) {
    throw new AuthError("Reset link is invalid.", "INVALID_TOKEN");
  }

  if (record.usedAt || isExpired(record.expiresAt)) {
    throw new AuthError("Reset link has expired.", "EXPIRED_TOKEN");
  }

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date().toISOString() })
    .where(eq(passwordResetTokens.id, record.tokenId));

  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(newPassword),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, record.userId));

  await db.delete(sessions).where(eq(sessions.userId, record.userId));
}

export async function getResetTokenStatus(token: string) {
  const rows = await db
    .select({
      expiresAt: passwordResetTokens.expiresAt,
      usedAt: passwordResetTokens.usedAt,
    })
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, hashToken(token)))
    .limit(1);

  const record = rows[0];

  if (!record || record.usedAt || isExpired(record.expiresAt)) {
    return "invalid";
  }

  return "valid";
}

export async function resendVerificationIfNeeded(email: string) {
  const user = await findUserByEmail(email);

  if (!user || user.emailVerifiedAt) {
    return false;
  }

  const activeToken = await db
    .select({ id: emailVerificationTokens.id })
    .from(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.userId, user.id),
        isNull(emailVerificationTokens.usedAt),
        gt(emailVerificationTokens.expiresAt, new Date().toISOString()),
      ),
    )
    .limit(1);

  if (!activeToken[0]) {
    await issueEmailVerification(user.id, user.email);
  }

  return true;
}
