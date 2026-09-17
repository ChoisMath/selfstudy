import React from "react";
import { useCurrentFrame } from "remotion";
import { Annotation } from "../../components/Annotation";
import { Cursor } from "../../components/Cursor";
import { PhoneFrame } from "../../components/PhoneFrame";
import { PHONE_X, PHONE_Y, phoneAbs } from "../../components/phone";
import { FONT } from "../../fonts";
import { colors } from "../../theme";
import { easeInOut, tween } from "../../anim";
import { GuideScene } from "../../guide/GuideScene";
import { lineAt, lineEnd } from "../timing";
import { textWidth } from "../../app-mocks/AttendanceHeaderMock";
import { APP_HOST } from "../../app-mocks/data";
import { PHONE_BODY, type Point, type Rect } from "../../app-mocks/layout";
import { tw } from "../../app-mocks/tw";
import { ParticipationCardMock, participationCardHeight } from "../mocks/ParticipationCardMock";
import { SeatCheckCardMock, seatCheckCardHeight, seatCheckRect, type SeatCheckTab } from "../mocks/SeatCheckCardMock";
import { StudentShellMock, STUDENT_BODY, STUDENT_CARD_GAP, STUDENT_CONTENT_W } from "../mocks/StudentShellMock";
import { StudyHoursCardMock, studyHoursCardHeight } from "../mocks/StudyHoursCardMock";
import { MY_SEAT } from "../data";
import type { DemoProps } from "../../props";
import {
  PhoneTap,
  ZOOM_CARD_PAD,
  ZOOM_CARD_RIGHT,
  ZOOM_ENTER,
  ZOOM_EXIT,
  between,
  phoneBox,
  phoneCenter,
} from "../../teacher/scenes/phone-helpers";

const ID = "Seat";

const STUDENT_URL = `${APP_HOST}/student`;
const W = PHONE_BODY.w;

// 셸 본문(py-6)과 student/page.tsx 제목(h2 text-xl mb-4) — 목업이 내보내지 않는 값이라 장면이 같은 크기로 그린다.
const BODY_PAD_TOP = 24;
const BODY_PAD_BOTTOM = 24;
const TITLE_H = 28;
const TITLE_MB = 16;
const CARD_X = (PHONE_BODY.w - STUDENT_CONTENT_W) / 2;

const AFTERNOON_CARD_H = seatCheckCardHeight(STUDENT_CONTENT_W, "afternoon");
const SEAT_CARD_CONTENT_Y =
  BODY_PAD_TOP + TITLE_H + TITLE_MB + participationCardHeight() + STUDENT_CARD_GAP + studyHoursCardHeight() + STUDENT_CARD_GAP;
const CONTENT_H = SEAT_CARD_CONTENT_Y + AFTERNOON_CARD_H + BODY_PAD_BOTTOM;
const MAX_SCROLL = Math.max(0, CONTENT_H - STUDENT_BODY.h);
// StudyHours 장면이 멈춘 자리에서 이어받아(참여시간 카드가 본문 위 200px) 좌석 카드가 다 보이는 끝까지 내린다.
const SCROLL_FROM_Y = Math.min(MAX_SCROLL, BODY_PAD_TOP + TITLE_H + TITLE_MB + participationCardHeight() + STUDENT_CARD_GAP - 200);
const SCROLL_TO_Y = MAX_SCROLL;
const SEAT_CARD_TOP = STUDENT_BODY.y + SEAT_CARD_CONTENT_Y - SCROLL_TO_Y;

const scrollFrom = lineAt(ID, 0, 0.1);
const scrollTo = scrollFrom + 22;

// 누름 애니메이션(pressScale 12프레임)이 끝난 뒤에 화면을 바꾼다 — 눌린 탭이 도중에 활성으로 바뀌면 크기가 튄다.
const TAB_SWITCH_DELAY = 12;
const nightPressAt = lineAt(ID, 1, 0.32);
const nightShowAt = nightPressAt + TAB_SWITCH_DELAY;
const backPressAt = lineAt(ID, 1, 0.7);
const afternoonShowAt = backPressAt + TAB_SWITCH_DELAY;

const tabAt = (frame: number): SeatCheckTab =>
  frame >= nightShowAt && frame < afternoonShowAt ? "night" : "afternoon";

const PageTitle: React.FC = () => (
  <div style={{ height: TITLE_H, marginBottom: TITLE_MB, fontSize: 20, fontWeight: 700, color: tw.gray[900], whiteSpace: "nowrap" }}>
    내 참여일정
  </div>
);

