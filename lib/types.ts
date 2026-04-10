export type WorkoutSet = {
  id: string;
  reps: number | null;
  weight: number | null;
  rpe: number | null;
  order_index: number;
};

export type WorkoutExercise = {
  id: string;
  exercise_name: string;
  notes: string | null;
  order_index: number;
  sets: WorkoutSet[];
};

export type Workout = {
  id: string;
  title: string;
  date: string;
  notes: string | null;
  created_at: string;
  exercises: WorkoutExercise[];
};

export type TemplateExercise = {
  id: string;
  exercise_name: string;
  order_index: number;
  default_sets: number;
  default_reps: number;
};

export type Template = {
  id: string;
  title: string;
  created_at: string;
  exercises: TemplateExercise[];
};

export type ExerciseProgressPoint = {
  workout_id: string;
  workout_title: string;
  date: string;
  created_at: string;
  weight: number;
  reps: number | null;
  rpe: number | null;
};
