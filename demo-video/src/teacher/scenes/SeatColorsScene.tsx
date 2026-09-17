import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import { Annotation } from "../../components/Annotation";
import { Cursor } from "../../components/Cursor";
import { PhoneFrame } from "../../components/PhoneFrame";
import { PHONE_X, PHONE_Y, phoneAbs } from "../../components/phone";
import { FONT } from "../../fonts";
import { colors } from "../../theme";
import { GuideScene } from "../../guide/GuideScene";
import {
  AttendanceBoardMock,
  baseVisual,
  boardDateBarMaxScrollX,
  boardMaxScrollY,
  boardRect,
  buildAfternoonGroups,
  groupRect,
  seatRect,
} from "../../app-mocks/AttendanceBoardMock";
import { PHONE_BODY } from "../../app-mocks/layout";
import { lineAt, lineEnd } from "../timing";
import {
  BOARD_URL,
  PhoneTap,
  SeatZoomCard,
  ZOOM_CARD_PAD,
  ZOOM_CARD_RIGHT,
  ZOOM_ENTER,
  ZOOM_EXIT,
  afternoon1Counts,
  afternoon1Visual,
  between,
  leftLabeled,
  phoneBoardProps,
  phoneBox,
  phoneCenter,
  rectCenter,
  zoomTextWidth,
  type ZoomLabel,
} from "./phone-helpers";
import type { DemoProps } from "../../props";

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

const boardAt = (frame: number, scrollY = 0, dateBarScrollX = 0) => {
  const visualFor = visualAt(frame);
  return phoneBoardProps({
    tab: "afternoon1",
    groups: buildAfternoonGroups(visualFor),
    counts: afternoon1Counts(visualFor),
    scrollY,
    dateBarScrollX,
  });
};

// 날짜 바가 폰 폭에서 넘쳐 "방과후" 숫자가 잘린다(앱 overflow-x-auto) — 카운트가 다 보이는 만큼만 미리 밀어 둔다.
const BAR_PAD_X = 14;
const DATE_BAR_SCROLL = (() => {
  const props = boardAt(afterSchoolPresent);
  const bar = boardRect("dateBar", props);
  const counts = boardRect("counts", props);
  return Math.min(boardDateBarMaxScrollX(props), Math.max(0, counts.x + counts.w - (bar.x + bar.w - BAR_PAD_X)));
})();

const propsAt = (frame: number, scrollY = 0) => boardAt(frame, scrollY, DATE_BAR_SCROLL);

const settled = propsAt(afterSchoolPresent);
const maxScroll = boardMaxScrollY(settled);
const scrolledProps = propsAt(afterSchoolPresent, maxScroll);

const classCard = groupRect(0, settled);
const approvedSeat = seatRect(APPROVED_SEAT, settled);
const afterSchoolSeat = seatRect(AFTER_SCHOOL_SEAT, settled);
const pendingSeat = seatRect(PENDING_SEAT, settled);
const inactiveSeat = seatRect(INACTIVE_SEAT, settled);
const legend = boardRect("legend", scrolledProps);

const afterSchoolPoint = rectCenter(afterSchoolSeat);
const swipeStart = phoneAbs({ x: PHONE_BODY.w * 0.72, y: PHONE_BODY.h * 0.75 });

// 좌석 사이 간격은 2.3px 뿐이라 상자를 2px 만 띄운다 — 더 띄우면 상자와 글로우가 옆 좌석 이름을 덮는다.
const SEAT_BOX_PAD = 2;

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
        right: ZOOM_CARD_RIGHT,
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
    textWidth={zoomTextWidth(labels)}
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

    <Annotation {...between(...lines.approved)} {...phoneBox(approvedSeat, SEAT_BOX_PAD)} color={colors.indigo600} />
    {zoom(APPROVED_SEAT, lines.approved, [{ title: "불참승인", sub: "불참신청이 승인된 학생", color: colors.indigo600 }])}

    <Annotation {...between(lines.afterSchool[0], afterSchoolTap)} {...phoneBox(afterSchoolSeat, SEAT_BOX_PAD)} color={colors.purple600} />
    <Annotation {...between(afterSchoolTap, lines.afterSchool[1])} {...phoneBox(afterSchoolSeat, SEAT_BOX_PAD)} color={colors.green600} />
    {zoom(
      AFTER_SCHOOL_SEAT,
      lines.afterSchool,
      [
        { title: "방과후", sub: "오늘 방과후 수업에 참여하는 학생", color: colors.purple600 },
        { title: "누르면 테두리 색", sub: "초록 테두리 출석 · 빨강 테두리 결석", color: colors.green600 },
      ],
      afterSchoolPresent,
    )}

    <Annotation {...between(...lines.pending)} {...phoneBox(pendingSeat, SEAT_BOX_PAD)} color={colors.red600} />
    {zoom(PENDING_SEAT, lines.pending, [{ title: "빨간 * 별표", sub: "아직 승인되지 않은 불참신청", color: colors.red600 }])}

    <Annotation {...between(...lines.inactive)} {...phoneBox(inactiveSeat, SEAT_BOX_PAD)} color={colors.gray700} />
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
