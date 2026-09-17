import type { SceneDef } from "../scenes";
import { sceneFrames } from "./timing";
import { IntroScene } from "./scenes/IntroScene";
import { LoginScene } from "./scenes/LoginScene";
import { AttendanceTourScene } from "./scenes/AttendanceTourScene";
import { SeatTapScene } from "./scenes/SeatTapScene";
import { CopySessionScene } from "./scenes/CopySessionScene";
import { SeatColorsScene } from "./scenes/SeatColorsScene";
import { LongPressScene } from "./scenes/LongPressScene";
import { WeeklyInfoScene } from "./scenes/WeeklyInfoScene";
import { AbsenceTabScene } from "./scenes/AbsenceTabScene";
import { BulkApproveScene } from "./scenes/BulkApproveScene";
import { SwapEntryScene } from "./scenes/SwapEntryScene";
import { SwapModalScene } from "./scenes/SwapModalScene";
import { SwapTotalsScene } from "./scenes/SwapTotalsScene";
import { HomeroomTourScene } from "./scenes/HomeroomTourScene";
import { HomeroomWeeklyScene } from "./scenes/HomeroomWeeklyScene";
import { HomeroomMonthlyScene } from "./scenes/HomeroomMonthlyScene";
import { HomeroomParticipationScene } from "./scenes/HomeroomParticipationScene";
import { AbsenceReasonScene } from "./scenes/AbsenceReasonScene";
import { HomeroomRequestsScene } from "./scenes/HomeroomRequestsScene";
import { PasswordScene } from "./scenes/PasswordScene";
import { OutroScene } from "./scenes/OutroScene";

export const TEACHER_SCENES: SceneDef[] = [
  { id: "Intro", component: IntroScene, durationInFrames: sceneFrames("Intro") },
  { id: "Login", component: LoginScene, durationInFrames: sceneFrames("Login") },
  { id: "AttendanceTour", component: AttendanceTourScene, durationInFrames: sceneFrames("AttendanceTour") },
  { id: "SeatTap", component: SeatTapScene, durationInFrames: sceneFrames("SeatTap") },
  { id: "CopySession", component: CopySessionScene, durationInFrames: sceneFrames("CopySession") },
  { id: "SeatColors", component: SeatColorsScene, durationInFrames: sceneFrames("SeatColors") },
  { id: "LongPress", component: LongPressScene, durationInFrames: sceneFrames("LongPress") },
  { id: "WeeklyInfo", component: WeeklyInfoScene, durationInFrames: sceneFrames("WeeklyInfo") },
  { id: "AbsenceTab", component: AbsenceTabScene, durationInFrames: sceneFrames("AbsenceTab") },
  { id: "BulkApprove", component: BulkApproveScene, durationInFrames: sceneFrames("BulkApprove") },
  { id: "SwapEntry", component: SwapEntryScene, durationInFrames: sceneFrames("SwapEntry") },
  { id: "SwapModal", component: SwapModalScene, durationInFrames: sceneFrames("SwapModal") },
  { id: "SwapTotals", component: SwapTotalsScene, durationInFrames: sceneFrames("SwapTotals") },
  { id: "HomeroomTour", component: HomeroomTourScene, durationInFrames: sceneFrames("HomeroomTour") },
  { id: "HomeroomWeekly", component: HomeroomWeeklyScene, durationInFrames: sceneFrames("HomeroomWeekly") },
  { id: "HomeroomMonthly", component: HomeroomMonthlyScene, durationInFrames: sceneFrames("HomeroomMonthly") },
  { id: "HomeroomParticipation", component: HomeroomParticipationScene, durationInFrames: sceneFrames("HomeroomParticipation") },
  { id: "AbsenceReason", component: AbsenceReasonScene, durationInFrames: sceneFrames("AbsenceReason") },
  { id: "HomeroomRequests", component: HomeroomRequestsScene, durationInFrames: sceneFrames("HomeroomRequests") },
  { id: "Password", component: PasswordScene, durationInFrames: sceneFrames("Password") },
  { id: "Outro", component: OutroScene, durationInFrames: sceneFrames("Outro") },
];
