import type React from "react";
import type { GalleryEntry } from "./types";
import { HomeroomWeeklyMock } from "../../teacher/mocks/HomeroomWeeklyMock";
import { MonthlyAttendanceMock } from "../MonthlyAttendanceMock";
import { ParticipationTableMock, type ParticipationRow } from "../ParticipationTableMock";
import { HOMEROOM_PARTICIPATION } from "../data";

const WIDTH = 1248;
const HEIGHT = 520;

const participationRows: ParticipationRow[] = Object.entries(HOMEROOM_PARTICIPATION)
  .map(([studentNo, sessions]) => ({ studentNo: Number(studentNo), sessions }))
  .sort((a, b) => a.studentNo - b.studentNo);

const HomeroomWeekly: React.FC = () => <HomeroomWeeklyMock width={WIDTH} height={HEIGHT} />;
const HomeroomMonthly: React.FC = () => (
  <MonthlyAttendanceMock variant="homeroom" width={WIDTH} height={HEIGHT} legendOpen={false} />
);
const HomeroomParticipation: React.FC = () => (
  <ParticipationTableMock variant="homeroom" width={WIDTH} height={HEIGHT} rows={participationRows} />
);

export const ENTRIES: GalleryEntry[] = [
  { id: "HomeroomWeekly", component: HomeroomWeekly, width: WIDTH, height: HEIGHT },
  { id: "HomeroomMonthly", component: HomeroomMonthly, width: WIDTH, height: HEIGHT },
  { id: "HomeroomParticipation", component: HomeroomParticipation, width: WIDTH, height: HEIGHT },
];
