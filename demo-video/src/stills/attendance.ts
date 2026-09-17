import { lineAt } from "../teacher/timing";
import { PHONE_CROP } from "../components/phone";
import { BROWSER } from "../theme";

export type Crop = { x: number; y: number; w: number; h: number };
export type GuideStill = { composition: string; file: string; frame: number; crop?: Crop; resize?: number };
export const DEFAULT_CROP: Crop = { x: BROWSER.x, y: BROWSER.y, w: BROWSER.w, h: BROWSER.h };

export const STILLS: GuideStill[] = [
  { composition: "Teacher-Login", file: "01-login", frame: lineAt("Login", 2, 0.8), crop: PHONE_CROP, resize: 640 },
  { composition: "Teacher-AttendanceTour", file: "02-board", frame: lineAt("AttendanceTour", 3, 0.7), crop: PHONE_CROP, resize: 640 },
  { composition: "Teacher-SeatTap", file: "03-seat-present", frame: lineAt("SeatTap", 1, 0.8), crop: PHONE_CROP, resize: 640 },
  { composition: "Teacher-SeatTap", file: "04-seat-absent", frame: lineAt("SeatTap", 2, 0.8), crop: PHONE_CROP, resize: 640 },
  { composition: "Teacher-CopySession", file: "05-copy", frame: lineAt("CopySession", 2, 0.6), crop: PHONE_CROP, resize: 640 },
  { composition: "Teacher-SeatColors", file: "06-seat-colors", frame: lineAt("SeatColors", 3, 0.7), crop: PHONE_CROP, resize: 640 },
  // 브리프는 2,0.8 이었으나 폴리시 이후 링은 0.2~0.28에 차고 0.55에 체크되어 0.8은 이미 초록(체크됨).
  // "활성화" 라벨(0.5초 누르면 활성화)이 유지되는 구간은 링이 다 찬 0.28부터 체크 0.55 사이 — 그 중간인 0.4를 택해
  // 경계에서 멀리 떨어진 안정된 파란 좌석 프레임을 잡는다.
  { composition: "Teacher-LongPress", file: "07-long-press", frame: lineAt("LongPress", 2, 0.4), crop: PHONE_CROP, resize: 640 },
  { composition: "Teacher-WeeklyInfo", file: "08-weekly-info", frame: lineAt("WeeklyInfo", 2, 0.6), crop: PHONE_CROP, resize: 640 },
  { composition: "Teacher-AbsenceTab", file: "09-absence-tab", frame: lineAt("AbsenceTab", 2, 0.6), crop: PHONE_CROP, resize: 640 },
  { composition: "Teacher-AbsenceTab", file: "10-absence-approved", frame: lineAt("AbsenceTab", 4, 0.7), crop: PHONE_CROP, resize: 640 },
  { composition: "Teacher-BulkApprove", file: "11-bulk-approve", frame: lineAt("BulkApprove", 1, 0.7), crop: PHONE_CROP, resize: 640 },
  { composition: "Teacher-SwapEntry", file: "12-schedule", frame: lineAt("SwapEntry", 2, 0.7) },
  { composition: "Teacher-SwapModal", file: "13-swap-modal", frame: lineAt("SwapModal", 2, 0.9) },
  { composition: "Teacher-SwapTotals", file: "14-swap-totals", frame: lineAt("SwapTotals", 1, 0.6) },
];
