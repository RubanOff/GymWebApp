export type DemoSetSeed = {
  reps: number;
  weight: number;
  rpe?: number | null;
};

export type DemoExerciseSeed = {
  exercise_name: string;
  notes?: string | null;
  sets: DemoSetSeed[];
};

export type DemoWorkoutSeed = {
  title: string;
  daysAgo: number;
  notes?: string | null;
  exercises: DemoExerciseSeed[];
};

export type DemoTemplateExerciseSeed = {
  exercise_name: string;
  default_sets: number;
  default_reps: number;
};

export type DemoTemplateSeed = {
  title: string;
  exercises: DemoTemplateExerciseSeed[];
};

export const demoWorkoutSeeds: DemoWorkoutSeed[] = [
  {
    title: "Push A",
    daysAgo: 6,
    notes: "Demo session seeded locally for quick progress testing.",
    exercises: [
      {
        exercise_name: "Bench Press",
        notes: "Pause on the chest.",
        sets: [
          { reps: 8, weight: 75, rpe: 7.5 },
          { reps: 6, weight: 80, rpe: 8 },
          { reps: 4, weight: 82.5, rpe: 8.5 },
        ],
      },
      {
        exercise_name: "Overhead Press",
        sets: [
          { reps: 8, weight: 37.5, rpe: 7 },
          { reps: 8, weight: 40, rpe: 7.5 },
          { reps: 6, weight: 42.5, rpe: 8 },
        ],
      },
      {
        exercise_name: "Incline Dumbbell Press",
        sets: [
          { reps: 10, weight: 24, rpe: 7 },
          { reps: 10, weight: 24, rpe: 7.5 },
        ],
      },
    ],
  },
  {
    title: "Lower",
    daysAgo: 3,
    notes: "Simple lower-body day for volume tracking.",
    exercises: [
      {
        exercise_name: "Back Squat",
        notes: "Keep the bar path vertical.",
        sets: [
          { reps: 5, weight: 100, rpe: 7.5 },
          { reps: 5, weight: 105, rpe: 8 },
          { reps: 3, weight: 110, rpe: 8.5 },
        ],
      },
      {
        exercise_name: "Romanian Deadlift",
        sets: [
          { reps: 8, weight: 90, rpe: 7 },
          { reps: 8, weight: 95, rpe: 7.5 },
          { reps: 6, weight: 100, rpe: 8 },
        ],
      },
      {
        exercise_name: "Walking Lunge",
        sets: [
          { reps: 12, weight: 20, rpe: 7 },
          { reps: 12, weight: 20, rpe: 7 },
        ],
      },
    ],
  },
  {
    title: "Push B",
    daysAgo: 1,
    notes: "A second pressing day to give the progress chart data.",
    exercises: [
      {
        exercise_name: "Bench Press",
        notes: "Touch and go today.",
        sets: [
          { reps: 8, weight: 77.5, rpe: 7.5 },
          { reps: 5, weight: 82.5, rpe: 8 },
          { reps: 3, weight: 85, rpe: 8.5 },
        ],
      },
      {
        exercise_name: "Dumbbell Shoulder Press",
        sets: [
          { reps: 10, weight: 18, rpe: 7 },
          { reps: 8, weight: 20, rpe: 7.5 },
        ],
      },
      {
        exercise_name: "Cable Fly",
        sets: [
          { reps: 12, weight: 15, rpe: 7 },
          { reps: 12, weight: 15, rpe: 7 },
        ],
      },
    ],
  },
];

export const demoTemplateSeeds: DemoTemplateSeed[] = [
  {
    title: "Upper Body",
    exercises: [
      {
        exercise_name: "Bench Press",
        default_sets: 3,
        default_reps: 5,
      },
      {
        exercise_name: "Barbell Row",
        default_sets: 3,
        default_reps: 8,
      },
      {
        exercise_name: "Incline Dumbbell Press",
        default_sets: 3,
        default_reps: 10,
      },
    ],
  },
  {
    title: "Lower Body",
    exercises: [
      {
        exercise_name: "Back Squat",
        default_sets: 3,
        default_reps: 5,
      },
      {
        exercise_name: "Romanian Deadlift",
        default_sets: 3,
        default_reps: 8,
      },
      {
        exercise_name: "Calf Raise",
        default_sets: 4,
        default_reps: 12,
      },
    ],
  },
];
