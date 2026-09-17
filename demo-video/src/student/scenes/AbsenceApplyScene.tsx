import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import { Annotation } from "../../components/Annotation";
import { PhoneFrame } from "../../components/PhoneFrame";
import { PHONE_X, PHONE_Y } from "../../components/phone";
import { GuideScene } from "../../guide/GuideScene";
import { textWidth } from "../../app-mocks/AttendanceHeaderMock";
import { APP_HOST, type Session } from "../../app-mocks/data";
import { PHONE_BODY, type Rect } from "../../app-mocks/layout";
import { tw } from "../../app-mocks/tw";
import { FONT } from "../../fonts";
import { colors } from "../../theme";
import { AbsenceFormMock, absenceFormRect, SuccessBannerMock } from "../mocks/AbsenceFormMock";
import { ParticipationCardMock, participationCardHeight, participationCellRect } from "../mocks/ParticipationCardMock";
import { SeatCheckCardMock } from "../mocks/SeatCheckCardMock";
import { StudentShellMock, STUDENT_BODY, STUDENT_CARD_GAP, STUDENT_CONTENT_W } from "../mocks/StudentShellMock";
import { StudyHoursCardMock } from "../mocks/StudyHoursCardMock";
import { ABSENCE_FORM_EXAMPLE, PARTICIPATION } from "../data";
import { lineAt, lineEnd, lineStart } from "../timing";
import {
  between,
  leftLabeled,
  phoneBox,
  PhoneTap,
  rectCenter,
  rightLabeled,
  ZOOM_CARD_RIGHT,
} from "../../teacher/scenes/phone-helpers";
import type { DemoProps } from "../../props";

const ID = "AbsenceApply";

const STUDENT_URL = `${APP_HOST}/student`;

// StudentShellMock 본문(main px-2 py-6)의 패딩. 흐름 배치되는 카드만 이 값을 타고,
// 페이지 여백을 스스로 그리는 목업(AbsenceFormMock 등)은 절대배치라 그대로 본문 원점에 놓인다.
const BODY_PAD_X = 8;
const BODY_PAD_TOP = 24;
const PAGE_TITLE_H = 28;
const PAGE_TITLE_MB = 16;
// SuccessBannerMock 의 고정 높이(불참목록 보기 링크의 min-h-11) — 목업이 값을 내보내지 않는다.
const BANNER_H = 44;
const BANNER_MB = 16;

// AbsenceFormMock 의 PAD_TOP + FORM_PAD — "닫기" 버튼 좌표는 absenceFormRect 가 내보내지 않아 직접 잡는다.
const FORM_HEADER_Y = 24 + 16;
const FORM_HEADER_H = 44;
const FORM_SIDE = 8 + 16;
const CLOSE_W = 32 + textWidth("닫기", 13, 500);

const MONDAY = 0;
const MONDAY_CELL: Session = "afternoon1";
const DISABLED_ON_MONDAY = PARTICIPATION.filter((row) => !row.days[MONDAY]).map((row) => row.session);
const ACTIVE_ON_MONDAY = PARTICIPATION.filter((row) => row.days[MONDAY]).map((row) => row.session);
const CUSTOM_DETAIL = "사촌 결혼식";

// ── 프레임 ──

const cellTap = lineAt(ID, 0, 0.62);
const formAt = lineAt(ID, 1, 0.3);
const allTap = lineAt(ID, 4, 0.5);
const allAt = allTap + 3;
const dropTap = lineAt(ID, 4, 0.85);
const dropAt = dropTap + 3;
const customTap = lineAt(ID, 5, 0.4);
const customAt = customTap + 3;
const detailFrom = customAt + 8;
const academyTap = lineAt(ID, 5, 0.88);
const academyAt = academyTap + 3;
const submitTap = lineAt(ID, 6, 0.22);
const busyFrom = submitTap + 3;
const bannerAt = submitTap + 16;
const reopenTap = lineAt(ID, 7, 0.06);
const reopenAt = reopenTap + 5;
const closeTap = lineAt(ID, 7, 0.84);
const closeAt = closeTap + 5;

type View = "schedule" | "form" | "done" | "recheck";

