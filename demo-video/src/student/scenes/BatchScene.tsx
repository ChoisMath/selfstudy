import React from "react";
import { useCurrentFrame } from "remotion";
import { easeInOut, tween } from "../../anim";
import { Annotation } from "../../components/Annotation";
import { FlashNotice } from "../../components/FlashNotice";
import { PhoneFrame } from "../../components/PhoneFrame";
import { PHONE_CROP, PHONE_X, PHONE_Y } from "../../components/phone";
import { GuideScene } from "../../guide/GuideScene";
import { textWidth } from "../../app-mocks/AttendanceHeaderMock";
import { APP_HOST, TODAY, type Session } from "../../app-mocks/data";
import { PHONE_BODY, type Rect } from "../../app-mocks/layout";
import { colors, WIDTH } from "../../theme";
import { NativeDialogMock, nativeDialogPoint } from "../../teacher/mocks/NativeDialogMock";
import { AbsenceListMock } from "../mocks/AbsenceListMock";
import { BatchAbsenceMock, batchRect } from "../mocks/BatchAbsenceMock";
import { StudentShellMock, studentShellPoint, STUDENT_BODY } from "../mocks/StudentShellMock";
import { lineAt, lineEnd, lineStart } from "../timing";
import { between, leftLabeled, phoneBox, PhoneTap, rectCenter, rightLabeled } from "../../teacher/scenes/phone-helpers";
import type { DemoProps } from "../../props";

const ID = "Batch";

const BATCH_URL = `${APP_HOST}/student/batch-absence`;
const LIST_URL = `${APP_HOST}/student/absence-requests`;

// 탭 줄(min-h-11) — studentShellPoint 는 중심만 내보내므로 보이는 상자는 여기서 만든다.
const TAB_H = 44;
const TAB_PAD_X = 16;

// FlashNotice 는 화면 맨 위(top 16)에 가운데 정렬로 그려져 폰 상태 표시줄을 가린다 — 교사 편 LoginScene 처럼
// 폰 오른쪽 빈 칸 안에서 가운데 오도록 감싼다.
const NOTICE_GAP = 24;
const NOTICE_COLUMN = { x: PHONE_CROP.x + PHONE_CROP.w + NOTICE_GAP, y: 300 };
const NOTICE_COLUMN_W = WIDTH - NOTICE_COLUMN.x - NOTICE_GAP;

// BatchAbsenceMock 본문 위쪽(main py-6 + 제목 줄) — batchRect 는 표부터만 내보낸다.
const BATCH_PAD_X = 8;
const BATCH_PAD_TOP = 24;
const BATCH_TITLE_H = 24;

// 표 머리(30) + 12행 × 56 + 버튼까지 내려가야 "일괄신청" 버튼이 보인다.
const SCROLL_SUBMIT = 212;
// 체크한 두 줄이 표 머리 바로 아래에 오는 위치.
const SCROLL_ROWS = 64;

// 학급 도우미가 대신 신청해 주는 두 친구(목업 갤러리 Student-Batch 와 같은 조합).
const FIRST_NO = 1;
const SECOND_NO = 4;
const FIRST_SESSION: Session = "afternoon1";
const SECOND_SESSION: Session = "night";
const ALERT_MESSAGE = "2건 신청 완료";

// ── 프레임 ──

const tabTap = lineAt(ID, 2, 0.08);
const batchAt = tabTap + 4;
// 네 번의 누름은 커서가 서로 겹치지 않도록 같은 간격(≈36프레임)으로 벌리고, 앞의 세 번은 endAt 으로 바로 걷는다.
const TAP_ENDS = 8;
const check1Tap = lineAt(ID, 3, 0.08);
const check1At = check1Tap + 3;
const sess1Tap = lineAt(ID, 3, 0.33);
const sess1At = sess1Tap + 3;
const check2Tap = lineAt(ID, 3, 0.58);
const check2At = check2Tap + 3;
const sess2Tap = lineAt(ID, 3, 0.83);
const sess2At = sess2Tap + 3;
const scrollDownFrom = lineEnd(ID, 3) - 4;
const scrollDownTo = lineStart(ID, 4) + 8;
const submitTap = lineAt(ID, 4, 0.25);
const busyFrom = submitTap + 3;
const alertOpen = submitTap + 12;
const okTap = lineAt(ID, 4, 0.82);
const alertClose = okTap + 4;
const scrollUpFrom = alertClose + 2;
const scrollUpTo = lineStart(ID, 5) + 10;

