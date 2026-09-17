import React from "react";
import { useCurrentFrame } from "remotion";
import { Annotation } from "../../components/Annotation";
import { FlashNotice } from "../../components/FlashNotice";
import { PHONE, PhoneFrame } from "../../components/PhoneFrame";
import { PHONE_CROP, PHONE_X, PHONE_Y } from "../../components/phone";
import { FONT } from "../../fonts";
import { WIDTH, colors } from "../../theme";
import { tween } from "../../anim";
import { GuideScene } from "../../guide/GuideScene";
import { lineAt, lineEnd, lineStart } from "../timing";
import { LoginMock, loginPoint, loginRect } from "../../app-mocks/LoginMock";
import { APP_HOST } from "../../app-mocks/data";
import { PHONE_BODY, type Rect } from "../../app-mocks/layout";
import { tw } from "../../app-mocks/tw";
import { ParticipationCardMock } from "../mocks/ParticipationCardMock";
import { SeatCheckCardMock } from "../mocks/SeatCheckCardMock";
import { StudentShellMock, STUDENT_CARD_GAP, STUDENT_CONTENT_W } from "../mocks/StudentShellMock";
import { StudyHoursCardMock } from "../mocks/StudyHoursCardMock";
import { ME_STUDENT, ME_STUDENT_CODE } from "../data";
import type { DemoProps } from "../../props";
import {
  PhoneTap,
  ZOOM_CARD_PAD,
  ZOOM_CARD_RIGHT,
  ZOOM_ENTER,
  between,
  phoneBox,
  phoneCenter,
} from "../../teacher/scenes/phone-helpers";

const ID = "Login";

const LOGIN_URL = `${APP_HOST}/login`;
const STUDENT_URL = `${APP_HOST}/student`;
const PAGE_FADE_FRAMES = 8;

const W = PHONE_BODY.w;

const urlTapAt = lineAt(ID, 0, 0.1);
const urlTypeFrom = lineAt(ID, 0, 0.16);
const urlTypeTo = lineAt(ID, 0, 0.45);
const loginPageAt = lineAt(ID, 0, 0.6);
const studentTabAt = lineAt(ID, 1, 0.35);
const nameTapAt = lineAt(ID, 2, 0.05);
const nameTypeFrom = nameTapAt + 3;
const codeTapAt = lineAt(ID, 2, 0.45);
const codeTypeFrom = codeTapAt + 3;
const hintFrom = lineAt(ID, 3, 0.05);
const ruleCardAt = lineAt(ID, 3, 0.1);
const exampleRowAt = lineAt(ID, 3, 0.52);
const submitAt = lineAt(ID, 4, 0.08);
// 버튼이 눌려 들어간 뒤에 "로그인 중..."으로 바뀐다.
const submittingFrom = submitAt + 4;
const schedulePageAt = submitAt + 20;

// PhoneFrame 주소창(가로 여백 14px, 높이 32px 알약)의 폰 본문 기준 위치 — 본문 위 urlH 안에서 세로 가운데.
const URL_PILL: Rect = { x: 14, y: -PHONE.urlH + (PHONE.urlH - 32) / 2, w: PHONE.w - 28, h: 32 };

// FlashNotice 는 화면 맨 위(top 16)에 가운데 정렬로 그려져 폰 상태 표시줄을 가린다 — 폰 오른쪽 빈 칸 안에서 가운데 오도록 감싼다.
const NOTICE_GAP = 24;
const NOTICE_COLUMN = { x: PHONE_CROP.x + PHONE_CROP.w + NOTICE_GAP, y: 430 };
const NOTICE_COLUMN_W = WIDTH - NOTICE_COLUMN.x - NOTICE_GAP;

// student/page.tsx h2(text-xl mb-4) — 목업은 제목을 그리지 않아 장면이 같은 크기로 그린다.
const PageTitle: React.FC = () => (
  <div style={{ height: 28, marginBottom: 16, fontSize: 20, fontWeight: 700, color: tw.gray[900], whiteSpace: "nowrap" }}>
    내 참여일정
  </div>
);

const SchedulePage: React.FC = () => (
  <StudentShellMock width={W} height={PHONE_BODY.h} tab="schedule" showHelp>
    <PageTitle />
    <ParticipationCardMock width={STUDENT_CONTENT_W} />
    <div style={{ height: STUDENT_CARD_GAP }} />
    <StudyHoursCardMock width={STUDENT_CONTENT_W} />
    <div style={{ height: STUDENT_CARD_GAP }} />
    <SeatCheckCardMock width={STUDENT_CONTENT_W} tab="afternoon" />
  </StudentShellMock>
);

// 학번 다섯 자리를 학년·반·번호로 쪼개 보이는 영상 장치 — 폰 안 도움말(12px)이 영상에서 읽히지 않는다.
const CODE_PARTS: { digits: string; label: string; color: string }[] = [
  { digits: ME_STUDENT_CODE.slice(0, 1), label: "학년", color: colors.blue600 },
  { digits: ME_STUDENT_CODE.slice(1, 3), label: "반", color: colors.indigo600 },
  { digits: ME_STUDENT_CODE.slice(3, 5), label: "번호", color: colors.red600 },
];