const viewAt = (frame: number): View => {
  if (frame >= closeAt) return "done";
  if (frame >= reopenAt) return "recheck";
  if (frame >= bannerAt) return "done";
  if (frame >= formAt) return "form";
  return "schedule";
};

// 전체를 누르면 그날 참여하는 시간이 모두 선택되고, 오후2를 다시 누르면 빠진다(toggleAll / toggleSessionType).
const sessionsAt = (frame: number): Session[] => {
  if (frame >= dropAt || frame < allAt) return ABSENCE_FORM_EXAMPLE.sessions;
  return ACTIVE_ON_MONDAY;
};

const reasonAt = (frame: number) =>
  frame >= academyAt || frame < customAt ? ABSENCE_FORM_EXAMPLE.reason : ("custom" as const);

// ── 좌표(폰 본문 기준) ──

const bodyRect = (r: Rect): Rect => ({ ...r, y: r.y + STUDENT_BODY.y });
const formRect = (key: Parameters<typeof absenceFormRect>[0]): Rect => bodyRect(absenceFormRect(key, PHONE_BODY.w));

const CARD_TOP = STUDENT_BODY.y + BODY_PAD_TOP + PAGE_TITLE_H + PAGE_TITLE_MB;
// 성공 배너가 뜬 뒤에는 페이지 전체가 배너 높이만큼 아래로 밀린다.
const CARD_TOP_WITH_BANNER = CARD_TOP + BANNER_H + BANNER_MB;
const CELL = participationCellRect(MONDAY_CELL, MONDAY, STUDENT_CONTENT_W);
const cellBodyAt = (cardTop: number): Rect => ({ ...CELL, x: CELL.x + BODY_PAD_X, y: CELL.y + cardTop });
const cellBody = cellBodyAt(CARD_TOP);
const cellBodyAfterBanner = cellBodyAt(CARD_TOP_WITH_BANNER);
const gridBody: Rect = { x: BODY_PAD_X, y: CARD_TOP, w: STUDENT_CONTENT_W, h: participationCardHeight() };

const dateField = formRect("date");
const sessionRow = (() => {
  const first = absenceFormRect("session_afternoon1", PHONE_BODY.w);
  const all = absenceFormRect("all", PHONE_BODY.w);
  return bodyRect({ x: first.x, y: first.y, w: all.x + all.w - first.x, h: first.h });
})();
const session1 = formRect("session_afternoon1");
const session2 = formRect("session_afternoon2");
const allButton = formRect("all");
const reasonCustom = formRect("reason_custom");
const reasonAcademy = formRect("reason_academy");
const reasonRow = (() => {
  const first = absenceFormRect("reason_academy", PHONE_BODY.w);
  const last = absenceFormRect("reason_custom", PHONE_BODY.w);
  return bodyRect({ x: first.x, y: first.y, w: last.x + last.w - first.x, h: first.h });
})();
const detailField = formRect("detail");
const submitButton = formRect("submit");
const closeButton: Rect = bodyRect({
  x: PHONE_BODY.w - FORM_SIDE - CLOSE_W,
  y: FORM_HEADER_Y,
  w: CLOSE_W,
  h: FORM_HEADER_H,
});
const bannerBody: Rect = { x: BODY_PAD_X, y: STUDENT_BODY.y + BODY_PAD_TOP, w: STUDENT_CONTENT_W, h: BANNER_H };

// ── 화면 ──

const PageTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      height: PAGE_TITLE_H,
      lineHeight: `${PAGE_TITLE_H}px`,
      marginBottom: PAGE_TITLE_MB,
      fontSize: 20,
      fontWeight: 700,
      color: tw.gray[900],
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </div>
);

const SchedulePage: React.FC<{ pressCellAt?: number; banner?: number }> = ({ pressCellAt, banner }) => (
  <>
    {banner === undefined ? null : (
      <div style={{ position: "relative", marginLeft: -BODY_PAD_X, width: PHONE_BODY.w, height: BANNER_H, marginBottom: BANNER_MB }}>
        <SuccessBannerMock width={PHONE_BODY.w} from={banner} />
      </div>
    )}
    <PageTitle>내 참여일정</PageTitle>
    <ParticipationCardMock
      width={STUDENT_CONTENT_W}
      cellPressAt={pressCellAt === undefined ? undefined : { session: MONDAY_CELL, weekday: MONDAY, at: pressCellAt }}
    />
    <div style={{ height: STUDENT_CARD_GAP }} />
    <StudyHoursCardMock width={STUDENT_CONTENT_W} />
    <div style={{ height: STUDENT_CARD_GAP }} />
    <SeatCheckCardMock width={STUDENT_CONTENT_W} tab="afternoon" />
  </>
);

