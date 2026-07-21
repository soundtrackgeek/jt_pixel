export function parseWholeNumberDraft(
  value: string,
  minimum: number,
  maximum: number,
) {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

export function normalizeWholeNumberDraft(
  value: string,
  currentValue: number,
  minimum: number,
  maximum: number,
) {
  const trimmed = value.trim();
  if (trimmed === "") return currentValue;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return currentValue;
  return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
}
