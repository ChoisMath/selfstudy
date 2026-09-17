import React from "react";
import { useCurrentFrame } from "remotion";
import { Annotation } from "../../components/Annotation";
import { PhoneFrame } from "../../components/PhoneFrame";
import { PHONE_X, PHONE_Y } from "../../components/phone";
import { colors } from "../../theme";
import { GuideScene } from "../../guide/GuideScene";
import { lineAt, lineEnd } from "../timing";
import {
  AttendanceBoardMock,
  baseVisual,
  boardRect,
  buildAfternoonGroups,
  groupRect,
  seatRect,
  type SeatState,
} from "../../app-mocks/AttendanceBoardMock";
import type { SeatVisual } from "../../app-mocks/SeatCellMock";
import type { Rect } from "../../app-mocks/layout";
import type { DemoProps } from "../../props";
import {
  BOARD_URL,
  ClipTo,
  PhoneTap,
  SeatZoomCard,
  between,
  countsScrollX,
  dateBarBand,
  phoneBoardProps,
  phoneBox,
  phoneCenter,
  zoomTextWidth,
} from "./phone-helpers";

const ID = "SeatTap";

// 1-1반 1번 김도현 — 첫 교실 맨 앞 줄 첫 칸.
const SEAT_ID = 101;
// 눌린 칸이 작아지기 시작한 뒤에 색이 바뀐다.
const COLOR_DELAY = 2;
const NOTE_DELAY = 6;
const NOTE_TAIL = 4;

const cardFrom = lineAt(ID, 0, 0.05);
const uncheckedNoteFrom = lineAt(ID, 0, 0.5);
const presentTapAt = lineAt(ID, 1, 0.35);
const absentTapAt = lineAt(ID, 2, 0.3);
const uncheckTapAt = lineAt(ID, 3, 0.5);
const saveTapAt = lineAt(ID, 4, 0.15);
const tabsFrom = lineAt(ID, 5, 0.1);

const TAPS: { at: number; visual: SeatVisual }[] = [
  { at: presentTapAt, visual: "present" },
  { at: absentTapAt, visual: "absent" },
  { at: uncheckTapAt, visual: "unchecked" },
  { at: saveTapAt, visual: "present" },
];

const seatStateAt = (frame: number): SeatState => {
  const pressed = TAPS.filter((t) => frame >= t.at);
  const changed = TAPS.filter((t) => frame >= t.at + COLOR_DELAY);
  return {
    visual: changed.length > 0 ? changed[changed.length - 1].visual : "unchecked",
    pressAt: pressed.length > 0 ? pressed[pressed.length - 1].at : undefined,
  };
};

const boardAt = (frame: number, dateBarScrollX = 0) =>
  phoneBoardProps({
    tab: "afternoon1",
    groups: buildAfternoonGroups((id) => (id === SEAT_ID ? { ...baseVisual(id), ...seatStateAt(frame) } : baseVisual(id))),
    dateBarScrollX,
  });

// 카운트("방과후 N"까지)가 다 보이도록 날짜 바를 미리 민다 — 폰 장면 공통.
const DATE_BAR_SCROLL = countsScrollX(boardAt(0));

const propsAt = (frame: number) => boardAt(frame, DATE_BAR_SCROLL);

const BASE = propsAt(0);
const seat = seatRect(SEAT_ID, BASE);
const seatCenter = { x: seat.x + seat.w / 2, y: seat.y + seat.h / 2 };
const classroom = groupRect(0, BASE);
const countsRect = boardRect("counts", BASE);
// 탭 세 칸(오후1·오후2·야간)의 보이는 모양 — 탭 칸 위쪽 8px 아래, 4px 간격.
const sessionTabsRect: Rect = (() => {
  const tabs = boardRect("tabs", BASE);
  const tabW = (tabs.w - 4 * 3) / 4;
  return { x: tabs.x, y: tabs.y + 8, w: tabW * 3 + 4 * 2, h: tabs.h - 8 };
})();

