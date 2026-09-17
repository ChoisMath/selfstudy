import React from "react";
import type { GalleryEntry } from "./types";
import { GradeAdminShellMock, GRADE_ADMIN_BODY } from "../../grade-admin/mocks/GradeAdminShellMock";
import { TodayDashboardMock } from "../../grade-admin/mocks/TodayDashboardMock";
import { AttendanceTopBarMock } from "../../grade-admin/mocks/AttendanceTopBarMock";
import { PC_VIEWPORT } from "../layout";

// AttendanceTopBarMock.tsx 의 HEADER_H 와 동일 — gallery/attendance.tsx 의 HEADER_PC_H 관례와 같이 여기서 다시 정의.
const TOP_BAR_H = 60;

const ShellTodayStill: React.FC = () => (
  <GradeAdminShellMock tab="today" showHelp>
    <TodayDashboardMock width={GRADE_ADMIN_BODY.w} />
  </GradeAdminShellMock>
);

const TopBarStill: React.FC = () => <AttendanceTopBarMock width={PC_VIEWPORT.w} />;

export const ENTRIES: GalleryEntry[] = [
  { id: "GradeAdmin-Shell-Today", component: ShellTodayStill, width: PC_VIEWPORT.w, height: PC_VIEWPORT.h },
  { id: "GradeAdmin-TopBar", component: TopBarStill, width: PC_VIEWPORT.w, height: TOP_BAR_H },
];
