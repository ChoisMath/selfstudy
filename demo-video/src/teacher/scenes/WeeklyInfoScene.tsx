import React from "react";
import { useCurrentFrame } from "remotion";
import { Annotation } from "../../components/Annotation";
import { PhoneFrame } from "../../components/PhoneFrame";
import { PHONE_X, PHONE_Y, phoneAbs } from "../../components/phone";
import { colors } from "../../theme";
import { GuideScene } from "../../guide/GuideScene";
import { AttendanceBoardMock, buildAfternoonGroups, seatRect, type SeatState } from "../../app-mocks/AttendanceBoardMock";
import { WEEKLY_INFO } from "../../app-mocks/data";
import { PHONE_BODY, type Rect } from "../../app-mocks/layout";
import { WeeklyInfoModalMock, weeklyInfoRect } from "../mocks/WeeklyInfoModalMock";
import { lineAt, lineEnd, lineStart } from "../timing";
import {
  afternoon1Counts,
  afternoon1Visual,
  between,
  BOARD_URL,
  leftLabeled,
  phoneBoardProps,
  phoneBox,
  phoneCenter,
  PhoneTap,
  seatInfoRect,
  SeatZoomCard,
} from "./SeatColorsScene";
import type { DemoProps } from "../../props";

const ID = "WeeklyInfo";

const SEAT = WEEKLY_INFO.studentId;
// 오후1 결과(107 방과후 출석 포함) 위에 LongPress 에서 꾹 눌러 체크한 비참여 111 만 덮어쓴다.
const CARRIED: Record<number, SeatState> = {
  111: { visual: "present" },
};
const NOTE_DAY_INDEX = WEEKLY_INFO.todayIndex;
const NOTE_TEXT = "늦게 입실";

const infoTap = lineAt(ID, 0, 0.5);
const modalOpen = infoTap + 3;
const noteTap = lineAt(ID, 1, 0.12);
const typeFrom = noteTap + 6;
const blurTap = lineAt(ID, 1, 0.5);

// WeeklyInfoModalMock 비고 줄의 요일 칸 — 행 라벨 26px, 칸 간격 3px(목업 LABEL_COL_W·CELL_GAP).
const LABEL_COL_W = 26;
const CELL_GAP = 3;
const DAY_COUNT = 5;

const notesRow = weeklyInfoRect("notes", PHONE_BODY.w, PHONE_BODY.h);
const noteCell: Rect = (() => {
  const dayW = (notesRow.w - LABEL_COL_W - CELL_GAP * DAY_COUNT) / DAY_COUNT;
  return { x: notesRow.x + LABEL_COL_W + CELL_GAP + NOTE_DAY_INDEX * (dayW + CELL_GAP), y: notesRow.y, w: dayW, h: notesRow.h };
})();
const table = weeklyInfoRect("table", PHONE_BODY.w, PHONE_BODY.h);
const totals = weeklyInfoRect("totals", PHONE_BODY.w, PHONE_BODY.h);
// 제목 줄 가운데 빈 곳 — 입력 칸 밖을 눌러 포커스를 뺀다(바깥 어두운 곳을 누르면 창이 닫힌다).
const blurPoint = phoneAbs({ x: table.x + table.w / 2, y: table.y - 16 });

const propsAt = (frame: number) => {
  const visualFor = afternoon1Visual({
    ...CARRIED,
    [SEAT]: { visual: frame >= modalOpen ? "selected" : "present" },
  });
  return phoneBoardProps({
    tab: "afternoon1",
    groups: buildAfternoonGroups(visualFor),
    counts: afternoon1Counts(afternoon1Visual(CARRIED)),
    overlay: (
      <WeeklyInfoModalMock
        width={PHONE_BODY.w}
        height={PHONE_BODY.h}
        openAt={modalOpen}
        noteTyping={
          frame >= typeFrom + 2 ? { day: WEEKLY_INFO.days[NOTE_DAY_INDEX], text: NOTE_TEXT, typeFrom } : undefined
        }
      />
    ),
  });
};

const settled = propsAt(0);
const seat = seatRect(SEAT, settled);
const infoButton = seatInfoRect(SEAT, settled);

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <PhoneFrame x={PHONE_X} y={PHONE_Y} url={BOARD_URL}>
      <AttendanceBoardMock {...propsAt(frame)} />
    </PhoneFrame>
  );
};

export const WeeklyInfoScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={7} label="주간 정보">
    <Stage />

    <Annotation {...between(lineAt(ID, 0, 0.1), infoTap)} {...phoneBox(infoButton, 5)} color={colors.blue600} />
    <SeatZoomCard
      from={lineAt(ID, 0, 0.08)}
      to={modalOpen + 6}
      studentId={SEAT}
      propsAt={propsAt}
      centerY={phoneCenter(seat).y}
      labels={[{ at: 0, title: "좌석 오른쪽 위 i 버튼", sub: "그 학생의 이번 주 출석 현황", color: colors.blue600 }]}
    />
    <Annotation
      {...between(modalOpen + 14, lineEnd(ID, 0))}
      {...leftLabeled(table, 6)}
      label="이번 주 출석 현황"
      color={colors.blue600}
    />

    <Annotation {...between(lineStart(ID, 1), blurTap)} {...leftLabeled(notesRow, 5)} label="요일마다 비고" color={colors.indigo600} />
    <Annotation
      {...between(blurTap + 4, lineEnd(ID, 1))}
      {...leftLabeled(noteCell, 5)}
      label="칸을 벗어나면 자동 저장"
      color={colors.green600}
    />

    <Annotation
      {...between(lineAt(ID, 2, 0.05), lineEnd(ID, 2) + 10)}
      {...leftLabeled(totals, 3)}
      label="참여시간 · 학년 내 순위"
      color={colors.indigo600}
    />

    <PhoneTap at={infoTap} target={phoneCenter(infoButton)} />
    <PhoneTap at={noteTap} target={phoneCenter(noteCell)} />
    <PhoneTap at={blurTap} target={blurPoint} />
  </GuideScene>
);
