import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import {
  AttendanceBoardMock,
  baseVisual,
  buildAfternoonGroups,
  countsOf,
} from "../../app-mocks/AttendanceBoardMock";
import {
  ATTENDANCE_HEADER_H,
  AttendanceHeaderMock,
  attendanceHeaderPoint,
  attendanceHeaderRect,
  type AttendanceHeaderProps,
} from "../../app-mocks/AttendanceHeaderMock";
import { ScheduleCalendarMock, scheduleRect } from "../../app-mocks/ScheduleCalendarMock";
import {
  AFTERNOON1_BASE,
  APP_URL,
  GRADE,
  ME,
  SUPERVISOR_SEPT,
  SWAP_EXAMPLE,
  TEACHERS,
  TODAY,
  TODAY_LABEL,
  type SeatBase,
} from "../../app-mocks/data";
import { PC_VIEWPORT, PcViewport, pcAbs, pcRectAbs, type Rect } from "../../app-mocks/layout";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { FONT } from "../../fonts";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";
import { BROWSER, colors } from "../../theme";
import { HOMEROOM_BODY, HomeroomShellMock, homeroomTabPoint, type HomeroomTab } from "../mocks/HomeroomShellMock";
import { HomeroomWeeklyMock } from "../mocks/HomeroomWeeklyMock";
import { lineAt, lineEnd, lineStart, sceneFrames } from "../timing";

const ID = "SwapEntry";

export const TAB_TITLE = "포산고 자율학습";

export const ATTENDANCE_PC_HEADER: AttendanceHeaderProps = { width: PC_VIEWPORT.w, role: "homeroom", name: ME.name, showHelp: true };

// BulkApprove 이후 상태: 오늘 오후1 신청(1번 109, 2번 302)은 승인, 남은 대기 신청은 9/18 한 건.
const APPROVED_TODAY = [109, 302];
const AFTER_BULK_BASE: Record<number, SeatBase> = Object.fromEntries(
  Object.entries(AFTERNOON1_BASE).map(([id, base]) => [
    id,
    APPROVED_TODAY.includes(Number(id)) ? { ...base, approvedAbsence: true, pendingRequest: false } : base,
  ]),
);
const PC_GROUPS = buildAfternoonGroups((id) => baseVisual(id, AFTER_BULK_BASE));

export const AttendancePcPage: React.FC<{ chipPressAt?: number }> = ({ chipPressAt }) => (
  <AttendanceBoardMock
    width={PC_VIEWPORT.w}
    height={PC_VIEWPORT.h}
    header={{ ...ATTENDANCE_PC_HEADER, pressKey: "homeroom", pressAt: chipPressAt }}
    dateLabel={TODAY_LABEL}
    supervisor={SUPERVISOR_SEPT[TODAY][GRADE]}
    grade={GRADE}
    counts={countsOf(PC_GROUPS)}
    tab="afternoon1"
    pendingBadge={1}
    groups={PC_GROUPS}
  />
);

// 칸 padding-top 3px 은 scheduleRect 에 빠져 있다. 오늘 칸은 날짜가 20px 줄 대신 18px 원이라 2px 위에 그려진다.
const CALENDAR_ROW_NUDGE = 3;
const TODAY_CIRCLE_NUDGE = -2;
const CALENDAR_DATE_ROW_H = 20;

export const SchedulePage: React.FC<{
  assignments?: typeof SUPERVISOR_SEPT;
  rowPressAt?: { date: string; grade: 1 | 2 | 3; at: number };
  totalsPressAt?: number;
  changedCell?: { date: string; grade: 1 | 2 | 3; from: number };
}> = ({ assignments = SUPERVISOR_SEPT, rowPressAt, totalsPressAt, changedCell }) => (
  <div style={{ position: "absolute", inset: 0 }}>
    <ScheduleCalendarMock
      width={HOMEROOM_BODY.w}
      month="2026-09"
      assignments={assignments}
      highlightTeacher={ME.name}
      today={TODAY}
      rowPressAt={rowPressAt}
      totalsPressAt={totalsPressAt}
      changedCell={changedCell}
    />
  </div>
);

// 셸 본문(HOMEROOM_BODY) 안 좌표 → 뷰포트 좌표
export const bodyRect = (r: Rect): Rect => ({ ...r, x: r.x + HOMEROOM_BODY.x, y: r.y + HOMEROOM_BODY.y });

export const calendarRowRect = (date: string, grade: 1 | 2 | 3): Rect => {
  const r = scheduleRect(`row_${date}_${grade}`, HOMEROOM_BODY.w);
  return bodyRect({ ...r, y: r.y + CALENDAR_ROW_NUDGE + (date === TODAY ? TODAY_CIRCLE_NUDGE : 0) });
};

// 날짜 숫자 + 학년 세 줄
export const calendarDayRect = (date: string): Rect => {
  const first = calendarRowRect(date, 1);
  return { x: first.x, y: first.y - CALENDAR_DATE_ROW_H, w: first.w, h: CALENDAR_DATE_ROW_H + first.h * 3 };
};

