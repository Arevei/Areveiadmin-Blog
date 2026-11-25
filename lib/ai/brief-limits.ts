/**
 * Character limits for the AI writer brief. Shared by the form (live counters)
 * and the API validator, so both always agree.
 */
export const BRIEF_LIMITS = {
  topic: 500,
  primaryKeyword: 150,
  secondaryKeywords: 800,
  audience: 600,
  tone: 600,
  notes: 6000,
} as const;

export const BRIEF_TOPIC_MIN = 8;

export type BriefField = keyof typeof BRIEF_LIMITS;

export const BRIEF_LABELS: Record<BriefField, string> = {
  topic: "Topic",
  primaryKeyword: "Primary keyword",
  secondaryKeywords: "Secondary keywords",
  audience: "Audience",
  tone: "Tone",
  notes: "Facts, sources and angles",
};

export function tooLongMessage(field: BriefField, length: number) {
  const max = BRIEF_LIMITS[field];
  return `${BRIEF_LABELS[field]} is too long: ${length.toLocaleString("en-US")} of ${max.toLocaleString("en-US")} characters. Remove ${(length - max).toLocaleString("en-US")}.`;
}
