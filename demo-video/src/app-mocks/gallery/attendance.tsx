import React from "react";
import {
  AttendanceBoardMock,
  baseVisual,
  buildAfternoonGroups,
  buildNightGroups,
  countsOf,
  type AttendanceBoardProps,
  type SeatState,
} from "../AttendanceBoardMock";
import { AttendanceHeaderMock } from "../AttendanceHeaderMock";
import {
  ABSENCE_REQUESTS,
  AFTERNOON1_BASE,
  GRADE,
  HOMEROOM_PARTICIPATION,
  ME,
  studentById,
  SUPERVISOR_SEPT,
  TEACHERS,
  TODAY,
  TODAY_LABEL,
  type SeatBase,
} from "../data";
import { PC_VIEWPORT, PHONE_BODY } from "../layout";
import type { GalleryEntry } from "./types";

const AFTERNOON1_PRESENT = [101, 103, 105, 106, 108, 110, 112];
const AFTERNOON1_ABSENT = [102];

const afternoon1Visual = (id: number): SeatState => {
  const base = baseVisual(id);
  if (base.visual !== "unchecked") return base;
  if (AFTERNOON1_PRESENT.includes(id)) return { ...base, visual: "present" };
  if (AFTERNOON1_ABSENT.includes(id)) return { ...base, visual: "absent" };
  return base;
};

// 1-2반 야간 참여 여부는 담임 참여설정 데이터를 따른다. 1반 앞 번호 몇 명만 출석 체크된 상태.
const nightVisual = (id: number): SeatState => {
  const s = studentById(id);
  if (s.classNumber === ME.homeroom.classNumber && !HOMEROOM_PARTICIPATION[s.number].night.participating) {
    return { visual: "inactive" };
  }
  return { visual: s.classNumber === 1 && s.number <= 6 ? "present" : "unchecked" };
};

const boardProps = (
  overrides: Partial<AttendanceBoardProps> & Pick<AttendanceBoardProps, "tab" | "groups">,
): AttendanceBoardProps => ({
  width: PHONE_BODY.w,
  height: PHONE_BODY.h,
  header: { width: PHONE_BODY.w, role: "homeroom", name: ME.name, showHelp: true },
  dateLabel: TODAY_LABEL,
  supervisor: SUPERVISOR_SEPT[TODAY][GRADE],
  grade: GRADE,
  counts: countsOf(overrides.groups),
  pendingBadge: ABSENCE_REQUESTS.filter((r) => r.status === "pending").length,
  ...overrides,
});

const BoardAfternoon1: React.FC = () => (
  <AttendanceBoardMock {...boardProps({ tab: "afternoon1", groups: buildAfternoonGroups(afternoon1Visual) })} />
);

// 불참승인·신청 표시는 교시별(앱 /api/attendance 가 sessionType 으로 조회) — 오후2 는 ABSENCE_REQUESTS 에서 다시 고른다.
const requestIdsFor = (status: "approved" | "pending") =>
  ABSENCE_REQUESTS.filter((r) => r.date === TODAY && r.session === "afternoon2" && r.status === status).map(
    (r) => r.studentId,
  );

const AFTERNOON2_BASE: Record<number, SeatBase> = Object.fromEntries(
  Object.entries(AFTERNOON1_BASE).map(([id, base]) => [
    id,
    {
      ...base,
      approvedAbsence: requestIdsFor("approved").includes(Number(id)),
      pendingRequest: requestIdsFor("pending").includes(Number(id)),
    },
  ]),
);

const BoardAfternoon2: React.FC = () => (
  <AttendanceBoardMock
    {...boardProps({
      tab: "afternoon2",
      groups: buildAfternoonGroups((id) => baseVisual(id, AFTERNOON2_BASE)),
      copyButton: { visible: true },
    })}
  />
);

const BoardNight: React.FC = () => (
  <AttendanceBoardMock {...boardProps({ tab: "night", groups: buildNightGroups(nightVisual) })} />
);

const HEADER_PC_H = 64;

const HeaderPc: React.FC = () => (
  <div style={{ width: PC_VIEWPORT.w, height: HEADER_PC_H, background: "#f1f5f9" }}>
    <AttendanceHeaderMock width={PC_VIEWPORT.w} role="supervisor" name={TEACHERS[1].name} showHelp />
  </div>
);

export const ENTRIES: GalleryEntry[] = [
  { id: "Board-Afternoon1", component: BoardAfternoon1, width: PHONE_BODY.w, height: PHONE_BODY.h },
  { id: "Board-Afternoon2", component: BoardAfternoon2, width: PHONE_BODY.w, height: PHONE_BODY.h },
  { id: "Board-Night", component: BoardNight, width: PHONE_BODY.w, height: PHONE_BODY.h },
  { id: "Header-PC", component: HeaderPc, width: PC_VIEWPORT.w, height: HEADER_PC_H },
];