const CodeCard: React.FC = () => {
  const frame = useCurrentFrame();
  const to = lineEnd(ID, 3);
  if (frame < ruleCardAt || frame > to) return null;
  const shown = tween(frame, [ruleCardAt, ruleCardAt + ZOOM_ENTER], [0, 1]) * tween(frame, [to - 8, to], [1, 0]);
  const exampleShown = tween(frame, [exampleRowAt, exampleRowAt + 12], [0, 1]);
  return (
    <div
      style={{
        position: "absolute",
        right: ZOOM_CARD_RIGHT,
        top: phoneCenter(loginRect("hint", W)).y - 150,
        display: "flex",
        flexDirection: "column",
        gap: 22,
        padding: `${ZOOM_CARD_PAD + 6}px 34px`,
        background: "#fff",
        borderRadius: 18,
        border: `3px solid ${colors.blue600}`,
        boxShadow: "0 20px 50px rgba(15,23,42,0.12)",
        fontFamily: FONT,
        opacity: shown,
        translate: `${(shown - 1) * 20}px 0px`,
      }}
    >
      <span style={{ fontSize: 26, fontWeight: 700, color: colors.gray600, whiteSpace: "nowrap" }}>학번 5자리</span>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
        {CODE_PARTS.map((part) => (
          <div key={part.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 56, fontWeight: 800, color: part.color, letterSpacing: 2, whiteSpace: "nowrap" }}>
              {part.digits}
            </span>
            <span style={{ fontSize: 22, fontWeight: 600, color: part.color, whiteSpace: "nowrap" }}>{part.label}</span>
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          paddingTop: 18,
          borderTop: `2px solid ${colors.gray200}`,
          opacity: exampleShown,
          translate: `0px ${(1 - exampleShown) * 10}px`,
        }}
      >
        <span style={{ fontSize: 24, fontWeight: 600, color: colors.gray700, whiteSpace: "nowrap" }}>
          {ME_STUDENT.grade}학년 {ME_STUDENT.classNumber}반 {ME_STUDENT.number}번
        </span>
        <span style={{ fontSize: 24, color: colors.gray400, whiteSpace: "nowrap" }}>→</span>
        <span style={{ fontSize: 30, fontWeight: 800, color: colors.blue700, whiteSpace: "nowrap" }}>
          {ME_STUDENT_CODE}
        </span>
      </div>
    </div>
  );
};

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const typed = Math.round(tween(frame, [urlTypeFrom, urlTypeTo], [0, APP_HOST.length]));
  const url =
    frame >= schedulePageAt ? STUDENT_URL : frame >= loginPageAt ? LOGIN_URL : APP_HOST.slice(0, typed);
  const loginShown = tween(frame, [loginPageAt, loginPageAt + PAGE_FADE_FRAMES], [0, 1]);
  const pageShown = tween(frame, [schedulePageAt, schedulePageAt + PAGE_FADE_FRAMES], [0, 1]);
  return (
    <PhoneFrame x={PHONE_X} y={PHONE_Y} url={url}>
      {frame >= loginPageAt && pageShown < 1 ? (
        <div style={{ position: "absolute", inset: 0, opacity: loginShown }}>
          <LoginMock
            width={W}
            height={PHONE_BODY.h}
            tab={frame >= studentTabAt ? "student" : "teacher"}
            tabPressAt={studentTabAt}
            fields={{
              first: { text: ME_STUDENT.name, typeFrom: nameTypeFrom },
              second: { text: ME_STUDENT_CODE, typeFrom: codeTypeFrom },
            }}
            submitPressAt={submitAt}
            submitting={frame >= submittingFrom}
          />
        </div>
      ) : null}
      {pageShown > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: pageShown }}>
          <SchedulePage />
        </div>
      ) : null}
    </PhoneFrame>
  );
};

export const LoginScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={1} label="로그인">
    <Stage />

    <Annotation
      {...between(urlTapAt, lineEnd(ID, 0))}
      {...phoneBox(URL_PILL, 4, "left")}
      label={`${APP_HOST} 접속`}
      color={colors.blue600}
    />
    <Annotation
      {...between(lineAt(ID, 1, 0.1), lineEnd(ID, 1) + 4)}
      {...phoneBox(loginRect("tab_student", W), 4, "left")}
      label="학생 로그인 탭"
      color={colors.blue600}
    />
    <Annotation
      {...between(lineStart(ID, 2), lineEnd(ID, 2) + 4)}
      {...phoneBox(loginRect("field_first", W), 4, "left")}
      label="이름"
      color={colors.red600}
    />
    <Annotation
      {...between(codeTapAt - 4, lineEnd(ID, 2) + 4)}
      {...phoneBox(loginRect("field_second", W), 4, "left")}
      label="학번 5자리"
      color={colors.red600}
    />
    <Annotation
      {...between(hintFrom, lineEnd(ID, 3))}
      {...phoneBox(loginRect("hint", W), 4, "right")}
      label="학번 만드는 법"
      color={colors.blue600}
    />
    <CodeCard />

    <PhoneTap at={urlTapAt} target={{ x: URL_PILL.x + URL_PILL.w / 2, y: URL_PILL.y + URL_PILL.h / 2 }} />
    <PhoneTap at={studentTabAt} target={loginPoint("tab_student", W)} />
    <PhoneTap at={nameTapAt} target={loginPoint("field_first", W)} />
    <PhoneTap at={codeTapAt} target={loginPoint("field_second", W)} />
    <PhoneTap at={submitAt} target={loginPoint("submit", W)} endAt={schedulePageAt - 6} />

    <div style={{ position: "absolute", left: NOTICE_COLUMN.x, top: NOTICE_COLUMN.y, width: NOTICE_COLUMN_W }}>
      <FlashNotice
        from={lineAt(ID, 4, 0.45)}
        durationInFrames={lineEnd(ID, 4) - lineAt(ID, 4, 0.45) + 10}
        text="로그인 상태가 유지됩니다"
        hint="다음부터 주소만 열면 바로 사용"
      />
    </div>
  </GuideScene>
);
