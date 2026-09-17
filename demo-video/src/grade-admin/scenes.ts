import type { SceneDef } from "../scenes";
import { sceneFrames } from "./timing";
import { IntroScene } from "./scenes/IntroScene";
import { EnterScene } from "./scenes/EnterScene";
import { TodayScene } from "./scenes/TodayScene";
import { StudentsListScene } from "./scenes/StudentsListScene";
import { StudentAddScene } from "./scenes/StudentAddScene";
import { StudentExcelScene } from "./scenes/StudentExcelScene";
import { HelperScene } from "./scenes/HelperScene";
import { ParticipationScene } from "./scenes/ParticipationScene";
import { ParticipationBulkScene } from "./scenes/ParticipationBulkScene";
import { SeatsTourScene } from "./scenes/SeatsTourScene";
import { ClassroomConfigScene } from "./scenes/ClassroomConfigScene";
import { SeatAssignScene } from "./scenes/SeatAssignScene";
import { SeatEditScene } from "./scenes/SeatEditScene";
import { SeatPrintScene } from "./scenes/SeatPrintScene";
import { SupervisorAssignScene } from "./scenes/SupervisorAssignScene";
import { SupervisorTotalsScene } from "./scenes/SupervisorTotalsScene";
import { MonthlyScene } from "./scenes/MonthlyScene";
import { OutroScene } from "./scenes/OutroScene";

export const GRADE_ADMIN_SCENES: SceneDef[] = [
  { id: "Intro", component: IntroScene, durationInFrames: sceneFrames("Intro") },
  { id: "Enter", component: EnterScene, durationInFrames: sceneFrames("Enter") },
  { id: "Today", component: TodayScene, durationInFrames: sceneFrames("Today") },
  { id: "StudentsList", component: StudentsListScene, durationInFrames: sceneFrames("StudentsList") },
  { id: "StudentAdd", component: StudentAddScene, durationInFrames: sceneFrames("StudentAdd") },
  { id: "StudentExcel", component: StudentExcelScene, durationInFrames: sceneFrames("StudentExcel") },
  { id: "Helper", component: HelperScene, durationInFrames: sceneFrames("Helper") },
  { id: "Participation", component: ParticipationScene, durationInFrames: sceneFrames("Participation") },
  { id: "ParticipationBulk", component: ParticipationBulkScene, durationInFrames: sceneFrames("ParticipationBulk") },
  { id: "SeatsTour", component: SeatsTourScene, durationInFrames: sceneFrames("SeatsTour") },
  { id: "ClassroomConfig", component: ClassroomConfigScene, durationInFrames: sceneFrames("ClassroomConfig") },
  { id: "SeatAssign", component: SeatAssignScene, durationInFrames: sceneFrames("SeatAssign") },
  { id: "SeatEdit", component: SeatEditScene, durationInFrames: sceneFrames("SeatEdit") },
  { id: "SeatPrint", component: SeatPrintScene, durationInFrames: sceneFrames("SeatPrint") },
  { id: "SupervisorAssign", component: SupervisorAssignScene, durationInFrames: sceneFrames("SupervisorAssign") },
  { id: "SupervisorTotals", component: SupervisorTotalsScene, durationInFrames: sceneFrames("SupervisorTotals") },
  { id: "Monthly", component: MonthlyScene, durationInFrames: sceneFrames("Monthly") },
  { id: "Outro", component: OutroScene, durationInFrames: sceneFrames("Outro") },
];
