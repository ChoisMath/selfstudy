import type React from "react";
import type { GalleryEntry } from "./types";
import { SupervisorCalendarMock } from "../../grade-admin/mocks/SupervisorCalendarMock";
import { GradeMonthlyMock } from "../../grade-admin/mocks/GradeMonthlyMock";
import { GRADE, MONTHLY_DATES, MONTHLY_ROWS, SUPERVISOR_ASSIGN_EXAMPLE, SUPERVISOR_MONTH } from "../../grade-admin/data";

// GradeAdminShellMock(T2)이 아직 없어 본문 폭을 PC_VIEWPORT.w(1248)로 근사한다 — 셸 완성 후
// GRADE_ADMIN_BODY.w로 교체될 수 있다(컨트롤러 결정: 본문 목업은 셸에 의존하지 않는다).
const WIDTH = 1248;

const SupervisorCalendarStill: React.FC = () => (
  <SupervisorCalendarMock width={WIDTH} month="2026-09" assignments={SUPERVISOR_MONTH} myGrade={GRADE} />
);

// 드롭다운 필터 확인용 — 9/28(우리 학년 배정 예시)을 열고 "윤"을 입력해 "윤서진" 한 명 + 미배정만 남는지 검증한다.
const SupervisorCalendarDropdownStill: React.FC = () => (
  <SupervisorCalendarMock
    width={WIDTH}
    month="2026-09"
    assignments={SUPERVISOR_MONTH}
    myGrade={GRADE}
    openCell={{ date: SUPERVISOR_ASSIGN_EXAMPLE.date, search: { text: "윤" } }}
  />
);

const GradeMonthlyStill: React.FC = () => (
  <GradeMonthlyMock width={WIDTH} dates={MONTHLY_DATES} rows={MONTHLY_ROWS} legendOpen={false} />
);

const GradeMonthlyLegendStill: React.FC = () => (
  <GradeMonthlyMock width={WIDTH} dates={MONTHLY_DATES} rows={MONTHLY_ROWS} legendOpen />
);

export const ENTRIES: GalleryEntry[] = [
  { id: "GradeAdmin-Supervisor", component: SupervisorCalendarStill, width: WIDTH, height: 640 },
  { id: "GradeAdmin-Supervisor-Dropdown", component: SupervisorCalendarDropdownStill, width: WIDTH, height: 640 },
  { id: "GradeAdmin-Monthly", component: GradeMonthlyStill, width: WIDTH, height: 1180 },
  { id: "GradeAdmin-Monthly-Legend", component: GradeMonthlyLegendStill, width: WIDTH, height: 1180 },
];