// 카드 로컬 좌표 → 스크롤이 끝난 뒤의 폰 본문 좌표.
const inPhone = (r: Rect): Rect => ({ ...r, x: r.x + CARD_X, y: r.y + SEAT_CARD_TOP });

const seatCard: Rect = { x: CARD_X, y: SEAT_CARD_TOP, w: STUDENT_CONTENT_W, h: AFTERNOON_CARD_H };

const mySeatRect = (tab: SeatCheckTab) => seatCheckRect("mySeat", STUDENT_CONTENT_W, tab);
const corridor = seatCheckRect("corridor", STUDENT_CONTENT_W, "afternoon");
const titleRect = seatCheckRect("title", STUDENT_CONTENT_W, "afternoon");
// 카드 p-4 — title rect 의 x 가 그 값이다.
const CARD_PAD = titleRect.x;

// 목업은 "내 자리: N행 M열" 줄과 창문·교탁 상자를 rect 로 내보내지 않는다 — 제목/복도 rect 에서 되살린다
// (SeatCheckCard.tsx 의 mb-1 4px, ClassroomFrame 의 교탁 mt-8px).
const SUBTITLE_GAP = 4;
const subtitleLabel = `내 자리: ${MY_SEAT.afternoon.label}`;
const subtitle: Rect = {
  x: CARD_PAD,
  y: titleRect.y + titleRect.h + SUBTITLE_GAP,
  w: textWidth(subtitleLabel, 12, 400) + 2,
  h: 16,
};
// AFTERNOON_CLASSROOMS 는 corridorSide "right" → 왼쪽 세로 라벨이 창문, 오른쪽이 복도.
const windowSide: Rect = { x: CARD_PAD, y: corridor.y, w: corridor.w, h: corridor.h };
const DESK_GAP = 8;
const desk: Rect = {
  x: CARD_PAD,
  y: corridor.y + corridor.h + DESK_GAP,
  w: STUDENT_CONTENT_W - CARD_PAD * 2,
  h: AFTERNOON_CARD_H - CARD_PAD - (corridor.y + corridor.h + DESK_GAP),
};

// 탭 두 개는 폭이 같다(라벨이 모두 4글자) — 묶음 rect 를 반으로 나눠 각 탭 중심을 구한다.
const TAB_GAP = 4;
const tabsRect = seatCheckRect("tabs", STUDENT_CONTENT_W, "afternoon");
const tabCenter = (tab: SeatCheckTab): Point => {
  const w = (tabsRect.w - TAB_GAP) / 2;
  const x = tab === "afternoon" ? tabsRect.x : tabsRect.x + w + TAB_GAP;
  return { x: x + w / 2 + CARD_X, y: tabsRect.y + tabsRect.h / 2 + SEAT_CARD_TOP };
};

const lines = {
  card: [lineAt(ID, 0, 0.45), lineEnd(ID, 0) + 6],
  seatAfternoon: [lineAt(ID, 1, 0.05), nightPressAt + 4],
  seatNight: [nightShowAt + 2, backPressAt + 4],
  seatBack: [afternoonShowAt + 2, lineEnd(ID, 1) + 8],
  subtitle: [lineAt(ID, 2, 0.08), lineEnd(ID, 2) + 10],
  sides: [lineAt(ID, 2, 0.35), lineEnd(ID, 2) + 10],
  desk: [lineAt(ID, 2, 0.55), lineEnd(ID, 2) + 10],
} as const;

// 폰 안 좌석은 47px 남짓이라 이름이 읽히지 않는다 — 같은 좌석을 3배로 키운 카드를 폰 왼쪽에 띄운다(영상 장치).
const SEAT_ZOOM = 3;
const ZOOM_FROM = lineAt(ID, 1, 0.05);
const ZOOM_TO = lineEnd(ID, 1) + 6;

