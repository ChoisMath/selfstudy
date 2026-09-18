import { lineAt } from "../grade-admin/timing";
import { BROWSER } from "../theme";

export type Crop = { x: number; y: number; w: number; h: number };
export type GuideStill = { composition: string; file: string; frame: number; crop?: Crop; resize?: number };
export const DEFAULT_CROP: Crop = { x: BROWSER.x, y: BROWSER.y, w: BROWSER.w, h: BROWSER.h };

export const STILLS: GuideStill[] = [
  { composition: "GradeAdmin-SeatsTour", file: "01-editor", frame: lineAt("SeatsTour", 1, 0.7) },
  { composition: "GradeAdmin-ClassroomConfig", file: "02-classroom", frame: lineAt("ClassroomConfig", 3, 0.7) },
  { composition: "GradeAdmin-SeatAssign", file: "03-assign", frame: lineAt("SeatAssign", 3, 0.7) },
  { composition: "GradeAdmin-SeatEdit", file: "04-edit", frame: lineAt("SeatEdit", 2, 0.6) },
  { composition: "GradeAdmin-SeatPrint", file: "05-print", frame: lineAt("SeatPrint", 1, 0.7) },
];
