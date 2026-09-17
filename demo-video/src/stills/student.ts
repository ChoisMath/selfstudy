import { lineAt } from "../student/timing";
import { PHONE_CROP } from "../components/phone";
import { BROWSER } from "../theme";

export type Crop = { x: number; y: number; w: number; h: number };
export type GuideStill = { composition: string; file: string; frame: number; crop?: Crop; resize?: number };
export const DEFAULT_CROP: Crop = { x: BROWSER.x, y: BROWSER.y, w: BROWSER.w, h: BROWSER.h };

export const STILLS: GuideStill[] = [
  // 브리프는 4,0.6 이었으나 그 줄에서는 이미 로그인이 끝나 참여일정 화면이고("로그인 상태가 유지됩니다" 알림은 폰 크롭 밖),
  // 로그인 단계 그림으로 쓸 수 없다. 이름·학번이 다 입력되고 두 칸에 강조 테두리가 남아 있는 2,0.9 를 쓴다.
  { composition: "Student-Login", file: "01-login", frame: lineAt("Login", 2, 0.9), crop: PHONE_CROP, resize: 640 },
  { composition: "Student-Schedule", file: "02-schedule", frame: lineAt("Schedule", 2, 0.7), crop: PHONE_CROP, resize: 640 },
  { composition: "Student-StudyHours", file: "03-hours", frame: lineAt("StudyHours", 1, 0.7), crop: PHONE_CROP, resize: 640 },
  { composition: "Student-Seat", file: "04-seat", frame: lineAt("Seat", 2, 0.6), crop: PHONE_CROP, resize: 640 },
  { composition: "Student-AbsenceApply", file: "05-absence-form", frame: lineAt("AbsenceApply", 6, 0.6), crop: PHONE_CROP, resize: 640 },
  { composition: "Student-Record", file: "06-record", frame: lineAt("Record", 1, 0.7), crop: PHONE_CROP, resize: 640 },
  { composition: "Student-AbsenceList", file: "07-absence-list", frame: lineAt("AbsenceList", 1, 0.7), crop: PHONE_CROP, resize: 640 },
  { composition: "Student-Batch", file: "08-batch", frame: lineAt("Batch", 4, 0.6), crop: PHONE_CROP, resize: 640 },
];
