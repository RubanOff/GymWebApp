export function formatDate(dateValue: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateValue}T00:00:00`));
}

export function formatShortDate(dateValue: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateValue}T00:00:00`));
}

export function formatWeight(weight: number | null) {
  if (weight === null || Number.isNaN(weight)) {
    return "—";
  }

  return `${stripTrailingZeros(weight)} kg`;
}

export function formatSetSummary(reps: number | null, weight: number | null) {
  const repLabel = reps === null ? "—" : `${reps} reps`;
  const weightLabel = formatWeight(weight);
  return `${repLabel} · ${weightLabel}`;
}

export function formatVolume(weight: number) {
  return `${Math.round(weight).toLocaleString("en-US")} kg`;
}

export function todayInputValue() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

export function daysAgoInputValue(daysAgo: number) {
  const now = new Date();
  const localDate = new Date(
    now.getTime() - now.getTimezoneOffset() * 60_000 - daysAgo * 86_400_000,
  );
  return localDate.toISOString().slice(0, 10);
}

export function parseDbNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function clampOrderIndex(value: number | null | undefined, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return value;
}

export function stripTrailingZeros(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}
