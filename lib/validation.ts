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
