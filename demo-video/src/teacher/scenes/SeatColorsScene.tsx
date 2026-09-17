import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import { Annotation } from "../../components/Annotation";
import { Cursor } from "../../components/Cursor";
import { PhoneFrame } from "../../components/PhoneFrame";
import { PHONE_CROP, PHONE_X, PHONE_Y, phoneAbs, phoneLeftLabelGap, phoneRectAbs } from "../../components/phone";
import { FONT } from "../../fonts";
import { colors, WIDTH } from "../../theme";
import { GuideScene } from "../../guide/GuideScene";
import {
  AttendanceBoardMock,
  baseVisual,
  boardMaxScrollY,
  boardPoint,
  boardRect,
  buildAfternoonGroups,
  countsOf,
  groupRect,
  seatRect,
  type AttendanceBoardProps,
  type BoardTab,
  type SeatState,
} from "../../app-mocks/AttendanceBoardMock";
import { SeatCellMock, seatMetrics } from "../../app-mocks/SeatCellMock";
import {
  ABSENCE_REQUESTS,
  AFTERNOON1_BASE,
  APP_HOST,
  GRADE,
  ME,
  SUPERVISOR_SEPT,
  TODAY,
  TODAY_LABEL,
} from "../../app-mocks/data";
import { PHONE_BODY, type Point, type Rect } from "../../app-mocks/layout";
import { lineAt, lineEnd } from "../timing";
import { afternoon1Visual as afternoon1ResultVisual } from "./CopySessionScene";
import type { DemoProps } from "../../props";

// ── SeatColors·LongPress·WeeklyInfo·AbsenceTab·BulkApprove 가 함께 쓰는 폰 출석부 도우미 ──

export type SeatOverrides = Record<number, SeatState>;

// CopySession 이 끝난 오후1(AFTERNOON1_RESULT 로 체크 완료) 그대로. 뒤 장면은 앞 장면에서 바뀐 좌석만 덮어쓴다.
export const afternoon1Visual =
  (overrides: SeatOverrides = {}) =>
  (studentId: number): SeatState =>
    overrides[studentId] ?? afternoon1ResultVisual(studentId);

// 앱 카운트는 참여 학생만 센다 — 꾹 눌러 체크한 비참여 좌석이 초록이 되어도 숫자는 그대로다.
export const afternoon1Counts = (visualFor: (studentId: number) => SeatState) =>
  countsOf(
    buildAfternoonGroups((id) => (AFTERNOON1_BASE[id].participating ? visualFor(id) : { visual: "inactive" })),
  );

export const BOARD_URL = `${APP_HOST}/attendance/${GRADE}`;

export const PENDING_COUNT = ABSENCE_REQUESTS.filter((r) => r.status === "pending").length;

export const phoneBoardProps = (
  overrides: Partial<AttendanceBoardProps> & Pick<AttendanceBoardProps, "tab" | "groups" | "counts">,
): AttendanceBoardProps => ({
  width: PHONE_BODY.w,
  height: PHONE_BODY.h,
  header: { width: PHONE_BODY.w, role: "homeroom", name: ME.name, showHelp: true },
  dateLabel: TODAY_LABEL,
  supervisor: SUPERVISOR_SEPT[TODAY][GRADE],
  grade: GRADE,
  pendingBadge: PENDING_COUNT,
  ...overrides,
});

const TAB_COUNT = 4;
const TAB_GAP = 4;
const TAB_PAD_TOP = 8;

// 탭의 보이는 모양(pt-2 아래 둥근 칸). 목업은 탭 중심만 내보내므로 탭 줄 폭에서 나눠 구한다.
export const boardTabRect = (tab: BoardTab, props: AttendanceBoardProps): Rect => {
  const center = boardPoint(`tab_${tab}`, props);
  const tabs = boardRect("tabs", props);
  const w = (tabs.w - TAB_GAP * (TAB_COUNT - 1)) / TAB_COUNT;
  return { x: center.x - w / 2, y: tabs.y + TAB_PAD_TOP, w, h: tabs.h - TAB_PAD_TOP };
};

