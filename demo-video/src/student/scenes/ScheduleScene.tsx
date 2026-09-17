import React from "react";
import { useCurrentFrame } from "remotion";
import { Annotation } from "../../components/Annotation";
import { FlashNotice } from "../../components/FlashNotice";
import { PhoneFrame } from "../../components/PhoneFrame";
import { PHONE_CROP, PHONE_X, PHONE_Y } from "../../components/phone";
import { FONT } from "../../fonts";
import { WIDTH, colors } from "../../theme";
import { tween } from "../../anim";
import { GuideScene } from "../../guide/GuideScene";
import { lineAt, lineEnd } from "../timing";
import { APP_HOST } from "../../app-mocks/data";
import { PHONE_BODY, type Rect } from "../../app-mocks/layout";
import { tw } from "../../app-mocks/tw";
import { ParticipationCardMock, participationCardHeight, participationCellRect } from "../mocks/ParticipationCardMock";
import { SeatCheckCardMock } from "../mocks/SeatCheckCardMock";
import { StudentShellMock, STUDENT_BODY, STUDENT_CARD_GAP, STUDENT_CONTENT_W } from "../mocks/StudentShellMock";
import { StudyHoursCardMock } from "../mocks/StudyHoursCardMock";
import type { DemoProps } from "../../props";
import {
  ZOOM_CARD_PAD,
  ZOOM_ENTER,
  ZOOM_EXIT,
  between,
  phoneBox,
  phoneCenter,
} from "../../teacher/scenes/phone-helpers";

const ID = "Schedule";

const STUDENT_URL = `${APP_HOST}/student`;
const W = PHONE_BODY.w;

// 셸 본문(py-6)과 student/page.tsx 제목(h2 text-xl mb-4) — 목업이 내보내지 않는 값이라 장면이 같은 크기로 그린다.
const BODY_PAD_TOP = 24;
const TITLE_H = 28;
const TITLE_MB = 16;
const CARD_X = (PHONE_BODY.w - STUDENT_CONTENT_W) / 2;
const CARD_TOP = STUDENT_BODY.y + BODY_PAD_TOP + TITLE_H + TITLE_MB;
// ParticipationCardMock 의 p-3 / gap-2 — 라벨 열 상자를 되살리는 데만 쓴다.
const CARD_PAD = 12;
const COL_GAP = 8;

const PageTitle: React.FC = () => (
  <div style={{ height: TITLE_H, marginBottom: TITLE_MB, fontSize: 20, fontWeight: 700, color: tw.gray[900], whiteSpace: "nowrap" }}>
    내 참여일정
  </div>
);

// 카드 로컬 좌표 → 폰 본문 좌표.
const inPhone = (r: Rect): Rect => ({ ...r, x: r.x + CARD_X, y: r.y + CARD_TOP });

const gridCard: Rect = { x: CARD_X, y: CARD_TOP, w: STUDENT_CONTENT_W, h: participationCardHeight() };

const cell = (session: "afternoon1" | "afternoon2" | "night", weekday: number) =>
  participationCellRect(session, weekday, STUDENT_CONTENT_W);

const firstCell = cell("afternoon1", 0);
const lastCell = cell("night", 4);
const rowsH = lastCell.y + lastCell.h - firstCell.y;

const labelColumn: Rect = inPhone({
  x: CARD_PAD,
  y: firstCell.y,
  w: firstCell.x - CARD_PAD - COL_GAP,
  h: rowsH,
});
const daysColumn: Rect = inPhone({
  x: firstCell.x,
  y: firstCell.y,
  w: lastCell.x + lastCell.w - firstCell.x,
  h: rowsH,
});

const TODAY_WEEKDAY = 3; // TODAY=2026-09-17(목) — ParticipationCardMock 이 테두리를 그리는 열.
const SAMPLE_WEEKDAY = 4; // 금요일: 오후1은 파랑, 야간은 회색이라 한 열에서 두 상태를 비교할 수 있다.

const blueCell = inPhone(cell("afternoon1", SAMPLE_WEEKDAY));
const grayCell = inPhone(cell("night", SAMPLE_WEEKDAY));
// "오늘" 캡션 줄까지 묶어 오늘 열 전체를 가리킨다.
const todayColumn: Rect = inPhone({
  x: cell("afternoon1", TODAY_WEEKDAY).x,
  y: firstCell.y,
  w: firstCell.w,
  h: participationCardHeight() - CARD_PAD - firstCell.y,
});

const lines = {
  card: [lineAt(ID, 0, 0.25), lineEnd(ID, 0) + 6],
  rows: [lineAt(ID, 1, 0.05), lineAt(ID, 1, 0.46) + 4],
  days: [lineAt(ID, 1, 0.44), lineEnd(ID, 1) + 6],
  blue: [lineAt(ID, 2, 0.05), lineEnd(ID, 2) + 8],
  gray: [lineAt(ID, 2, 0.33), lineEnd(ID, 2) + 8],
  today: [lineAt(ID, 2, 0.58), lineEnd(ID, 2) + 8],
} as const;