// 폰 안 좌석 글자는 7~9px 이라 영상에서 읽히지 않는다 — 같은 좌석을 키운 카드로 상태를 설명한다(SeatColors 와 같은 장치).
const ZOOM_LABELS = [
  { at: uncheckedNoteFrom, title: "파란 좌석 = 미체크", sub: "아직 체크하지 않은 학생", color: colors.blue600 },
  { at: presentTapAt + COLOR_DELAY, title: "출석", sub: "한 번 누르면 초록 출석", color: colors.green600 },
  { at: absentTapAt + COLOR_DELAY, title: "결석", sub: "한 번 더 누르면 빨강 결석", color: colors.red600 },
  { at: uncheckTapAt + COLOR_DELAY, title: "다시 미체크", sub: "세 번째로 누르면 파랑 미체크", color: colors.blue600 },
  { at: saveTapAt + COLOR_DELAY, title: "누르는 순간 자동 저장", sub: "따로 저장 버튼이 없습니다", color: colors.green600 },
];
const ZOOM_TEXT_W = zoomTextWidth(ZOOM_LABELS);

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <PhoneFrame x={PHONE_X} y={PHONE_Y} url={BOARD_URL}>
      <AttendanceBoardMock {...propsAt(frame)} />
    </PhoneFrame>
  );
};

// 좌석 사이 간격은 2.3px 뿐이라 상자를 1px 만 띄운다 — 더 띄우면 옆 좌석과 그 "i" 버튼을 덮는다.
const SEAT_BOX_PAD = 1;

const SeatBox: React.FC<{ from: number; to: number; color: string }> = ({ from, to, color }) => (
  <Annotation {...between(from, to)} {...phoneBox(seat, SEAT_BOX_PAD)} color={color} />
);

export const SeatTapScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={3} label="출석 체크">
    <Stage />

    <Annotation {...between(cardFrom, uncheckedNoteFrom)} {...phoneBox(classroom, 2, "left")} label="교실 모양 그대로" color={colors.blue600} />

    <SeatBox from={uncheckedNoteFrom} to={lineEnd(ID, 0) + NOTE_TAIL} color={colors.blue600} />
    <SeatBox from={presentTapAt + NOTE_DELAY} to={lineEnd(ID, 1) + NOTE_TAIL} color={colors.green600} />
    <SeatBox from={absentTapAt + NOTE_DELAY} to={lineEnd(ID, 2) + NOTE_TAIL} color={colors.red600} />
    <SeatBox from={uncheckTapAt + NOTE_DELAY} to={lineEnd(ID, 3) + NOTE_TAIL} color={colors.blue600} />
    <SeatBox from={saveTapAt + NOTE_DELAY} to={lineEnd(ID, 4) + NOTE_TAIL} color={colors.green600} />
    <SeatZoomCard
      from={uncheckedNoteFrom}
      to={lineEnd(ID, 4) + NOTE_TAIL}
      studentId={SEAT_ID}
      propsAt={propsAt}
      centerY={phoneCenter(seat).y}
      labels={ZOOM_LABELS}
      textWidth={ZOOM_TEXT_W}
    />

    <ClipTo rect={dateBarBand(BASE)}>
      <Annotation
        {...between(presentTapAt + NOTE_DELAY + 4, lineEnd(ID, 1) + NOTE_TAIL)}
        {...phoneBox(countsRect, 2, "right")}
        label="출석 +1 · 미체크 −1"
        color={colors.green600}
      />
    </ClipTo>
    <Annotation {...between(tabsFrom, lineEnd(ID, 5) + 10)} {...phoneBox(sessionTabsRect, 3, "left")} label="탭마다 따로 체크" color={colors.blue600} />

    {TAPS.map((tap) => (
      <PhoneTap key={tap.at} at={tap.at} target={seatCenter} />
    ))}
  </GuideScene>
);