// 좌석 오른쪽 위 "i" 버튼(top-0.5 right-0.5).
export const seatInfoRect = (studentId: number, props: AttendanceBoardProps): Rect => {
  const seat = seatRect(studentId, props);
  const size = seatMetrics(props.width).infoSize;
  return { x: seat.x + seat.w - 2 - size, y: seat.y + 2, w: size, h: size };
};

export const between = (from: number, to: number) => ({ from, durationInFrames: to - from });

export const phoneBox = (r: Rect, pad: number) => {
  const a = phoneRectAbs(r);
  return { x: a.x - pad, y: a.y - pad, width: a.width + pad * 2, height: a.height + pad * 2 };
};

// 가이드 스틸은 폰만 잘라 쓰므로 왼쪽 라벨이 폰 밖에서 끝나게 한다.
export const leftLabeled = (r: Rect, pad: number) => {
  const b = phoneBox(r, pad);
  return { ...b, labelPosition: "left" as const, labelGap: phoneLeftLabelGap(b.x) };
};

// 폰 오른쪽 끝 요소(배지·반려 버튼)는 라벨을 폰 오른쪽 밖에 둔다.
export const rightLabeled = (r: Rect, pad: number) => {
  const b = phoneBox(r, pad);
  return { ...b, labelPosition: "right" as const, labelGap: PHONE_CROP.x + PHONE_CROP.w + 4 - (b.x + b.width) };
};

