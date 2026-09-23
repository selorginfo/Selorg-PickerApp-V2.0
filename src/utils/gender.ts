export const PICKER_GENDERS = ['male', 'female', 'other'] as const;
export type PickerGender = (typeof PICKER_GENDERS)[number];

const ALLOWED = new Set<string>(PICKER_GENDERS);

const LABELS: Record<PickerGender, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

/** Canonical stored gender: Male → male, Female → female, Other → other. */
export function normalizePickerGender(value: unknown): PickerGender | undefined {
  if (value == null) return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;
  const key = raw.toLowerCase();
  if (ALLOWED.has(key)) return key as PickerGender;
  return undefined;
}

export function displayPickerGender(value: unknown): string {
  const next = normalizePickerGender(value);
  return next ? LABELS[next] : '';
}

export const GENDER_OPTIONS: ReadonlyArray<{ label: string; value: PickerGender }> = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];
