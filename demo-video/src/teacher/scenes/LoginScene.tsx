import React from "react";
import { useCurrentFrame } from "remotion";
import { Annotation } from "../../components/Annotation";
import { FlashNotice } from "../../components/FlashNotice";
import { PHONE, PhoneFrame } from "../../components/PhoneFrame";
import { PHONE_CROP, PHONE_X, PHONE_Y } from "../../components/phone";
import { WIDTH, colors } from "../../theme";
import { tween } from "../../anim";
import { GuideScene } from "../../guide/GuideScene";
import { lineAt, lineEnd, lineStart } from "../timing";
import { AttendanceBoardMock, baseVisual, buildAfternoonGroups } from "../../app-mocks/AttendanceBoardMock";
import { LoginMock, loginPoint, loginRect } from "../../app-mocks/LoginMock";
import { APP_HOST, ME } from "../../app-mocks/data";
import { PHONE_BODY, type Rect } from "../../app-mocks/layout";
import type { DemoProps } from "../../props";
import { BOARD_URL, TapCursor, between, boardProps, phoneBox } from "./AttendanceTourScene";

const ID = "Login";

const INITIAL_PASSWORD = "1111";
const LOGIN_URL = `${APP_HOST}/login`;
const PAGE_FADE_FRAMES = 8;

const urlTapAt = lineAt(ID, 0, 0.1);
const urlTypeFrom = lineAt(ID, 0, 0.16);
const urlTypeTo = lineAt(ID, 0, 0.42);
const loginPageAt = lineAt(ID, 0, 0.55);
const teacherTabFrom = lineAt(ID, 1, 0.1);
const idTapAt = lineAt(ID, 2, 0.04);
const idTypeFrom = lineAt(ID, 2, 0.08);
const passwordTapAt = lineAt(ID, 2, 0.36);
const passwordTypeFrom = lineAt(ID, 2, 0.4);
const fieldNotesTo = lineAt(ID, 2, 0.86);
const submitAt = lineAt(ID, 2, 0.9);
// 버튼이 눌려 들어간 뒤에 "로그인 중..."으로 바뀐다.
const submittingFrom = submitAt + 4;
const boardAt = lineEnd(ID, 2) + 6;

const W = PHONE_BODY.w;
// PhoneFrame 주소창(가로 여백 14px, 높이 32px 알약)의 폰 본문 기준 위치 — 본문 위 urlH 안에서 세로 가운데.
const URL_PILL: Rect = { x: 14, y: -PHONE.urlH + (PHONE.urlH - 32) / 2, w: PHONE.w - 28, h: 32 };

// FlashNotice 는 화면 맨 위(top 16)에 가운데 정렬로 그려져 폰 상태 표시줄을 가린다 — 폰 오른쪽 빈 칸 안에서 가운데 오도록 감싼다.
const NOTICE_GAP = 24;
const NOTICE_COLUMN = { x: PHONE_CROP.x + PHONE_CROP.w + NOTICE_GAP, y: 420 };
const NOTICE_COLUMN_W = WIDTH - NOTICE_COLUMN.x - NOTICE_GAP;

const BOARD = boardProps({ tab: "afternoon1", groups: buildAfternoonGroups((id) => baseVisual(id)) });

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const typed = Math.round(tween(frame, [urlTypeFrom, urlTypeTo], [0, APP_HOST.length]));
  const url = frame >= boardAt ? BOARD_URL : frame >= loginPageAt ? LOGIN_URL : APP_HOST.slice(0, typed);
  const loginShown = tween(frame, [loginPageAt, loginPageAt + PAGE_FADE_FRAMES], [0, 1]);
  const boardShown = tween(frame, [boardAt, boardAt + PAGE_FADE_FRAMES], [0, 1]);
  return (
    <PhoneFrame x={PHONE_X} y={PHONE_Y} url={url}>
      {frame >= loginPageAt && boardShown < 1 ? (
        <div style={{ position: "absolute", inset: 0, opacity: loginShown }}>
          <LoginMock
            width={W}
            height={PHONE_BODY.h}
            tab="teacher"
            fields={{
              first: { text: ME.loginId, typeFrom: idTypeFrom },
              second: { text: INITIAL_PASSWORD, typeFrom: passwordTypeFrom, masked: true },
            }}
            submitPressAt={submitAt}
            submitting={frame >= submittingFrom}
          />
        </div>
      ) : null}
      {boardShown > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: boardShown }}>
          <AttendanceBoardMock {...BOARD} />
        </div>
      ) : null}
    </PhoneFrame>
  );
};

export const LoginScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={1} label="로그인">
    <Stage />

    <Annotation {...between(urlTapAt, lineEnd(ID, 0))} {...phoneBox(URL_PILL, 4, "left")} label="self.posan.kr 접속" color={colors.blue600} />
    <Annotation {...between(teacherTabFrom, lineEnd(ID, 1) + 4)} {...phoneBox(loginRect("tab_teacher", W), 4, "left")} label="교사 로그인 탭" color={colors.blue600} />
    <Annotation {...between(lineStart(ID, 2), fieldNotesTo)} {...phoneBox(loginRect("field_first", W), 4, "left")} label="NEIS 아이디" color={colors.red600} />
    <Annotation {...between(passwordTapAt - 4, fieldNotesTo)} {...phoneBox(loginRect("field_second", W), 4, "left")} label="초기 비밀번호 1111" color={colors.red600} />

    <TapCursor at={urlTapAt} target={{ x: URL_PILL.x + URL_PILL.w / 2, y: URL_PILL.y + URL_PILL.h / 2 }} />
    <TapCursor at={idTapAt} target={loginPoint("field_first", W)} />
    <TapCursor at={passwordTapAt} target={loginPoint("field_second", W)} />
    <TapCursor at={submitAt} target={loginPoint("submit", W)} />

    <div style={{ position: "absolute", left: NOTICE_COLUMN.x, top: NOTICE_COLUMN.y, width: NOTICE_COLUMN_W }}>
      <FlashNotice
        from={lineStart(ID, 3)}
        durationInFrames={lineEnd(ID, 3) - lineStart(ID, 3) + 10}
        text="비밀번호 1111은 꼭 바꿔 주세요"
        hint="방법은 영상 마지막에 안내"
      />
    </div>
  </GuideScene>
);