export const phoneCenter = (r: Rect) => phoneAbs({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

// 손가락으로 누르듯 누를 때만 커서가 잠깐 나타난다(가이드 스틸에 커서가 남지 않게). holdTo 까지 누른 채 머문다.
export const PhoneTap: React.FC<{ at: number; target: Point; holdTo?: number }> = ({ at, target, holdTo = at }) => (
  <Cursor
    path={[
      { frame: at - 14, x: target.x + 40, y: target.y + 48 },
      { frame: at - 3, x: target.x, y: target.y },
    ]}
    clicks={[at]}
    hideAfter={holdTo + 8}
  />
);

const ZOOM = 3;
const ZOOM_CARD_GAP = 44;
const ZOOM_CARD_PAD = 18;
const ZOOM_ENTER = 12;
const ZOOM_EXIT = 8;

const seatViewOf = (studentId: number, props: AttendanceBoardProps) => {
  const seat = props.groups
    .flatMap((g) => [...(g.classroom?.divisions.flat(2) ?? []), ...(g.rooms ?? []).flatMap((r) => r.rows.flat())])
    .find((s) => s.studentId === studentId);
  if (!seat) throw new Error(`seat not on board: ${studentId}`);
  return seat;
};

// 폰 안 좌석은 42px 남짓이라 영상에서 글자가 읽히지 않는다 — 같은 좌석을 3배로 키운 카드를 폰 왼쪽에 띄운다(영상 장치).
export type ZoomLabel = { at: number; title: string; sub: string; color: string };

export const SeatZoomCard: React.FC<{
  from: number;
  to: number;
  studentId: number;
  propsAt: (frame: number) => AttendanceBoardProps;
  centerY: number;
  // 시간순. 좌석 상태가 바뀌는 순간 설명도 같은 카드 안에서 바꾼다.
  labels: ZoomLabel[];
}> = ({ from, to, studentId, propsAt, centerY, labels }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame > to) return null;
  const { title, sub, color } = [...labels].reverse().find((l) => l.at <= frame) ?? labels[0];
  const shown = tween(frame, [from, from + ZOOM_ENTER], [0, 1]) * tween(frame, [to - ZOOM_EXIT, to], [1, 0]);
  const props = propsAt(frame);
  const seat = seatViewOf(studentId, props);
  const rect = seatRect(studentId, props);
  const areaH = seatMetrics(props.width).labelHeight * ZOOM;
  return (
    <div
      style={{
        position: "absolute",
        right: WIDTH - PHONE_X + ZOOM_CARD_GAP,
        top: centerY - areaH / 2 - ZOOM_CARD_PAD,
        display: "flex",
        alignItems: "center",
        gap: 26,
        padding: `${ZOOM_CARD_PAD}px 30px ${ZOOM_CARD_PAD}px ${ZOOM_CARD_PAD + 6}px`,
        background: "#fff",
        borderRadius: 18,
        border: `3px solid ${color}`,
        boxShadow: "0 20px 50px rgba(15,23,42,0.12)",
        fontFamily: FONT,
        opacity: shown,
        translate: `${(shown - 1) * 20}px 0px`,
      }}
    >
      <div
        style={{
          width: rect.w * ZOOM,
          height: areaH,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <div style={{ transform: `scale(${ZOOM})` }}>
          <SeatCellMock {...seat} width={rect.w} height={rect.h} viewportWidth={props.width} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 30, fontWeight: 800, color, whiteSpace: "nowrap" }}>{title}</span>
        <span style={{ fontSize: 20, fontWeight: 500, color: colors.gray600, whiteSpace: "nowrap" }}>{sub}</span>
      </div>
    </div>
  );
};

// ── SeatColors 장면 ──

const ID = "SeatColors";

const APPROVED_SEAT = 104;
const AFTER_SCHOOL_SEAT = 107;
const PENDING_SEAT = 109;
const INACTIVE_SEAT = 111;

const afterSchoolTap = lineAt(ID, 2, 0.55);
const afterSchoolPresent = afterSchoolTap + 3;
const scrollFrom = lineAt(ID, 5, 0.08);
const scrollTo = scrollFrom + 20;

// 방과후 좌석을 눌러 테두리가 초록으로 바뀌는 모습을 보이려고, 체크가 끝난 오후1 에서 107만 아직 미체크로 둔다.
const visualAt = (frame: number) =>
  afternoon1Visual({
    [AFTER_SCHOOL_SEAT]:
      frame >= afterSchoolPresent
        ? { visual: "afterschool", afterSchoolStatus: "present", pressAt: afterSchoolTap }
        : { ...baseVisual(AFTER_SCHOOL_SEAT), pressAt: afterSchoolTap },
  });

const propsAt = (frame: number, scrollY = 0) => {
  const visualFor = visualAt(frame);
  return phoneBoardProps({
    tab: "afternoon1",
    groups: buildAfternoonGroups(visualFor),
    counts: afternoon1Counts(visualFor),
    scrollY,
  });
};

const settled = propsAt(afterSchoolPresent);
const maxScroll = boardMaxScrollY(settled);
const scrolledProps = propsAt(afterSchoolPresent, maxScroll);

const classCard = groupRect(0, settled);
const approvedSeat = seatRect(APPROVED_SEAT, settled);
const afterSchoolSeat = seatRect(AFTER_SCHOOL_SEAT, settled);
const pendingSeat = seatRect(PENDING_SEAT, settled);
const inactiveSeat = seatRect(INACTIVE_SEAT, settled);
const legend = boardRect("legend", scrolledProps);

const afterSchoolPoint = phoneCenter(afterSchoolSeat);
const swipeStart = phoneAbs({ x: PHONE_BODY.w * 0.72, y: PHONE_BODY.h * 0.75 });

const lines = {
  approved: [lineAt(ID, 1, 0.1), lineEnd(ID, 1)],
  afterSchool: [lineAt(ID, 2, 0.05), lineEnd(ID, 2)],
  pending: [lineAt(ID, 3, 0.1), lineEnd(ID, 3)],
  inactive: [lineAt(ID, 4, 0.1), lineEnd(ID, 4)],
  legend: [scrollTo + 4, lineEnd(ID, 5) + 10],
} as const;

const LEGEND_ZOOM = 1.5;

// 범례 글자(9px)도 영상에서 읽히지 않으므로, 스크롤을 마친 출석부의 범례 부분만 잘라 키워 보인다.
const LegendZoomCard: React.FC = () => {
  const frame = useCurrentFrame();
  const [from, to] = lines.legend;
  if (frame < from || frame > to) return null;
  const shown = tween(frame, [from, from + ZOOM_ENTER], [0, 1]) * tween(frame, [to - ZOOM_EXIT, to], [1, 0]);
  const stripH = legend.h * LEGEND_ZOOM;
  return (
    <div
      style={{
        position: "absolute",
        right: WIDTH - PHONE_X + ZOOM_CARD_GAP,
        top: phoneCenter(legend).y - stripH / 2 - ZOOM_CARD_PAD,
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: `${ZOOM_CARD_PAD}px 24px`,
        background: "#fff",
        borderRadius: 18,
        border: `3px solid ${colors.blue600}`,
        boxShadow: "0 20px 50px rgba(15,23,42,0.12)",
        fontFamily: FONT,
        opacity: shown,
        translate: `${(shown - 1) * 20}px 0px`,
      }}
    >
      <span style={{ fontSize: 30, fontWeight: 800, color: colors.blue600, whiteSpace: "nowrap" }}>범례</span>
      <div style={{ position: "relative", width: legend.w * LEGEND_ZOOM, height: stripH, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transformOrigin: "top left",
            transform: `scale(${LEGEND_ZOOM}) translate(${-legend.x}px, ${-legend.y}px)`,
          }}
        >
          <AttendanceBoardMock {...scrolledProps} />
        </div>
      </div>
    </div>
  );
};

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const scrollY = tween(frame, [scrollFrom, scrollTo], [0, maxScroll]);
  return (
    <PhoneFrame x={PHONE_X} y={PHONE_Y} url={BOARD_URL}>
      <AttendanceBoardMock {...propsAt(frame, scrollY)} />
    </PhoneFrame>
  );
};

