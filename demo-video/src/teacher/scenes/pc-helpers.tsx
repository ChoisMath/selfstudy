// PC 감독일정 장면(SwapEntry·SwapModal·SwapTotals·HomeroomTour) 공용 조각.
import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import {
  AttendanceBoardMock,
  baseVisual,
  buildAfternoonGroups,
  countsOf,
  type AttendanceBoardProps,
  type SeatState,
} from "../../app-mocks/AttendanceBoardMock";
import { type AttendanceHeaderProps } from "../../app-mocks/AttendanceHeaderMock";
import { ScheduleCalendarMock, scheduleRect } from "../../app-mocks/ScheduleCalendarMock";
import {
  AFTERNOON1_BASE,
  AFTERNOON1_RESULT,
  GRADE,
  ME,
  SUPERVISOR_SEPT,
  SWAP_EXAMPLE,
  TODAY,
  TODAY_LABEL,
  type SeatBase,
} from "../../app-mocks/data";
import { PC_VIEWPORT, PcViewport, pcRectAbs, type Point, type Rect } from "../../app-mocks/layout";
import { FONT } from "../../fonts";
import { colors, FPS } from "../../theme";
import { HOMEROOM_BODY, HomeroomShellMock, type HomeroomTab } from "../mocks/HomeroomShellMock";
import { NARRATION, TRAILING_SILENCE_SECONDS, type TeacherSceneId } from "../narration";
import { lineAt, lineFrames } from "../timing";

export const TAB_TITLE = "포산고 자율학습";

export const ATTENDANCE_PC_HEADER: AttendanceHeaderProps = {
  width: PC_VIEWPORT.w,
  role: "homeroom",
  name: ME.name,
  showHelp: true,
};

// 앞선 폰 장면에서 이어진 오늘 오후1 상태:
//  - 일괄승인(BulkApprove)으로 오늘 오후1 대기 신청 두 건이 불참승인으로 바뀌었다.
//  - 미참가 좌석 하나를 꾹 눌러 활성화한 뒤 출석까지 체크했다(LongPress).
//  - 나머지 좌석은 AFTERNOON1_RESULT 그대로. 방과후 좌석은 테두리 색으로 출석/결석이 보인다.
const APPROVED_TODAY = [109, 302];
const ACTIVATED_TODAY = [111];

const AFTER_BULK_BASE: Record<number, SeatBase> = Object.fromEntries(
  Object.entries(AFTERNOON1_BASE).map(([id, base]) => [
    id,
    APPROVED_TODAY.includes(Number(id)) ? { ...base, approvedAbsence: true, pendingRequest: false } : base,
  ]),
);

const pcSeatState = (studentId: number): SeatState => {
  const base = baseVisual(studentId, AFTER_BULK_BASE);
  const result = AFTERNOON1_RESULT[studentId];
  if (base.visual === "afterschool") {
    return { ...base, afterSchoolStatus: result?.status ?? "unchecked" };
  }
  if (base.visual === "inactive") {
    return ACTIVATED_TODAY.includes(studentId) ? { ...base, visual: "present" } : base;
  }
  if (base.visual === "unchecked" && result) {
    return { ...base, visual: result.status };
  }
  return base;
};

const PC_GROUPS = buildAfternoonGroups(pcSeatState);

export const PC_BOARD_PROPS: AttendanceBoardProps = {
  width: PC_VIEWPORT.w,
  height: PC_VIEWPORT.h,
  header: ATTENDANCE_PC_HEADER,
  dateLabel: TODAY_LABEL,
  supervisor: SUPERVISOR_SEPT[TODAY][GRADE],
  grade: GRADE,
  counts: countsOf(PC_GROUPS),
  tab: "afternoon1",
  pendingBadge: 1,
  groups: PC_GROUPS,
};

export const AttendancePcPage: React.FC<{ chipPressAt?: number }> = ({ chipPressAt }) => (
  <AttendanceBoardMock
    {...PC_BOARD_PROPS}
    header={{ ...ATTENDANCE_PC_HEADER, pressKey: "homeroom", pressAt: chipPressAt }}
  />
);

export const SWAPPED_SEPT: typeof SUPERVISOR_SEPT = {
  ...SUPERVISOR_SEPT,
  [SWAP_EXAMPLE.date]: { ...SUPERVISOR_SEPT[SWAP_EXAMPLE.date], [SWAP_EXAMPLE.grade]: SWAP_EXAMPLE.to },
};

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

export const PAGE_FADE = 6;

// 출석부 → 담임 셸 디졸브. 출석부의 sticky 날짜 바(z 100)가 셸을 뚫고 보이지 않도록 격리해서 그린다.
export const BoardToShell: React.FC<{
  shellAt: number;
  chipPressAt?: number;
  tab: HomeroomTab;
  tabPressAt?: { tab: HomeroomTab; at: number };
  children: React.ReactNode;
}> = ({ shellAt, chipPressAt, tab, tabPressAt, children }) => {
  const frame = useCurrentFrame();
  return (
    <PcViewport>
      {frame < shellAt + PAGE_FADE ? (
        <div style={{ position: "absolute", inset: 0, isolation: "isolate" }}>
          <AttendancePcPage chipPressAt={chipPressAt} />
        </div>
      ) : null}
      {frame >= shellAt ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 1, opacity: tween(frame, [shellAt, shellAt + PAGE_FADE], [0, 1]) }}>
          <HomeroomShellMock tab={tab} role="homeroom" showHelp tabPressAt={tabPressAt}>
            {children}
          </HomeroomShellMock>
        </div>
      ) : null}
    </PcViewport>
  );
};

