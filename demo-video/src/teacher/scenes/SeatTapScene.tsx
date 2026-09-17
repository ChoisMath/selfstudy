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
import { BOARD_URL, TapCursor, between, boardProps, phoneBox } from "./AttendanceTourScene";

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

const propsAt = (frame: number) =>
  boardProps({
    tab: "afternoon1",
    groups: buildAfternoonGroups((id) => (id === SEAT_ID ? { ...baseVisual(id), ...seatStateAt(frame) } : baseVisual(id))),
  });

const BASE = propsAt(0);
const seat = seatRect(SEAT_ID, BASE);
const seatCenter = { x: seat.x + seat.w / 2, y: seat.y + seat.h / 2 };
const classroom = groupRect(0, BASE);
// 날짜 바가 폰 폭에서 잘리므로(방과후 숫자 앞에서 끊김) 카운트 상자도 막대 안쪽에서 끝낸다.
const countsRect: Rect = (() => {
  const counts = boardRect("counts", BASE);
  const bar = boardRect("dateBar", BASE);
  return { ...counts, w: bar.x + bar.w - 2 - counts.x };
})();
// 탭 세 칸(오후1·오후2·야간)의 보이는 모양 — 탭 칸 위쪽 8px 아래, 4px 간격.
const sessionTabsRect: Rect = (() => {
  const tabs = boardRect("tabs", BASE);
  const tabW = (tabs.w - 4 * 3) / 4;
  return { x: tabs.x, y: tabs.y + 8, w: tabW * 3 + 4 * 2, h: tabs.h - 8 };
})();

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <PhoneFrame x={PHONE_X} y={PHONE_Y} url={BOARD_URL}>
      <AttendanceBoardMock {...propsAt(frame)} />
    </PhoneFrame>
  );
};

const SeatNote: React.FC<{ from: number; to: number; label: string; color: string }> = ({ from, to, label, color }) => (
  <Annotation {...between(from, to)} {...phoneBox(seat, 4, "left")} label={label} color={color} />
);

export const SeatTapScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={3} label="출석 체크">
    <Stage />

    <Annotation {...between(cardFrom, uncheckedNoteFrom + NOTE_TAIL)} {...phoneBox(classroom, 2, "left")} label="교실 모양 그대로" color={colors.blue600} />
    <SeatNote from={uncheckedNoteFrom} to={lineEnd(ID, 0) + NOTE_TAIL} label="파란 좌석 = 미체크" color={colors.blue600} />

    <SeatNote from={presentTapAt + NOTE_DELAY} to={lineEnd(ID, 1) + NOTE_TAIL} label="출석" color={colors.green600} />
    <Annotation
      {...between(presentTapAt + NOTE_DELAY + 4, lineEnd(ID, 1) + NOTE_TAIL)}
      {...phoneBox(countsRect, 2, "right")}
      label="출석 +1 · 미체크 −1"
      color={colors.green600}
    />
    <SeatNote from={absentTapAt + NOTE_DELAY} to={lineEnd(ID, 2) + NOTE_TAIL} label="결석" color={colors.red600} />
    <SeatNote from={uncheckTapAt + NOTE_DELAY} to={lineEnd(ID, 3) + NOTE_TAIL} label="다시 미체크" color={colors.blue600} />
    <SeatNote from={saveTapAt + NOTE_DELAY} to={lineEnd(ID, 4) + NOTE_TAIL} label="누르는 순간 자동 저장" color={colors.green600} />
    <Annotation {...between(tabsFrom, lineEnd(ID, 5) + 10)} {...phoneBox(sessionTabsRect, 3, "left")} label="탭마다 따로 체크" color={colors.blue600} />

    {TAPS.map((tap) => (
      <TapCursor key={tap.at} at={tap.at} target={seatCenter} />
    ))}
  </GuideScene>
);
