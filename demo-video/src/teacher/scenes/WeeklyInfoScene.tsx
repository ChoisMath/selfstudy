import React from "react";
import { useCurrentFrame } from "remotion";
import { Annotation } from "../../components/Annotation";
import { PhoneFrame } from "../../components/PhoneFrame";
import { PHONE_CROP, PHONE_X, PHONE_Y } from "../../components/phone";
import { tween } from "../../anim";
import { FONT } from "../../fonts";
import { colors } from "../../theme";
import { GuideScene } from "../../guide/GuideScene";
import { AttendanceBoardMock, buildAfternoonGroups, seatRect } from "../../app-mocks/AttendanceBoardMock";
import { WEEKLY_INFO } from "../../app-mocks/data";
import { PHONE_BODY, type Rect } from "../../app-mocks/layout";
import { WeeklyInfoModalMock, weeklyInfoRect } from "../mocks/WeeklyInfoModalMock";
import { lineAt, lineEnd, lineStart } from "../timing";
import {
  afternoon1Counts,
  afternoon1Visual,
  between,
  BOARD_URL,
  CARRIED_SEATS,
  leftLabeled,
  phoneBoardProps,
  phoneBox,
  phoneCenter,
  PhoneTap,
  rectCenter,
  seatInfoRect,
  SeatZoomCard,
  ZOOM_ENTER,
  ZOOM_EXIT,
  zoomTextWidth,
} from "./phone-helpers";
import type { DemoProps } from "../../props";

const ID = "WeeklyInfo";

const SEAT = WEEKLY_INFO.studentId;
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
const blurPoint = { x: table.x + table.w / 2, y: table.y - 16 };

const INFO_LABELS = [{ at: 0, title: "좌석 오른쪽 위 i 버튼", sub: "그 학생의 이번 주 출석 현황", color: colors.blue600 }];

const weeklyModal = (frame: number) => (
  <WeeklyInfoModalMock
    width={PHONE_BODY.w}
    height={PHONE_BODY.h}
    openAt={modalOpen}
    noteTyping={
      frame >= typeFrom + 2 ? { day: WEEKLY_INFO.days[NOTE_DAY_INDEX], text: NOTE_TEXT, typeFrom } : undefined
    }
  />
);

const propsAt = (frame: number) => {
  const visualFor = afternoon1Visual({
    ...CARRIED_SEATS,
    [SEAT]: { visual: frame >= modalOpen ? "selected" : "present" },
  });
  return phoneBoardProps({
    tab: "afternoon1",
    groups: buildAfternoonGroups(visualFor),
    counts: afternoon1Counts(afternoon1Visual(CARRIED_SEATS)),
    overlay: weeklyModal(frame),
  });
};

const settled = propsAt(0);
const seat = seatRect(SEAT, settled);
const infoButton = seatInfoRect(SEAT, settled);

// 주간 모달 글자는 8~11px 이라 1080p 에서 읽히지 않는다 — 표와 합계만 2배로 키운 카드를 폰 오른쪽에 둔다(영상 장치).
// 주석 라벨은 모두 폰 왼쪽에 있으므로 서로 겹치지 않는다.
const MODAL_ZOOM = 2;
const CARD_PAD = 20;
const CARD_TITLE_H = 34;
const CARD_TITLE_GAP = 12;
const CARD_LEFT = PHONE_CROP.x + PHONE_CROP.w + 44;
const REGION_SIDE = 6;
const REGION_TOP = 26;
const REGION_BOTTOM = 8;

const modalRegion: Rect = (() => {
  const y = table.y - REGION_TOP;
  return { x: table.x - REGION_SIDE, y, w: table.w + REGION_SIDE * 2, h: totals.y + totals.h + REGION_BOTTOM - y };
})();
const cardFrom = modalOpen + 14;
const cardTo = lineEnd(ID, 2) + 10;
const cardH = CARD_PAD * 2 + CARD_TITLE_H + CARD_TITLE_GAP + modalRegion.h * MODAL_ZOOM;
const cardTop = phoneCenter(table).y - cardH / 2;

const WeeklyZoomCard: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < cardFrom || frame > cardTo) return null;
  const shown = tween(frame, [cardFrom, cardFrom + ZOOM_ENTER], [0, 1]) * tween(frame, [cardTo - ZOOM_EXIT, cardTo], [1, 0]);
  return (
    <div
      style={{
        position: "absolute",
        left: CARD_LEFT,
        top: cardTop,
        padding: CARD_PAD,
        display: "flex",
        flexDirection: "column",
        gap: CARD_TITLE_GAP,
        background: "#fff",
        borderRadius: 18,
        border: `3px solid ${colors.blue600}`,
        boxShadow: "0 20px 50px rgba(15,23,42,0.12)",
        fontFamily: FONT,
        opacity: shown,
        translate: `${(1 - shown) * 20}px 0px`,
      }}
    >
      <span style={{ fontSize: 28, fontWeight: 800, color: colors.blue600, whiteSpace: "nowrap", height: CARD_TITLE_H }}>
        이번 주 출석 현황
      </span>
      <div
        style={{
          position: "relative",
          width: modalRegion.w * MODAL_ZOOM,
          height: modalRegion.h * MODAL_ZOOM,
          overflow: "hidden",
          borderRadius: 10,
        }}
      >
        <ModalCrop />
      </div>
    </div>
  );
};

const ModalCrop: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        transformOrigin: "top left",
        transform: `scale(${MODAL_ZOOM}) translate(${-modalRegion.x}px, ${-modalRegion.y}px)`,
      }}
    >
      {weeklyModal(frame)}
    </div>
  );
};

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
      labels={INFO_LABELS}
      textWidth={zoomTextWidth(INFO_LABELS)}
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

    <WeeklyZoomCard />

    <PhoneTap at={infoTap} target={rectCenter(infoButton)} />
    <PhoneTap at={noteTap} target={rectCenter(noteCell)} />
    <PhoneTap at={blurTap} target={blurPoint} />
  </GuideScene>
);