// 범례 줄의 노란 칸 + "내 배정"
export const calendarLegendRect = (): Rect => {
  const swatch = scheduleRect("legend", HOMEROOM_BODY.w);
  return bodyRect({ x: swatch.x, y: swatch.y, w: 62, h: 24 });
};

export const padRect = (r: { x: number; y: number; width: number; height: number }, pad: number) => ({
  x: r.x - pad,
  y: r.y - pad,
  width: r.width + pad * 2,
  height: r.height + pad * 2,
});

// 담임이 아닌 선생님 경로 — 같은 자리에 "감독일정" 칩이 있는 헤더 오른쪽을 잘라 보여 준다.
const SUPERVISOR_HEADER: AttendanceHeaderProps = { width: PC_VIEWPORT.w, role: "supervisor", name: TEACHERS[1].name, showHelp: true };
const SUP_CHIP = attendanceHeaderRect("schedule", SUPERVISOR_HEADER);
const INSET_CROP_X = SUP_CHIP.x - 24;
const INSET_SCALE = 1.5;
const INSET_PAD = 18;
const INSET_TITLE_H = 40;
const INSET_W = (PC_VIEWPORT.w - INSET_CROP_X) * INSET_SCALE + INSET_PAD * 2;
const INSET_H = INSET_TITLE_H + ATTENDANCE_HEADER_H * INSET_SCALE + INSET_PAD * 2;
const INSET_X = BROWSER.x + BROWSER.w - 40 - INSET_W;
const INSET_Y = BROWSER.y + BROWSER.chrome + ATTENDANCE_HEADER_H * 1.25 + 90;
const insetChip = {
  x: INSET_X + INSET_PAD + (SUP_CHIP.x - INSET_CROP_X) * INSET_SCALE,
  y: INSET_Y + INSET_PAD + INSET_TITLE_H + SUP_CHIP.y * INSET_SCALE,
  width: SUP_CHIP.w * INSET_SCALE,
  height: SUP_CHIP.h * INSET_SCALE,
};

const insetIn = lineAt(ID, 1, 0.02);
const insetChipClick = lineAt(ID, 1, 0.25);
const insetOut = lineAt(ID, 1, 0.42);
const homeroomChipFrom = lineAt(ID, 1, 0.46);
const homeroomChipClick = lineAt(ID, 1, 0.6);
const shellAt = homeroomChipClick + 8;
const scheduleTabFrom = shellAt + 14;
const scheduleTabClick = lineAt(ID, 1, 0.86);
const calendarAt = scheduleTabClick + 6;
const gradesFrom = lineAt(ID, 2, 0.06);
const mineFrom = lineAt(ID, 2, 0.45);

const PAGE_FADE = 6;

const SupervisorInset: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = tween(frame, [insetIn, insetIn + 10], [0, 1]) * tween(frame, [insetOut, insetOut + 6], [1, 0]);
  const lift = tween(frame, [insetIn, insetIn + 12], [16, 0]);
  if (opacity <= 0) {
    return null;
  }
  return (
    <div
      style={{
        position: "absolute",
        left: INSET_X,
        top: INSET_Y,
        width: INSET_W,
        height: INSET_H,
        opacity,
        translate: `0px ${lift}px`,
        background: colors.white,
        borderRadius: 16,
        boxShadow: "0 18px 44px rgba(15,23,42,0.22), 0 0 0 1px rgba(15,23,42,0.08)",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: INSET_PAD,
          top: INSET_PAD,
          height: INSET_TITLE_H,
          display: "flex",
          alignItems: "center",
          fontSize: 22,
          fontWeight: 700,
          color: colors.gray700,
          whiteSpace: "nowrap",
        }}
      >
        담임이 아닌 선생님의 출석부 화면
      </div>
      <div
        style={{
          position: "absolute",
          left: INSET_PAD,
          top: INSET_PAD + INSET_TITLE_H,
          width: (PC_VIEWPORT.w - INSET_CROP_X) * INSET_SCALE,
          height: ATTENDANCE_HEADER_H * INSET_SCALE,
          overflow: "hidden",
          borderRadius: 8,
          boxShadow: `0 0 0 1px ${colors.gray200}`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -INSET_CROP_X * INSET_SCALE,
            top: 0,
            width: PC_VIEWPORT.w,
            transform: `scale(${INSET_SCALE})`,
            transformOrigin: "top left",
          }}
        >
          <AttendanceHeaderMock {...SUPERVISOR_HEADER} pressKey="schedule" pressAt={insetChipClick} />
        </div>
      </div>
    </div>
  );
};

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const tab: HomeroomTab = frame >= calendarAt ? "schedule" : "students";
  const url = frame >= calendarAt ? `${APP_URL}/homeroom/schedule` : frame >= shellAt ? `${APP_URL}/homeroom` : `${APP_URL}/attendance/1`;
  return (
    <BrowserFrame url={url} tabTitle={TAB_TITLE}>
      <PcViewport>
        {frame < shellAt + PAGE_FADE ? (
          <div style={{ position: "absolute", inset: 0, isolation: "isolate" }}>
            <AttendancePcPage chipPressAt={homeroomChipClick} />
          </div>
        ) : null}
        {frame >= shellAt ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 1, opacity: tween(frame, [shellAt, shellAt + PAGE_FADE], [0, 1]) }}>
            <HomeroomShellMock tab={tab} role="homeroom" showHelp tabPressAt={{ tab: "schedule", at: scheduleTabClick }}>
              {frame >= calendarAt ? (
                <div style={{ position: "absolute", inset: 0, opacity: tween(frame, [calendarAt, calendarAt + PAGE_FADE], [0, 1]) }}>
                  <SchedulePage />
                </div>
              ) : (
                <HomeroomWeeklyMock width={HOMEROOM_BODY.w} height={HOMEROOM_BODY.h} />
              )}
            </HomeroomShellMock>
          </div>
        ) : null}
      </PcViewport>
    </BrowserFrame>
  );
};