const FormPage: React.FC<{ frame: number }> = ({ frame }) => {
  const reason = reasonAt(frame);
  return (
    <AbsenceFormMock
      width={PHONE_BODY.w}
      date={ABSENCE_FORM_EXAMPLE.date}
      sessions={sessionsAt(frame)}
      disabledSessions={DISABLED_ON_MONDAY}
      allPressAt={allTap}
      sessionPressAt={{ session: "afternoon2", at: dropTap }}
      reason={reason}
      reasonPressAt={frame >= academyTap ? { reason: "academy", at: academyTap } : { reason: "custom", at: customTap }}
      detail={reason === "custom" ? { text: CUSTOM_DETAIL, typeFrom: detailFrom } : undefined}
      submitPressAt={submitTap}
      busy={frame >= busyFrom && frame < bannerAt}
    />
  );
};

const RecheckPage: React.FC = () => (
  <AbsenceFormMock
    width={PHONE_BODY.w}
    date={ABSENCE_FORM_EXAMPLE.date}
    sessions={ABSENCE_FORM_EXAMPLE.sessions}
    disabledSessions={DISABLED_ON_MONDAY}
    reason={ABSENCE_FORM_EXAMPLE.reason}
  />
);

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const view = viewAt(frame);
  return (
    <PhoneFrame x={PHONE_X} y={PHONE_Y} url={STUDENT_URL}>
      <StudentShellMock width={PHONE_BODY.w} height={PHONE_BODY.h} tab="schedule" showHelp>
        {view === "form" ? (
          <FormPage frame={frame} />
        ) : view === "recheck" ? (
          <RecheckPage />
        ) : (
          <SchedulePage
            pressCellAt={view === "schedule" ? cellTap : reopenTap}
            banner={view === "done" ? bannerAt : undefined}
          />
        )}
      </StudentShellMock>
    </PhoneFrame>
  );
};

// 폰 안 격자 칸은 54×44 라 "다음주" 캡션이 영상에서 읽히지 않는다 — 같은 칸을 3배로 키워 폰 왼쪽에 띄운다.
const ZOOM = 3;
const ZOOM_PAD = 18;

const NextWeekZoomCard: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame > to) return null;
  const shown = tween(frame, [from, from + 12], [0, 1]) * tween(frame, [to - 8, to], [1, 0]);
  return (
    <div
      style={{
        position: "absolute",
        right: ZOOM_CARD_RIGHT,
        top: 456,
        display: "flex",
        alignItems: "center",
        gap: 26,
        padding: `${ZOOM_PAD}px 30px ${ZOOM_PAD}px ${ZOOM_PAD + 6}px`,
        background: colors.white,
        borderRadius: 18,
        border: `3px solid ${colors.blue600}`,
        boxShadow: "0 20px 50px rgba(15,23,42,0.12)",
        fontFamily: FONT,
        opacity: shown,
        translate: `${(shown - 1) * 20}px 0px`,
      }}
    >
      <div style={{ width: CELL.w * ZOOM, height: CELL.h * ZOOM, overflow: "hidden", position: "relative", flexShrink: 0 }}>
        <div style={{ position: "absolute", left: -CELL.x * ZOOM, top: -CELL.y * ZOOM, transform: `scale(${ZOOM})`, transformOrigin: "top left" }}>
          <ParticipationCardMock width={STUDENT_CONTENT_W} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: colors.blue600, whiteSpace: "nowrap" }}>다음주</span>
        <span style={{ fontSize: 20, fontWeight: 500, color: colors.gray600, whiteSpace: "nowrap" }}>
          이미 지난 요일은 다음 주 날짜로
        </span>
      </div>
    </div>
  );
};