// 셸 본문(HOMEROOM_BODY) 안 좌표 → 뷰포트 좌표
export const bodyRect = (r: Rect): Rect => ({ ...r, x: r.x + HOMEROOM_BODY.x, y: r.y + HOMEROOM_BODY.y });

const calRect = (key: Parameters<typeof scheduleRect>[0]) => bodyRect(scheduleRect(key, HOMEROOM_BODY.w));

export const calendarRowRect = (date: string, grade: 1 | 2 | 3): Rect => calRect(`row_${date}_${grade}`);
export const calendarCellRect = (date: string): Rect => calRect(`day_${date}`);
export const calendarLegendRect = (): Rect => calRect("legendRow");
export const calendarTotalsRect = (): Rect => calRect("totals");
export const calendarDayHeaderRect = (): Rect => calRect("dayHeader");

// 날짜 숫자 + 학년 세 줄
export const calendarDayRect = (date: string): Rect => {
  const head = calRect(`dateRow_${date}`);
  const last = calendarRowRect(date, 3);
  return { ...head, h: last.y + last.h - head.y };
};

export const padRect = (r: { x: number; y: number; width: number; height: number }, pad: number) => ({
  x: r.x - pad,
  y: r.y - pad,
  width: r.width + pad * 2,
  height: r.height + pad * 2,
});

// 줄 위에 붙는 라벨을 그 주 칸 밖(아래 주의 빈 칸)으로 내보내는 간격 — 이웃 학년 줄을 덮지 않게.
export const labelGapBelowCell = (date: string, grade: 1 | 2 | 3, pad: number) => {
  const row = pcRectAbs(calendarRowRect(date, grade));
  const cell = pcRectAbs(calendarCellRect(date));
  return cell.y + cell.height - (row.y + row.height) - pad;
};

// 문장 안에서 낱말이 나오는 글자 위치로 프레임을 잡는다. 문장 길이에는 말끝 무음이 붙어 있으므로
// 실제로 말이 차지하는 구간으로 환산한 뒤 비율을 적용한다.
export const wordAt = (id: TeacherSceneId, line: number, word: string, at: "start" | "end" = "start") => {
  const text = NARRATION.find((s) => s.id === id)?.lines[line];
  if (!text) throw new Error(`narration missing: ${id} line ${line}`);
  const index = text.indexOf(word);
  if (index < 0) throw new Error(`"${word}" not in ${id} line ${line}`);
  const speech = 1 - (TRAILING_SILENCE_SECONDS * FPS) / lineFrames(id, line);
  return lineAt(id, line, ((at === "end" ? index + word.length : index) / text.length) * speech);
};

export const INSET_PAD = 24;
export const INSET_TITLE_H = 40;
const INSET_FADE_IN = 10;
const INSET_FADE_OUT = 6;

export type InsetCrop = { rect: Rect; scale: number };

export const insetCardSize = ({ rect, scale }: InsetCrop) => ({
  width: rect.w * scale + INSET_PAD * 2,
  height: INSET_TITLE_H + rect.h * scale + INSET_PAD * 2,
});

// 인셋 안에 확대해 그린 목업의 논리 좌표 → 화면 좌표
export const insetAbs = (card: Point, { rect, scale }: InsetCrop, p: Point): Point => ({
  x: card.x + INSET_PAD + (p.x - rect.x) * scale,
  y: card.y + INSET_PAD + INSET_TITLE_H + (p.y - rect.y) * scale,
});

export const insetRectAbs = (card: Point, crop: InsetCrop, r: Rect) => ({
  ...insetAbs(card, crop, r),
  width: r.w * crop.scale,
  height: r.h * crop.scale,
});

export const InsetCard: React.FC<{
  card: Point;
  crop: InsetCrop;
  title: string;
  from: number;
  out: number;
  children: React.ReactNode;
}> = ({ card, crop, title, from, out, children }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame > out + INSET_FADE_OUT) {
    return null;
  }
  const opacity = tween(frame, [from, from + INSET_FADE_IN], [0, 1]) * tween(frame, [out, out + INSET_FADE_OUT], [1, 0]);
  const lift = tween(frame, [from, from + 12], [16, 0]);
  const size = insetCardSize(crop);
  return (
    <div
      style={{
        position: "absolute",
        left: card.x,
        top: card.y,
        width: size.width,
        height: size.height,
        opacity,
        translate: `0px ${lift}px`,
        background: colors.white,
        borderRadius: 16,
        boxShadow: "0 18px 44px rgba(15,23,42,0.24), 0 0 0 1px rgba(15,23,42,0.08)",
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
        {title}
      </div>
      <div
        style={{
          position: "absolute",
          left: INSET_PAD,
          top: INSET_PAD + INSET_TITLE_H,
          width: crop.rect.w * crop.scale,
          height: crop.rect.h * crop.scale,
          overflow: "hidden",
          borderRadius: 8,
          boxShadow: `0 0 0 1px ${colors.gray200}`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -crop.rect.x * crop.scale,
            top: -crop.rect.y * crop.scale,
            width: PC_VIEWPORT.w,
            height: PC_VIEWPORT.h,
            transform: `scale(${crop.scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
