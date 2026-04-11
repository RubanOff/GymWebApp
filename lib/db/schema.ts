import {
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    emailVerifiedAt: timestamp("email_verified_at", {
      withTimezone: true,
      mode: "string",
    }),
    ...timestamps,
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("sessions_token_hash_idx").on(table.tokenHash),
    userIdx: index("sessions_user_id_idx").on(table.userId),
  }),
);

export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("email_verification_tokens_hash_idx").on(table.tokenHash),
    userIdx: index("email_verification_tokens_user_id_idx").on(table.userId),
  }),
);

export const magicLoginTokens = pgTable(
  "magic_login_tokens",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("magic_login_tokens_hash_idx").on(table.tokenHash),
    userIdx: index("magic_login_tokens_user_id_idx").on(table.userId),
  }),
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("password_reset_tokens_hash_idx").on(table.tokenHash),
    userIdx: index("password_reset_tokens_user_id_idx").on(table.userId),
  }),
);

export const workouts = pgTable(
  "workouts",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    date: date("date").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userDateIdx: index("workouts_user_id_date_idx").on(table.userId, table.date, table.createdAt),
  }),
);

export const workoutExercises = pgTable(
  "workout_exercises",
  {
    id: uuid("id").primaryKey(),
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    exerciseName: text("exercise_name").notNull(),
    notes: text("notes"),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    workoutIdx: index("workout_exercises_workout_id_idx").on(table.workoutId, table.orderIndex),
  }),
);

export const sets = pgTable(
  "sets",
  {
    id: uuid("id").primaryKey(),
    workoutExerciseId: uuid("workout_exercise_id")
      .notNull()
      .references(() => workoutExercises.id, { onDelete: "cascade" }),
    reps: integer("reps"),
    weight: numeric("weight", { precision: 8, scale: 2 }),
    rpe: numeric("rpe", { precision: 3, scale: 1 }),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    exerciseIdx: index("sets_workout_exercise_id_idx").on(
      table.workoutExerciseId,
      table.orderIndex,
    ),
  }),
);

export const templates = pgTable(
  "templates",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("templates_user_id_created_at_idx").on(table.userId, table.createdAt),
  }),
);

export const templateExercises = pgTable(
  "template_exercises",
  {
    id: uuid("id").primaryKey(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => templates.id, { onDelete: "cascade" }),
    exerciseName: text("exercise_name").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
    defaultSets: integer("default_sets").notNull().default(3),
    defaultReps: integer("default_reps").notNull().default(8),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    templateIdx: index("template_exercises_template_id_idx").on(
      table.templateId,
      table.orderIndex,
    ),
  }),
);

export type UserRow = typeof users.$inferSelect;
