import { lineAt } from "../grade-admin/timing";
import { BROWSER } from "../theme";

export type Crop = { x: number; y: number; w: number; h: number };
export type GuideStill = { composition: string; file: string; frame: number; crop?: Crop; resize?: number };
export const DEFAULT_CROP: Crop = { x: BROWSER.x, y: BROWSER.y, w: BROWSER.w, h: BROWSER.h };

export const STILLS: GuideStill[] = [
  { composition: "GradeAdmin-Enter", file: "01-enter", frame: lineAt("Enter", 1, 0.7) },
  { composition: "GradeAdmin-Today", file: "02-today", frame: lineAt("Today", 1, 0.7) },
  { composition: "GradeAdmin-StudentsList", file: "03-students", frame: lineAt("StudentsList", 1, 0.7) },
  { composition: "GradeAdmin-StudentAdd", file: "04-student-add", frame: lineAt("StudentAdd", 1, 0.8) },
  { composition: "GradeAdmin-StudentExcel", file: "05-excel", frame: lineAt("StudentExcel", 3, 0.6) },
  { composition: "GradeAdmin-Helper", file: "06-helper", frame: lineAt("Helper", 2, 0.6) },
  { composition: "GradeAdmin-Participation", file: "07-participation", frame: lineAt("Participation", 4, 0.6) },
  { composition: "GradeAdmin-SupervisorAssign", file: "08-supervisor", frame: lineAt("SupervisorAssign", 0, 0.7) },
  { composition: "GradeAdmin-Monthly", file: "09-monthly", frame: lineAt("Monthly", 1, 0.7) },
];
