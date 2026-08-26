export const REASON_TYPES = ["academy", "afterschool", "illness", "custom"] as const;
export type ReasonType = (typeof REASON_TYPES)[number];

export const REASON_LABELS: Record<ReasonType, string> = {
  academy: "학원",
  afterschool: "방과후",
  illness: "질병",
  custom: "기타",
};

export function reasonLabel(type: string): string {
  return (REASON_LABELS as Record<string, string>)[type] ?? type;
}