const scrollAt = (frame: number) =>
  frame >= scrollUpFrom
    ? tween(frame, [scrollUpFrom, scrollUpTo], [SCROLL_SUBMIT, SCROLL_ROWS], easeInOut)
    : tween(frame, [scrollDownFrom, scrollDownTo], [0, SCROLL_SUBMIT], easeInOut);

const checkedAt = (frame: number): number[] =>
  frame >= check2At ? [FIRST_NO, SECOND_NO] : frame >= check1At ? [FIRST_NO] : [];

const picksAt = (frame: number): Record<number, Session[]> => {
  if (frame >= sess2At) return { [FIRST_NO]: [FIRST_SESSION], [SECOND_NO]: [SECOND_SESSION] };
  if (frame >= sess1At) return { [FIRST_NO]: [FIRST_SESSION] };
  return {};
};

// ── 좌표(폰 본문 기준) ──

const bodyRect = (r: Rect): Rect => ({ ...r, y: r.y + STUDENT_BODY.y });

const batchTab = ((center) => {
  const w = TAB_PAD_X * 2 + textWidth("일괄신청", 14, 500);
  return { x: center.x - w / 2, y: center.y - TAB_H / 2, w, h: TAB_H };
})(studentShellPoint("tab_batch"));

const titleRow = bodyRect({ x: BATCH_PAD_X, y: BATCH_PAD_TOP, w: PHONE_BODY.w - BATCH_PAD_X * 2, h: BATCH_TITLE_H });
const tableHeader = bodyRect(batchRect("header", PHONE_BODY.w, 0));
const check1 = bodyRect(batchRect(`check_${FIRST_NO}`, PHONE_BODY.w, 0));
const session1 = bodyRect(batchRect(`session_${FIRST_NO}_${FIRST_SESSION}`, PHONE_BODY.w, 0));
const check2 = bodyRect(batchRect(`check_${SECOND_NO}`, PHONE_BODY.w, 0));
const session2 = bodyRect(batchRect(`session_${SECOND_NO}_${SECOND_SESSION}`, PHONE_BODY.w, 0));
const reasonCell = bodyRect(batchRect(`reason_academy_${FIRST_NO}`, PHONE_BODY.w, 0));
const detailCell = bodyRect(batchRect(`reason_detail_${FIRST_NO}`, PHONE_BODY.w, 0));
const reasonBlock: Rect = {
  x: reasonCell.x,
  y: reasonCell.y,
  w: detailCell.x + detailCell.w - reasonCell.x,
  h: reasonCell.h,
};
const submitButton = bodyRect(batchRect("submit", PHONE_BODY.w, SCROLL_SUBMIT));
const firstRowAfterScroll = bodyRect(batchRect(`row_${FIRST_NO}`, PHONE_BODY.w, SCROLL_ROWS));
const secondRowAfterScroll = bodyRect(batchRect(`row_${SECOND_NO}`, PHONE_BODY.w, SCROLL_ROWS));
const okPoint = nativeDialogPoint("ok", PHONE_BODY.w, PHONE_BODY.h, "alert", ALERT_MESSAGE);

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const onBatch = frame >= batchAt;
  const alerting = frame >= alertOpen && frame < alertClose;
  return (
    <PhoneFrame x={PHONE_X} y={PHONE_Y} url={onBatch ? BATCH_URL : LIST_URL}>
      <StudentShellMock
        width={PHONE_BODY.w}
        height={PHONE_BODY.h}
        tab={onBatch ? "batch" : "absences"}
        showBatchTab
        showHelp
        tabPressAt={{ tab: "batch", at: tabTap }}
      >
        {onBatch ? (
          <BatchAbsenceMock
            width={PHONE_BODY.w}
            height={STUDENT_BODY.h}
            checked={checkedAt(frame)}
            sessionPicks={picksAt(frame)}
            reason="academy"
            rowPressAt={frame >= check2Tap ? { studentNo: SECOND_NO, at: check2Tap } : { studentNo: FIRST_NO, at: check1Tap }}
            sessionPressAt={
              frame >= sess2Tap
                ? { studentNo: SECOND_NO, session: SECOND_SESSION, at: sess2Tap }
                : { studentNo: FIRST_NO, session: FIRST_SESSION, at: sess1Tap }
            }
            submitPressAt={submitTap}
            busy={frame >= busyFrom && frame < alertOpen}
            scrollY={scrollAt(frame)}
          />
        ) : (
          <AbsenceListMock width={PHONE_BODY.w} />
        )}
      </StudentShellMock>
      {alerting ? (
        <NativeDialogMock
          width={PHONE_BODY.w}
          height={PHONE_BODY.h}
          kind="alert"
          message={ALERT_MESSAGE}
          openAt={alertOpen}
          okPressAt={okTap}
        />
      ) : null}
    </PhoneFrame>
  );
};

