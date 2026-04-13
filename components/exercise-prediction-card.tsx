"use client";

import { Button, Card } from "@/components/ui";
import { apiRequest } from "@/lib/client-api";
import type { ExercisePrediction } from "@/lib/types";
import { RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

function formatPrediction(prediction: ExercisePrediction) {
  if (
    prediction.predicted_weight === null ||
    prediction.predicted_reps === null
  ) {
    return null;
  }

  return `${prediction.predicted_weight} kg × ${prediction.predicted_reps} reps`;
}

function descriptionForPrediction(prediction: ExercisePrediction | null) {
  if (!prediction) {
    return "Forecasting the next useful working set from your history.";
  }

  if (prediction.status === "unavailable") {
    return "Prediction is temporarily unavailable.";
  }

  if (prediction.data_confidence === "high") {
    return "Based on your history.";
  }

  return "Early recommendation while your history is still growing.";
}

export function ExercisePredictionCard({
  exerciseName,
}: {
  exerciseName: string;
}) {
  const [prediction, setPrediction] = useState<ExercisePrediction | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadPrediction() {
    if (!exerciseName.trim()) {
      setPrediction(null);
      return;
    }

    setLoading(true);

    try {
      const payload = await apiRequest<ExercisePrediction>("/api/ml/predict", {
        method: "POST",
        body: JSON.stringify({
          exerciseName,
        }),
      });

      setPrediction(payload);
    } catch {
      setPrediction({
        status: "unavailable",
        predicted_weight: null,
        predicted_reps: null,
        basis: "service_unavailable",
        model_version: null,
        history_points_used: 0,
        data_confidence: "low",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPrediction();
  }, [exerciseName]);

  const summary = prediction ? formatPrediction(prediction) : null;

  return (
    <Card className="border-zinc-200 bg-zinc-50/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-zinc-500" />
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              Next set forecast
            </p>
          </div>
          <p className="font-display text-lg font-semibold tracking-tight text-zinc-950">
            {loading ? "Refreshing..." : summary ?? "Prediction temporarily unavailable"}
          </p>
          <p className="text-sm text-zinc-500">{descriptionForPrediction(prediction)}</p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="rounded-full px-3"
          onClick={() => void loadPrediction()}
          disabled={loading || !exerciseName.trim()}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
    </Card>
  );
}