const SeatZoom: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < ZOOM_FROM || frame > ZOOM_TO) return null;
  const tab = tabAt(frame);
  const shown =
    tween(frame, [ZOOM_FROM, ZOOM_FROM + ZOOM_ENTER], [0, 1]) * tween(frame, [ZOOM_TO - ZOOM_EXIT, ZOOM_TO], [1, 0]);
  const crop = mySeatRect(tab);
  const boxW = crop.w * SEAT_ZOOM;
  const boxH = crop.h * SEAT_ZOOM;
  const seat = tab === "afternoon" ? MY_SEAT.afternoon : MY_SEAT.night;
  return (
    <div
      style={{
        position: "absolute",
        right: ZOOM_CARD_RIGHT,
        top: phoneCenter(inPhone(mySeatRect("afternoon"))).y - boxH / 2 - ZOOM_CARD_PAD,
        display: "flex",
        alignItems: "center",
        gap: 26,
        padding: `${ZOOM_CARD_PAD}px 30px ${ZOOM_CARD_PAD}px ${ZOOM_CARD_PAD + 6}px`,
        background: "#fff",
        borderRadius: 18,
        border: `3px solid ${colors.blue600}`,
        boxShadow: "0 20px 50px rgba(15,23,42,0.12)",
        fontFamily: FONT,
        opacity: shown,
        translate: `${(shown - 1) * 20}px 0px`,
      }}
    >
      <div style={{ position: "relative", width: boxW, height: boxH, overflow: "hidden", flexShrink: 0 }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transformOrigin: "top left",
            transform: `scale(${SEAT_ZOOM}) translate(${-crop.x}px, ${-crop.y}px)`,
          }}
        >
          <SeatCheckCardMock width={STUDENT_CONTENT_W} tab={tab} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 210 }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: colors.blue600, whiteSpace: "nowrap" }}>내 자리</span>
        <span style={{ fontSize: 20, fontWeight: 500, color: colors.gray600, whiteSpace: "nowrap" }}>
          {seat.title} {seat.label}
        </span>
      </div>
    </div>
  );
};

const swipeStart = phoneAbs({ x: PHONE_BODY.w * 0.72, y: PHONE_BODY.h * 0.7 });

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const scrollY = tween(frame, [scrollFrom, scrollTo], [SCROLL_FROM_Y, SCROLL_TO_Y], easeInOut);
  const tab = tabAt(frame);
  const tabPressAt = frame < nightShowAt ? nightPressAt : frame < afternoonShowAt ? backPressAt : undefined;
  return (
    <PhoneFrame x={PHONE_X} y={PHONE_Y} url={STUDENT_URL}>
      <StudentShellMock width={W} height={PHONE_BODY.h} tab="schedule" showHelp scrollY={scrollY}>
        <PageTitle />
        <ParticipationCardMock width={STUDENT_CONTENT_W} />
        <div style={{ height: STUDENT_CARD_GAP }} />
        <StudyHoursCardMock width={STUDENT_CONTENT_W} />
        <div style={{ height: STUDENT_CARD_GAP }} />
        <SeatCheckCardMock width={STUDENT_CONTENT_W} tab={tab} tabPressAt={tabPressAt} />
      </StudentShellMock>
    </PhoneFrame>
  );
};

export const SeatScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={5} label="좌석 확인">
    <Stage />

    <Annotation {...between(...lines.card)} {...phoneBox(seatCard, 4, "left")} label="좌석 확인 카드" color={colors.blue600} />

    <Annotation {...between(...lines.seatAfternoon)} {...phoneBox(inPhone(mySeatRect("afternoon")), 3)} color={colors.blue600} />
    <Annotation {...between(...lines.seatNight)} {...phoneBox(inPhone(mySeatRect("night")), 3)} color={colors.blue600} />
    <Annotation {...between(...lines.seatBack)} {...phoneBox(inPhone(mySeatRect("afternoon")), 3)} color={colors.blue600} />
    <SeatZoom />

    <Annotation {...between(...lines.subtitle)} {...phoneBox(inPhone(subtitle), 4, "left")} label="몇 행 몇 열" color={colors.indigo600} />
    <Annotation {...between(...lines.sides)} {...phoneBox(inPhone(windowSide), 3, "left")} label="창문" color={colors.red600} />
    <Annotation {...between(...lines.sides)} {...phoneBox(inPhone(corridor), 3, "right")} label="복도" color={colors.red600} />
    <Annotation {...between(...lines.desk)} {...phoneBox(inPhone(desk), 3, "right")} label="교탁" color={colors.red600} />

    <PhoneTap at={nightPressAt} target={tabCenter("night")} />
    <PhoneTap at={backPressAt} target={tabCenter("afternoon")} />

    <Cursor
      path={[
        { frame: scrollFrom - 12, x: swipeStart.x, y: swipeStart.y },
        { frame: scrollFrom, x: swipeStart.x, y: swipeStart.y },
        { frame: scrollTo, x: swipeStart.x, y: swipeStart.y - (SCROLL_TO_Y - SCROLL_FROM_Y) },
      ]}
      hideAfter={scrollTo + 6}
    />
  </GuideScene>
);