export const AbsenceApplyScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={6} label="불참 신청">
    <Stage />

    <Annotation
      {...between(lineAt(ID, 0, 0.08), cellTap)}
      {...leftLabeled(gridBody, 5)}
      label="참여일정 표"
      color={colors.blue600}
    />
    <Annotation
      {...between(lineAt(ID, 0, 0.42), formAt)}
      {...phoneBox(cellBody, 4)}
      color={colors.red600}
    />

    <Annotation
      {...between(formAt + 6, lineEnd(ID, 1))}
      {...rightLabeled({ x: FORM_SIDE, y: STUDENT_BODY.y + FORM_HEADER_Y, w: 160, h: FORM_HEADER_H }, 4)}
      label="같은 화면이 신청서로"
      color={colors.indigo600}
    />

    <Annotation
      {...between(lineAt(ID, 2, 0.06), lineStart(ID, 3))}
      {...leftLabeled(dateField, 4)}
      label={`${ABSENCE_FORM_EXAMPLE.dateLabel} 자동 입력`}
      color={colors.blue600}
    />
    <Annotation
      {...between(lineAt(ID, 2, 0.55), lineStart(ID, 3))}
      {...rightLabeled(session1, 4)}
      label="누른 줄이 선택됨"
      color={colors.indigo600}
    />

    <Annotation
      {...between(lineAt(ID, 3, 0.1), lineEnd(ID, 3))}
      {...leftLabeled(dateField, 4)}
      label="날짜를 꼭 확인"
      color={colors.red600}
    />
    <NextWeekZoomCard from={lineAt(ID, 3, 0.1)} to={lineEnd(ID, 3)} />

    <Annotation
      {...between(lineAt(ID, 4, 0.05), allTap)}
      {...leftLabeled(session2, 4)}
      label="하나씩 더 고르거나"
      color={colors.blue600}
    />
    <Annotation
      {...between(allAt + 4, dropTap)}
      {...rightLabeled(allButton, 4)}
      label="그날 참여하는 시간 모두"
      color={colors.green600}
    />
    <Annotation {...between(dropAt + 2, lineEnd(ID, 4) + 6)} {...phoneBox(sessionRow, 4)} color={colors.indigo600} />

    <Annotation
      {...between(lineAt(ID, 5, 0.05), customTap)}
      {...leftLabeled(reasonRow, 4)}
      label="학원 · 방과후 · 질병 · 기타"
      color={colors.blue600}
    />
    <Annotation
      {...between(customAt + 4, academyTap)}
      {...leftLabeled(detailField, 4)}
      label="기타면 상세 사유 칸이 열림"
      color={colors.purple600}
    />

    <Annotation {...between(lineStart(ID, 6), submitTap)} {...phoneBox(submitButton, 4)} color={colors.blue600} />
    <Annotation
      {...between(bannerAt + 6, lineEnd(ID, 6))}
      {...leftLabeled(bannerBody, 5)}
      label="접수 완료"
      color={colors.green600}
    />

    <Annotation
      {...between(lineAt(ID, 7, 0.22), closeTap)}
      {...leftLabeled(dateField, 4)}
      label="지난 날짜는 고를 수 없음"
      color={colors.red600}
    />
    <Annotation
      {...between(lineAt(ID, 7, 0.5), closeTap)}
      {...rightLabeled(closeButton, 4)}
      label="그만두려면 닫기"
      color={colors.gray600}
    />

    <PhoneTap at={cellTap} target={rectCenter(cellBody)} endAt={formAt} />
    <PhoneTap at={allTap} target={rectCenter(allButton)} />
    <PhoneTap at={dropTap} target={rectCenter(session2)} />
    <PhoneTap at={customTap} target={rectCenter(reasonCustom)} />
    <PhoneTap at={academyTap} target={rectCenter(reasonAcademy)} />
    <PhoneTap at={submitTap} target={rectCenter(submitButton)} endAt={bannerAt} />
    <PhoneTap at={reopenTap} target={rectCenter(cellBodyAfterBanner)} endAt={reopenAt} />
    <PhoneTap at={closeTap} target={rectCenter(closeButton)} endAt={closeAt} />
  </GuideScene>
);
