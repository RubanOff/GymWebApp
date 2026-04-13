import { z } from "zod";

export function normalizeText(value: FormDataEntryValue | null | undefined) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export function normalizeOptionalText(value: FormDataEntryValue | null | undefined) {
  const text = normalizeText(value);
  return text.length > 0 ? text : null;
}

export function parseOptionalNumber(value: FormDataEntryValue | null | undefined) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseRequiredNumber(value: FormDataEntryValue | null | undefined, fallback = 0) {
  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const authEmailSchema = z.string().trim().email().transform((value) => value.toLowerCase());

export const authPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .max(128, "Password must be at most 128 characters long.");

export const signUpSchema = z.object({
  email: authEmailSchema,
  password: authPasswordSchema,
});

export const signInSchema = z.object({
  email: authEmailSchema,
  password: z.string().min(1, "Password is required."),
});

export const emailOnlySchema = z.object({
  email: authEmailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required."),
  password: authPasswordSchema,
});

export const createWorkoutSchema = z.object({
  title: z.string().trim().min(1).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().trim().max(2_000).nullable(),
});

export const updateWorkoutSchema = createWorkoutSchema;

export const createExerciseSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const updateExerciseSchema = z.object({
  exerciseName: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(2_000).nullable(),
});

export const createSetSchema = z.object({
  reps: z.number().int().min(0).nullable(),
  weight: z.number().min(0).nullable(),
  rpe: z.number().min(0).max(10).nullable(),
});

export const updateSetSchema = createSetSchema;

export const predictExerciseSchema = z.object({
  exerciseName: z.string().trim().min(1).max(120),
  lookback: z.number().int().min(2).max(32).optional(),
});