// 격자 글자(요일 14px, "다음주" 9px)는 영상에서 읽히지 않는다 — 수·목·금 세 열만 잘라 키운 카드를 폰 오른쪽에 둔다
// (왼쪽은 파란 칸·회색 칸 라벨 자리).
const ZOOM_CARD_LEFT = PHONE_CROP.x + PHONE_CROP.w + 44;
const GRID_ZOOM = 2.4;
const ZOOM_FROM = lineAt(ID, 2, 0.02);
const ZOOM_TO = lineEnd(ID, 2) + 8;
const zoomCrop: Rect = {
  x: cell("afternoon1", 2).x - 4,
  y: firstCell.y - 4,
  w: cell("afternoon1", 4).x + firstCell.w - cell("afternoon1", 2).x + 8,
  h: participationCardHeight() - CARD_PAD - firstCell.y + 8,
};

const GridZoomCard: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < ZOOM_FROM || frame > ZOOM_TO) return null;
  const shown =
    tween(frame, [ZOOM_FROM, ZOOM_FROM + ZOOM_ENTER], [0, 1]) * tween(frame, [ZOOM_TO - ZOOM_EXIT, ZOOM_TO], [1, 0]);
  const boxW = zoomCrop.w * GRID_ZOOM;
  const boxH = zoomCrop.h * GRID_ZOOM;
  return (
    <div
      style={{
        position: "absolute",
        left: ZOOM_CARD_LEFT,
        top: phoneCenter(gridCard).y - boxH / 2 - ZOOM_CARD_PAD - 40,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: `${ZOOM_CARD_PAD}px ${ZOOM_CARD_PAD}px`,
        background: "#fff",
        borderRadius: 18,
        border: `3px solid ${colors.blue600}`,
        boxShadow: "0 20px 50px rgba(15,23,42,0.12)",
        fontFamily: FONT,
        opacity: shown,
        translate: `${(shown - 1) * 20}px 0px`,
      }}
    >
      <span style={{ fontSize: 24, fontWeight: 700, color: colors.gray600, whiteSpace: "nowrap" }}>수 · 목 · 금 확대</span>
      <div style={{ position: "relative", width: boxW, height: boxH, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transformOrigin: "top left",
            transform: `scale(${GRID_ZOOM}) translate(${-zoomCrop.x}px, ${-zoomCrop.y}px)`,
          }}
        >
          <ParticipationCardMock width={STUDENT_CONTENT_W} />
        </div>
      </div>
    </div>
  );
};

const NOTICE_GAP = 24;
const NOTICE_COLUMN = { x: PHONE_CROP.x + PHONE_CROP.w + NOTICE_GAP, y: 420 };
const NOTICE_COLUMN_W = WIDTH - NOTICE_COLUMN.x - NOTICE_GAP;

const Stage: React.FC = () => (
  <PhoneFrame x={PHONE_X} y={PHONE_Y} url={STUDENT_URL}>
    <StudentShellMock width={W} height={PHONE_BODY.h} tab="schedule" showHelp>
      <PageTitle />
      <ParticipationCardMock width={STUDENT_CONTENT_W} />
      <div style={{ height: STUDENT_CARD_GAP }} />
      <StudyHoursCardMock width={STUDENT_CONTENT_W} />
      <div style={{ height: STUDENT_CARD_GAP }} />
      <SeatCheckCardMock width={STUDENT_CONTENT_W} tab="afternoon" />
    </StudentShellMock>
  </PhoneFrame>
);

export const ScheduleScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={3} label="참여일정">
    <Stage />

    <Annotation {...between(...lines.card)} {...phoneBox(gridCard, 4, "left")} label="내가 참여하는 요일" color={colors.blue600} />

    <Annotation {...between(...lines.rows)} {...phoneBox(labelColumn, 3, "left")} label="오후1 · 오후2 · 야간" color={colors.indigo600} />
    <Annotation {...between(...lines.days)} {...phoneBox(daysColumn, 3, "right")} label="월 ~ 금" color={colors.indigo600} />

    <Annotation {...between(...lines.blue)} {...phoneBox(blueCell, 3, "left")} label="파란 칸 = 참여" color={colors.blue600} />
    <Annotation {...between(...lines.gray)} {...phoneBox(grayCell, 3, "left")} label="회색 칸 = 미참여" color={colors.gray700} />
    {/* 오늘 열 상자는 세 줄을 다 덮어 좌우 라벨이 파란 칸·회색 칸 라벨과 겹친다 — 열 위쪽에 머리글처럼 붙인다. */}
    <Annotation
      {...between(...lines.today)}
      {...phoneBox(todayColumn, 3)}
      labelPosition="top"
      labelAlign="end"
      label="테두리 = 오늘"
      color={colors.red600}
    />

    <GridZoomCard />

    <div style={{ position: "absolute", left: NOTICE_COLUMN.x, top: NOTICE_COLUMN.y, width: NOTICE_COLUMN_W }}>
      <FlashNotice
        from={lineAt(ID, 3, 0.1)}
        durationInFrames={lineEnd(ID, 3) - lineAt(ID, 3, 0.1) + 10}
        text="참여 요일은 담임 선생님이 정합니다"
        hint="잘못되어 있으면 담임 선생님께"
      />
    </div>
  </GuideScene>
);
