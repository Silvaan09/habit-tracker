export const DEFAULT_NUMERIC_STEP_VALUES = [-1, 1, 10, 25] as const;

export function normalizeNumericStepValues(values: unknown): number[] {
  if (!Array.isArray(values)) {
    return [...DEFAULT_NUMERIC_STEP_VALUES];
  }

  const normalized = values
    .map((value) => (typeof value === 'number' ? value : Number(value)))
    .filter((value) => Number.isFinite(value) && value !== 0)
    .slice(0, DEFAULT_NUMERIC_STEP_VALUES.length);

  while (normalized.length < DEFAULT_NUMERIC_STEP_VALUES.length) {
    normalized.push(DEFAULT_NUMERIC_STEP_VALUES[normalized.length]);
  }

  return normalized.sort((first, second) => first - second);
}

export function serializeNumericStepValues(values: unknown): string {
  return JSON.stringify(normalizeNumericStepValues(values));
}

export function parseNumericStepValues(value: string | null | undefined): number[] {
  if (!value) {
    return [...DEFAULT_NUMERIC_STEP_VALUES];
  }

  try {
    return normalizeNumericStepValues(JSON.parse(value));
  } catch {
    return [...DEFAULT_NUMERIC_STEP_VALUES];
  }
}