const zoom = (studentId: number, window: readonly [number, number], labels: Omit<ZoomLabel, "at">[], switchAt = window[0]) => (
  <SeatZoomCard
    from={window[0]}
    to={window[1]}
    studentId={studentId}
    propsAt={propsAt}
    centerY={phoneCenter(seatRect(studentId, settled)).y}
    labels={labels.map((label, i) => ({ ...label, at: i === 0 ? window[0] : switchAt }))}
  />
);

export const SeatColorsScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={5} label="좌석 색">
    <Stage />

    <Annotation
      {...between(lineAt(ID, 0, 0.2), lineEnd(ID, 0))}
      {...leftLabeled(classCard, 4)}
      label="좌석 색 = 학생 상태"
      color={colors.blue600}
    />

    <Annotation {...between(...lines.approved)} {...phoneBox(approvedSeat, 6)} color={colors.indigo600} />
    {zoom(APPROVED_SEAT, lines.approved, [{ title: "불참승인", sub: "불참신청이 승인된 학생", color: colors.indigo600 }])}

    <Annotation {...between(lines.afterSchool[0], afterSchoolTap)} {...phoneBox(afterSchoolSeat, 6)} color={colors.purple600} />
    <Annotation {...between(afterSchoolTap, lines.afterSchool[1])} {...phoneBox(afterSchoolSeat, 6)} color={colors.green600} />
    {zoom(
      AFTER_SCHOOL_SEAT,
      lines.afterSchool,
      [
        { title: "방과후", sub: "오늘 방과후 수업에 참여하는 학생", color: colors.purple600 },
        { title: "누르면 테두리 색", sub: "초록 테두리 출석 · 빨강 테두리 결석", color: colors.green600 },
      ],
      afterSchoolPresent,
    )}

    <Annotation {...between(...lines.pending)} {...phoneBox(pendingSeat, 6)} color={colors.red600} />
    {zoom(PENDING_SEAT, lines.pending, [{ title: "빨간 * 별표", sub: "아직 승인되지 않은 불참신청", color: colors.red600 }])}

    <Annotation {...between(...lines.inactive)} {...phoneBox(inactiveSeat, 6)} color={colors.gray700} />
    {zoom(INACTIVE_SEAT, lines.inactive, [{ title: "회색 좌석", sub: "참여설정에서 오늘 참여하지 않는 학생", color: colors.gray700 }])}

    <Annotation {...between(...lines.legend)} {...phoneBox(legend, 4)} color={colors.blue600} />
    <LegendZoomCard />

    <PhoneTap at={afterSchoolTap} target={afterSchoolPoint} />
    <Cursor
      path={[
        { frame: scrollFrom - 12, x: swipeStart.x, y: swipeStart.y },
        { frame: scrollFrom, x: swipeStart.x, y: swipeStart.y },
        { frame: scrollTo, x: swipeStart.x, y: swipeStart.y - maxScroll },
      ]}
      hideAfter={scrollTo + 6}
    />
  </GuideScene>
);