export const SwapEntryScene: React.FC<DemoProps> = () => {
  const homeroomChip = pcRectAbs(attendanceHeaderRect("homeroom", ATTENDANCE_PC_HEADER));
  const homeroomChipPoint = pcAbs(attendanceHeaderPoint("homeroom", ATTENDANCE_PC_HEADER));
  const scheduleTab = homeroomTabPoint("schedule", "homeroom");
  const scheduleTabPoint = pcAbs(scheduleTab);
  const scheduleTabBox = pcRectAbs({ x: scheduleTab.x - 40, y: 0, w: 80, h: HOMEROOM_BODY.y });
  const insetChipPoint = { x: insetChip.x + insetChip.width * 0.7, y: insetChip.y + insetChip.height * 0.7 };

  const dayRowsBox = pcRectAbs(calendarDayRect("2026-09-16"));
  const todayRow = pcRectAbs(calendarRowRect(TODAY, 1));
  const swapRow = pcRectAbs(calendarRowRect(SWAP_EXAMPLE.date, 1));
  const legendBox = pcRectAbs(calendarLegendRect());
  const endFrame = sceneFrames(ID);

  return (
    <GuideScene id={ID} step={10} label="감독일정">
      <Stage />
      <SupervisorInset />
      <Annotation
        from={insetIn + 10}
        durationInFrames={insetOut - insetIn - 10}
        {...padRect(insetChip, 6)}
        color={colors.red600}
      />
      <Annotation
        from={homeroomChipFrom}
        durationInFrames={shellAt - homeroomChipFrom}
        {...padRect(homeroomChip, 6)}
        label="담임 선생님"
        labelPosition="left"
      />
      <Annotation
        from={scheduleTabFrom}
        durationInFrames={calendarAt + 12 - scheduleTabFrom}
        {...padRect(scheduleTabBox, 2)}
        label="감독일정 탭"
        labelPosition="bottom"
      />
      <Annotation
        from={gradesFrom}
        durationInFrames={endFrame - gradesFrom}
        {...padRect(dayRowsBox, 3)}
        label="1·2·3학년 감독교사"
        labelPosition="top"
        color={colors.blue600}
      />
      <Annotation
        from={mineFrom}
        durationInFrames={endFrame - mineFrom}
        {...padRect(todayRow, 5)}
        color={colors.red600}
      />
      <Annotation
        from={mineFrom}
        durationInFrames={endFrame - mineFrom}
        {...padRect(swapRow, 5)}
        label="노란 줄 = 내가 배정된 날"
        labelPosition="bottom"
        color={colors.red600}
      />
      <Annotation
        from={mineFrom + 6}
        durationInFrames={endFrame - mineFrom - 6}
        {...padRect(legendBox, 4)}
        color={colors.red600}
      />
      <Cursor
        path={[
          { frame: lineStart(ID, 0) + 20, x: 1600, y: 760 },
          { frame: lineEnd(ID, 0), x: 1640, y: 700 },
          { frame: insetChipClick - 10, x: insetChipPoint.x, y: insetChipPoint.y },
          { frame: insetOut, x: insetChipPoint.x, y: insetChipPoint.y },
          { frame: homeroomChipClick - 8, x: homeroomChipPoint.x, y: homeroomChipPoint.y },
          { frame: scheduleTabFrom, x: homeroomChipPoint.x, y: homeroomChipPoint.y },
          { frame: scheduleTabClick - 8, x: scheduleTabPoint.x, y: scheduleTabPoint.y },
          { frame: lineStart(ID, 2), x: scheduleTabPoint.x + 120, y: scheduleTabPoint.y + 160 },
        ]}
        clicks={[insetChipClick, homeroomChipClick, scheduleTabClick]}
        hideAfter={lineStart(ID, 2)}
      />
    </GuideScene>
  );
};
