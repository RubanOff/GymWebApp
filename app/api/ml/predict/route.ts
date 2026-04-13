import { requireApiUser } from "@/lib/auth";
import { logPredictionRecord } from "@/lib/db/mutations";
import { getServerEnv } from "@/lib/env";
import { jsonError, ok, parseJson } from "@/lib/http";
import { predictExerciseSchema } from "@/lib/validation";
import type { ExercisePrediction } from "@/lib/types";

export const runtime = "nodejs";

function unavailablePrediction(): ExercisePrediction {
  return {
    status: "unavailable",
    predicted_weight: null,
    predicted_reps: null,
    basis: "service_unavailable",
    model_version: null,
    history_points_used: 0,
    data_confidence: "low",
  };
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = await parseJson(request, predictExerciseSchema);

    try {
      const response = await fetch(`${getServerEnv().ML_SERVICE_URL}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          exercise_name: input.exerciseName,
          lookback: input.lookback,
        }),
        cache: "no-store",
      });

      if (!response.ok) {
        return ok(unavailablePrediction());
      }

      const payload = (await response.json()) as ExercisePrediction;

      if (payload.status !== "unavailable") {
        await logPredictionRecord(user.id, {
          exerciseName: input.exerciseName,
          modelVersion: payload.model_version,
          basis: payload.basis,
          dataConfidence: payload.data_confidence,
          historyPointsUsed: payload.history_points_used,
          predictedWeight: payload.predicted_weight,
          predictedReps: payload.predicted_reps,
        });
      }

      return ok(payload);
    } catch {
      return ok(unavailablePrediction());
    }
  } catch (error) {
    return jsonError(error);
  }
}
