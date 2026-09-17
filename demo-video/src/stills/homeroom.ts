import { lineAt } from "../teacher/timing";
import { BROWSER } from "../theme";

export type Crop = { x: number; y: number; w: number; h: number };
export type GuideStill = { composition: string; file: string; frame: number; crop?: Crop; resize?: number };
export const DEFAULT_CROP: Crop = { x: BROWSER.x, y: BROWSER.y, w: BROWSER.w, h: BROWSER.h };

export const STILLS: GuideStill[] = [
  { composition: "Teacher-HomeroomTour", file: "01-tabs", frame: lineAt("HomeroomTour", 2, 0.8) },
  { composition: "Teacher-HomeroomWeekly", file: "02-weekly", frame: lineAt("HomeroomWeekly", 2, 0.7) },
  { composition: "Teacher-HomeroomMonthly", file: "03-monthly", frame: lineAt("HomeroomMonthly", 1, 0.7) },
  { composition: "Teacher-HomeroomParticipation", file: "04-participation", frame: lineAt("HomeroomParticipation", 4, 0.6) },
  { composition: "Teacher-AbsenceReason", file: "05-absence-reason", frame: lineAt("AbsenceReason", 2, 0.9) },
  { composition: "Teacher-HomeroomRequests", file: "06-requests", frame: lineAt("HomeroomRequests", 1, 0.8) },
  { composition: "Teacher-Password", file: "07-password", frame: lineAt("Password", 2, 0.6) },
];