export const BatchScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={9} label="일괄신청">
    <Stage />

    <Annotation
      {...between(lineAt(ID, 0, 0.12), lineEnd(ID, 0))}
      {...rightLabeled(batchTab, 3)}
      label="도우미에게만 보이는 탭"
      color={colors.blue600}
    />
    <div style={{ position: "absolute", left: NOTICE_COLUMN.x, top: NOTICE_COLUMN.y, width: NOTICE_COLUMN_W }}>
      <FlashNotice
        {...between(lineAt(ID, 1, 0.08), lineEnd(ID, 1) + 6)}
        text="도우미로 지정된 뒤 다시 로그인"
        hint="그래야 탭이 나타납니다"
      />
    </div>

    <Annotation
      {...between(batchAt + 6, lineAt(ID, 2, 0.6))}
      {...leftLabeled(titleRow, 4)}
      label={`일괄 불참신청 · ${TODAY}`}
      color={colors.indigo600}
    />
    <Annotation
      {...between(lineAt(ID, 2, 0.5), lineEnd(ID, 2))}
      {...leftLabeled(tableHeader, 4)}
      label="같은 반 친구 명단"
      color={colors.blue600}
    />

    <Annotation {...between(lineStart(ID, 3), sess1Tap)} {...phoneBox(check1, 4)} color={colors.blue600} />
    <Annotation {...between(sess1At, check2Tap)} {...rightLabeled(session1, 3)} label="빠지는 시간" color={colors.red600} />
    <Annotation {...between(check2Tap - 6, sess2Tap)} {...phoneBox(check2, 4)} color={colors.blue600} />
    <Annotation
      {...between(lineAt(ID, 3, 0.62), scrollDownFrom)}
      {...leftLabeled(reasonBlock, 3)}
      label="사유 선택"
      color={colors.purple600}
    />

    <Annotation
      {...between(scrollUpTo, lineEnd(ID, 5))}
      {...leftLabeled(firstRowAfterScroll, 3)}
      label="친구 이름으로 접수"
      color={colors.green600}
    />
    <Annotation {...between(scrollUpTo + 6, lineEnd(ID, 5))} {...phoneBox(secondRowAfterScroll, 3)} color={colors.green600} />

    <PhoneTap at={tabTap} target={rectCenter(batchTab)} endAt={batchAt} />
    <PhoneTap at={check1Tap} target={rectCenter(check1)} endAt={check1Tap + TAP_ENDS} />
    <PhoneTap at={sess1Tap} target={rectCenter(session1)} endAt={sess1Tap + TAP_ENDS} />
    <PhoneTap at={check2Tap} target={rectCenter(check2)} endAt={check2Tap + TAP_ENDS} />
    <PhoneTap at={sess2Tap} target={rectCenter(session2)} />
    <PhoneTap at={submitTap} target={rectCenter(submitButton)} endAt={alertOpen} />
    <PhoneTap at={okTap} target={okPoint} endAt={alertClose} />
  </GuideScene>
);
