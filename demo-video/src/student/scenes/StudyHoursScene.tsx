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
import { APP_HOST } from "../../app-mocks/data";
import { PHONE_BODY, type Rect } from "../../app-mocks/layout";
import { tw } from "../../app-mocks/tw";
import { ParticipationCardMock, participationCardHeight } from "../mocks/ParticipationCardMock";
import { SeatCheckCardMock, seatCheckCardHeight } from "../mocks/SeatCheckCardMock";
import { StudentShellMock, STUDENT_BODY, STUDENT_CARD_GAP, STUDENT_CONTENT_W } from "../mocks/StudentShellMock";
import { StudyHoursCardMock, studyHoursCardHeight, studyHoursRect } from "../mocks/StudyHoursCardMock";
import type { DemoProps } from "../../props";
import {
  ZOOM_CARD_PAD,
  ZOOM_CARD_RIGHT,
  ZOOM_ENTER,
  ZOOM_EXIT,
  between,
  phoneBox,
  phoneCenter,
} from "../../teacher/scenes/phone-helpers";

const ID = "StudyHours";

const STUDENT_URL = `${APP_HOST}/student`;
const W = PHONE_BODY.w;

// 셸 본문(py-6)과 student/page.tsx 제목(h2 text-xl mb-4) — 목업이 내보내지 않는 값이라 장면이 같은 크기로 그린다.
const BODY_PAD_TOP = 24;
const BODY_PAD_BOTTOM = 24;
const TITLE_H = 28;
const TITLE_MB = 16;
const CARD_X = (PHONE_BODY.w - STUDENT_CONTENT_W) / 2;

const SEAT_CARD_H = seatCheckCardHeight(STUDENT_CONTENT_W, "afternoon");
const CONTENT_H =
  BODY_PAD_TOP +
  TITLE_H +
  TITLE_MB +
  participationCardHeight() +
  STUDENT_CARD_GAP +
  studyHoursCardHeight() +
  STUDENT_CARD_GAP +
  SEAT_CARD_H +
  BODY_PAD_BOTTOM;
const MAX_SCROLL = Math.max(0, CONTENT_H - STUDENT_BODY.h);

// 참여시간 카드가 본문 위쪽으로 올라오는 만큼만 민다(Seat 장면이 여기서 이어받아 끝까지 내린다).
const HOURS_CARD_CONTENT_Y = BODY_PAD_TOP + TITLE_H + TITLE_MB + participationCardHeight() + STUDENT_CARD_GAP;
const SCROLL_Y = Math.min(MAX_SCROLL, HOURS_CARD_CONTENT_Y - 200);
const HOURS_CARD_TOP = STUDENT_BODY.y + HOURS_CARD_CONTENT_Y - SCROLL_Y;

const scrollFrom = lineAt(ID, 0, 0.08);
const scrollTo = scrollFrom + 22;

const PageTitle: React.FC = () => (
  <div style={{ height: TITLE_H, marginBottom: TITLE_MB, fontSize: 20, fontWeight: 700, color: tw.gray[900], whiteSpace: "nowrap" }}>
    내 참여일정
  </div>
);

// 카드 로컬 좌표 → 스크롤이 끝난 뒤의 폰 본문 좌표.
const inPhone = (r: Rect): Rect => ({ ...r, x: r.x + CARD_X, y: r.y + HOURS_CARD_TOP });

const monthBox = inPhone(studyHoursRect("month", STUDENT_CONTENT_W));
const yearBox = inPhone(studyHoursRect("year", STUDENT_CONTENT_W));
// studyHoursRect("rank") 는 박스 안 글자 줄높이를 근사해 실제 순위 줄보다 8px 위를 가리킨다(카드가 그리는 값은
// 흐름 배치, rect 는 근사식 — 목업 보고 사항). 상자만 그만큼 내리고 실제 줄높이(11px × 1.5)로 맞춘다.
const RANK_DRIFT = 8;
const rankRect = studyHoursRect("rank", STUDENT_CONTENT_W);
const rankLine = inPhone({ ...rankRect, y: rankRect.y + RANK_DRIFT, h: 17 });

const lines = {
  month: [lineAt(ID, 0, 0.5), lineEnd(ID, 1) + 4],
  year: [lineAt(ID, 0, 0.68), lineEnd(ID, 1) + 4],
  rank: [lineAt(ID, 2, 0.05), lineEnd(ID, 2) + 10],
} as const;

// 계산 규칙은 화면에 적혀 있지 않다 — 문장 1을 따라가는 설명 카드를 폰 왼쪽 빈 자리에 둔다(영상 장치).
const RULES: { text: string; strong: string; at: number }[] = [
  { text: "오후 자습 1회", strong: "50분", at: 0.1 },
  { text: "야간 자습 1회", strong: "100분", at: 0.38 },
  { text: "출석한 시간만", strong: "합산", at: 0.64 },
];
const RULE_FROM = lineAt(ID, 1, 0.02);
const RULE_TO = lineEnd(ID, 1) + 4;

