import type { SceneDef } from "../scenes";
import { sceneFrames } from "./timing";
import { IntroScene } from "./scenes/IntroScene";
import { LoginScene } from "./scenes/LoginScene";
import { TourScene } from "./scenes/TourScene";
import { ScheduleScene } from "./scenes/ScheduleScene";
import { StudyHoursScene } from "./scenes/StudyHoursScene";
import { SeatScene } from "./scenes/SeatScene";
import { AbsenceApplyScene } from "./scenes/AbsenceApplyScene";
import { RecordScene } from "./scenes/RecordScene";
import { AbsenceListScene } from "./scenes/AbsenceListScene";
import { BatchScene } from "./scenes/BatchScene";
import { OutroScene } from "./scenes/OutroScene";

export const STUDENT_SCENES: SceneDef[] = [
  { id: "Intro", component: IntroScene, durationInFrames: sceneFrames("Intro") },
  { id: "Login", component: LoginScene, durationInFrames: sceneFrames("Login") },
  { id: "Tour", component: TourScene, durationInFrames: sceneFrames("Tour") },
  { id: "Schedule", component: ScheduleScene, durationInFrames: sceneFrames("Schedule") },
  { id: "StudyHours", component: StudyHoursScene, durationInFrames: sceneFrames("StudyHours") },
  { id: "Seat", component: SeatScene, durationInFrames: sceneFrames("Seat") },
  { id: "AbsenceApply", component: AbsenceApplyScene, durationInFrames: sceneFrames("AbsenceApply") },
  { id: "Record", component: RecordScene, durationInFrames: sceneFrames("Record") },
  { id: "AbsenceList", component: AbsenceListScene, durationInFrames: sceneFrames("AbsenceList") },
  { id: "Batch", component: BatchScene, durationInFrames: sceneFrames("Batch") },
  { id: "Outro", component: OutroScene, durationInFrames: sceneFrames("Outro") },
];
