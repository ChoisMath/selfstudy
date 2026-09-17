import React from "react";
import { HomeroomShellMock, HOMEROOM_BODY } from "../../teacher/mocks/HomeroomShellMock";
import { SwapModalMock } from "../../teacher/mocks/SwapModalMock";
import { ME, SUPERVISOR_SEPT, SUPERVISOR_SUMMARY, SWAP_EXAMPLE, TODAY } from "../data";
import { PC_VIEWPORT } from "../layout";
import { ScheduleCalendarMock } from "../ScheduleCalendarMock";
import { SupervisorSummaryMock } from "../SupervisorSummaryMock";
import type { GalleryEntry } from "./types";

const ScheduleStill: React.FC = () => (
  <HomeroomShellMock tab="schedule" role="homeroom">
    <ScheduleCalendarMock
      width={HOMEROOM_BODY.w}
      month="2026-09"
      assignments={SUPERVISOR_SEPT}
      highlightTeacher={ME.name}
      today={TODAY}
    />
  </HomeroomShellMock>
);

const SwapModalStill: React.FC = () => (
  <>
    <HomeroomShellMock tab="schedule" role="homeroom">
      <ScheduleCalendarMock
        width={HOMEROOM_BODY.w}
        month="2026-09"
        assignments={SUPERVISOR_SEPT}
        highlightTeacher={ME.name}
        today={TODAY}
      />
    </HomeroomShellMock>
    <SwapModalMock
      date={SWAP_EXAMPLE.date}
      grade={SWAP_EXAMPLE.grade}
      search={{ text: "" }}
      dropdownOpenAt={0}
      reason={{ text: "" }}
    />
  </>
);

const SwapModalOtherGradeStill: React.FC = () => (
  <>
    <HomeroomShellMock tab="schedule" role="homeroom">
      <ScheduleCalendarMock
        width={HOMEROOM_BODY.w}
        month="2026-09"
        assignments={SUPERVISOR_SEPT}
        highlightTeacher={ME.name}
        today={TODAY}
      />
    </HomeroomShellMock>
    <SwapModalMock
      date={SWAP_EXAMPLE.date}
      grade={SWAP_EXAMPLE.grade}
      search={{ text: "" }}
      picked="한도윤"
      pickAt={0}
      otherGrade
      reason={{ text: SWAP_EXAMPLE.reason }}
    />
  </>
);

const SupervisorSummaryStill: React.FC = () => (
  <>
    <HomeroomShellMock tab="schedule" role="homeroom">
      <ScheduleCalendarMock
        width={HOMEROOM_BODY.w}
        month="2026-09"
        assignments={SUPERVISOR_SEPT}
        highlightTeacher={ME.name}
        today={TODAY}
      />
    </HomeroomShellMock>
    <SupervisorSummaryMock months={SUPERVISOR_SUMMARY.months} rows={SUPERVISOR_SUMMARY.rows} me={ME.name} openAt={0} />
  </>
);

const HomeroomShellStill: React.FC = () => (
  <HomeroomShellMock tab="schedule" role="homeroom">
    {null}
  </HomeroomShellMock>
);

export const ENTRIES: GalleryEntry[] = [
  { id: "Schedule", component: ScheduleStill, width: PC_VIEWPORT.w, height: PC_VIEWPORT.h },
  { id: "SwapModal", component: SwapModalStill, width: PC_VIEWPORT.w, height: PC_VIEWPORT.h },
  { id: "SwapModal-OtherGrade", component: SwapModalOtherGradeStill, width: PC_VIEWPORT.w, height: PC_VIEWPORT.h },
  { id: "SupervisorSummary", component: SupervisorSummaryStill, width: PC_VIEWPORT.w, height: PC_VIEWPORT.h },
  { id: "HomeroomShell", component: HomeroomShellStill, width: PC_VIEWPORT.w, height: PC_VIEWPORT.h },
];