const RuleCard: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < RULE_FROM || frame > RULE_TO) return null;
  const shown =
    tween(frame, [RULE_FROM, RULE_FROM + ZOOM_ENTER], [0, 1]) * tween(frame, [RULE_TO - ZOOM_EXIT, RULE_TO], [1, 0]);
  return (
    <div
      style={{
        position: "absolute",
        right: ZOOM_CARD_RIGHT,
        // 이번 달 상자의 왼쪽 라벨(폰 세로 가운데쯤)과 겹치지 않도록 화면 위쪽에 둔다.
        top: 150,
        display: "flex",
        flexDirection: "column",
        gap: 18,
        padding: `${ZOOM_CARD_PAD + 4}px 34px`,
        background: "#fff",
        borderRadius: 18,
        border: `3px solid ${colors.indigo600}`,
        boxShadow: "0 20px 50px rgba(15,23,42,0.12)",
        fontFamily: FONT,
        opacity: shown,
        translate: `${(shown - 1) * 20}px 0px`,
      }}
    >
      <span style={{ fontSize: 26, fontWeight: 700, color: colors.gray600, whiteSpace: "nowrap" }}>참여시간 계산</span>
      {RULES.map((rule) => {
        const at = lineAt(ID, 1, rule.at);
        const enter = tween(frame, [at, at + 12], [0, 1]);
        return (
          <div
            key={rule.text}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 14,
              opacity: enter,
              translate: `0px ${(1 - enter) * 12}px`,
            }}
          >
            <span style={{ fontSize: 26, fontWeight: 500, color: colors.gray700, whiteSpace: "nowrap" }}>{rule.text}</span>
            <span style={{ fontSize: 34, fontWeight: 800, color: colors.indigo600, whiteSpace: "nowrap" }}>{rule.strong}</span>
          </div>
        );
      })}
    </div>
  );
};

// 순위 줄은 11px 이라 영상에서 읽히지 않는다 — 학년도 누계 박스만 잘라 키운 카드를 폰 왼쪽에 둔다.
const RANK_ZOOM = 2.4;
const RANK_ZOOM_FROM = lineAt(ID, 2, 0.08);
const RANK_ZOOM_TO = lineEnd(ID, 2) + 10;

const RankZoomCard: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < RANK_ZOOM_FROM || frame > RANK_ZOOM_TO) return null;
  const shown =
    tween(frame, [RANK_ZOOM_FROM, RANK_ZOOM_FROM + ZOOM_ENTER], [0, 1]) *
    tween(frame, [RANK_ZOOM_TO - ZOOM_EXIT, RANK_ZOOM_TO], [1, 0]);
  const crop = studyHoursRect("year", STUDENT_CONTENT_W);
  const boxW = crop.w * RANK_ZOOM;
  const boxH = crop.h * RANK_ZOOM;
  return (
    <div
      style={{
        position: "absolute",
        right: ZOOM_CARD_RIGHT,
        top: phoneCenter(yearBox).y - boxH / 2 - ZOOM_CARD_PAD - 30,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: ZOOM_CARD_PAD,
        background: "#fff",
        borderRadius: 18,
        border: `3px solid ${colors.indigo600}`,
        boxShadow: "0 20px 50px rgba(15,23,42,0.12)",
        fontFamily: FONT,
        opacity: shown,
        translate: `${(shown - 1) * 20}px 0px`,
      }}
    >
      <span style={{ fontSize: 24, fontWeight: 700, color: colors.gray600, whiteSpace: "nowrap" }}>학년도 누계 확대</span>
      <div style={{ position: "relative", width: boxW, height: boxH, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transformOrigin: "top left",
            transform: `scale(${RANK_ZOOM}) translate(${-crop.x}px, ${-crop.y}px)`,
          }}
        >
          <StudyHoursCardMock width={STUDENT_CONTENT_W} />
        </div>
      </div>
    </div>
  );
};

const swipeStart = phoneAbs({ x: PHONE_BODY.w * 0.72, y: PHONE_BODY.h * 0.78 });

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const scrollY = tween(frame, [scrollFrom, scrollTo], [0, SCROLL_Y], easeInOut);
  return (
    <PhoneFrame x={PHONE_X} y={PHONE_Y} url={STUDENT_URL}>
      <StudentShellMock width={W} height={PHONE_BODY.h} tab="schedule" showHelp scrollY={scrollY}>
        <PageTitle />
        <ParticipationCardMock width={STUDENT_CONTENT_W} />
        <div style={{ height: STUDENT_CARD_GAP }} />
        <StudyHoursCardMock width={STUDENT_CONTENT_W} />
        <div style={{ height: STUDENT_CARD_GAP }} />
        <SeatCheckCardMock width={STUDENT_CONTENT_W} tab="afternoon" />
      </StudentShellMock>
    </PhoneFrame>
  );
};

export const StudyHoursScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={4} label="참여시간">
    <Stage />

    <Annotation {...between(...lines.month)} {...phoneBox(monthBox, 4, "left")} label="이번 달 출석 시간" color={colors.blue600} />
    <Annotation {...between(...lines.year)} {...phoneBox(yearBox, 4, "right")} label="이번 학년도 누계" color={colors.indigo600} />
    <Annotation {...between(...lines.rank)} {...phoneBox(rankLine, 4, "right")} label="우리 학년 안 순위" color={colors.red600} />

    <RuleCard />
    <RankZoomCard />

    <Cursor
      path={[
        { frame: scrollFrom - 12, x: swipeStart.x, y: swipeStart.y },
        { frame: scrollFrom, x: swipeStart.x, y: swipeStart.y },
        { frame: scrollTo, x: swipeStart.x, y: swipeStart.y - SCROLL_Y },
      ]}
      hideAfter={scrollTo + 6}
    />
  </GuideScene>
);
