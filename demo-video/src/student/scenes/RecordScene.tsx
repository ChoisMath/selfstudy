import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import { Annotation } from "../../components/Annotation";
import { PhoneFrame } from "../../components/PhoneFrame";
import { PHONE_X, PHONE_Y } from "../../components/phone";
import { GuideScene } from "../../guide/GuideScene";
import { textWidth } from "../../app-mocks/AttendanceHeaderMock";
import { APP_HOST } from "../../app-mocks/data";
import { PHONE_BODY, type Rect } from "../../app-mocks/layout";
import { tw } from "../../app-mocks/tw";
import { FONT } from "../../fonts";
import { colors } from "../../theme";
import { ParticipationCardMock } from "../mocks/ParticipationCardMock";
import { RecordMock, recordRect } from "../mocks/RecordMock";
import { SeatCheckCardMock } from "../mocks/SeatCheckCardMock";
import {
  StudentShellMock,
  studentShellPoint,
  STUDENT_BODY,
  STUDENT_CARD_GAP,
  STUDENT_CONTENT_W,
} from "../mocks/StudentShellMock";
import { StudyHoursCardMock } from "../mocks/StudyHoursCardMock";
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

const ID = "Record";

const RECORD_URL = `${APP_HOST}/student/attendance`;

const PAGE_TITLE_H = 28;
const PAGE_TITLE_MB = 16;

// 탭 줄(min-h-11) 높이. studentShellPoint 가 중심만 내보내므로 보이는 상자는 여기서 만든다.
const TAB_H = 44;
const TAB_PAD_X = 16;

// RecordMock 주간 표 내부 치수(w-16 인덱스 열, th py-2.5, td py-3) — recordRect 는 표 전체만 내보낸다.
const WEEK_COL0_W = 64;
const WEEK_HEAD_H = 44;
const WEEK_ROW_H = 40;
// RecordMock 월간 달력 내부 치수(요일 머리 py-2, min-h-[72px], 1px 테두리).
const CAL_HEAD_H = 28;
const CAL_CELL_H = 72;
const CAL_BORDER = 1;
// 2026-09-01 은 화요일이라 월요일 시작 격자에서 한 칸 비고 들어간다.
const CAL_START_OFFSET = 1;

// ── 프레임 ──

const tabTap = lineAt(ID, 0, 0.42);
const recordAt = tabTap + 4;
const monthTap = lineAt(ID, 3, 0.16);
const monthAt = monthTap + 4;
const prevTap = lineAt(ID, 4, 0.5);

const viewAt = (frame: number) => (frame >= monthAt ? ("month" as const) : ("week" as const));

// ── 좌표(폰 본문 기준) ──

const bodyRect = (r: Rect): Rect => ({ ...r, y: r.y + STUDENT_BODY.y });

const tabRect = (key: "tab_record", label: string): Rect => {
  const center = studentShellPoint(key);
  const w = TAB_PAD_X * 2 + textWidth(label, 14, 500);
  return { x: center.x - w / 2, y: center.y - TAB_H / 2, w, h: TAB_H };
};

const recordTab = tabRect("tab_record", "출결기록");

const weekTable = bodyRect(recordRect("table", PHONE_BODY.w, "week"));
const weekColW = (weekTable.w - WEEK_COL0_W) / 5;
const weekCell = (row: number, day: number): Rect => ({
  x: weekTable.x + WEEK_COL0_W + day * weekColW,
  y: weekTable.y + WEEK_HEAD_H + row * WEEK_ROW_H,
  w: weekColW,
  h: WEEK_ROW_H,
});
// 오후1 줄: 월=O(출석), 화=X(결석), 금=-(체크 전) — MY_RECORD.week.cells.afternoon1 과 같다.
const PRESENT_CELL = weekCell(0, 0);
const ABSENT_CELL = weekCell(0, 1);
const BLANK_CELL = weekCell(0, 4);

const reasonsBox = bodyRect(recordRect("reasons", PHONE_BODY.w, "week"));
const monthToggle = bodyRect(recordRect("toggle_month", PHONE_BODY.w, "week"));
const calendar = bodyRect(recordRect("calendar", PHONE_BODY.w, "month"));
// 범례는 왼쪽에 붙은 두 항목뿐이라 recordRect 가 주는 본문 전체 폭 대신 실제로 글자가 있는 만큼만 감싼다.
const LEGEND_ITEMS_W = 96;
const legend = ((full) => ({ ...full, w: LEGEND_ITEMS_W }))(bodyRect(recordRect("legend", PHONE_BODY.w, "month")));
const navPrev = bodyRect(recordRect("nav_prev", PHONE_BODY.w, "month"));
const navNext = bodyRect(recordRect("nav_next", PHONE_BODY.w, "month"));
const navRow: Rect = { x: navPrev.x, y: navPrev.y, w: navNext.x + navNext.w - navPrev.x, h: navPrev.h };

// 9/15 — 이번 주 표의 결석(오후1 X)이 달력에도 빨간 점으로 남는 날.
const ABSENT_DAY = 15;
const calColW = (calendar.w - CAL_BORDER * 2) / 7;
const calDayCell = (day: number): Rect => {
  const index = CAL_START_OFFSET + day - 1;
  return {
    x: calendar.x + CAL_BORDER + (index % 7) * calColW,
    y: calendar.y + CAL_BORDER + CAL_HEAD_H + Math.floor(index / 7) * CAL_CELL_H,
    w: calColW,
    h: CAL_CELL_H,
  };
};
const absentDayCell = calDayCell(ABSENT_DAY);

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

const SchedulePage: React.FC = () => (
  <>
    <PageTitle>내 참여일정</PageTitle>
    <ParticipationCardMock width={STUDENT_CONTENT_W} />
    <div style={{ height: STUDENT_CARD_GAP }} />
    <StudyHoursCardMock width={STUDENT_CONTENT_W} />
    <div style={{ height: STUDENT_CARD_GAP }} />
    <SeatCheckCardMock width={STUDENT_CONTENT_W} tab="afternoon" />
  </>
);

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const onRecord = frame >= recordAt;
  return (
    <PhoneFrame x={PHONE_X} y={PHONE_Y} url={onRecord ? RECORD_URL : `${APP_HOST}/student`}>
      <StudentShellMock
        width={PHONE_BODY.w}
        height={PHONE_BODY.h}
        tab={onRecord ? "record" : "schedule"}
        showHelp
        tabPressAt={{ tab: "record", at: tabTap }}
      >
        {onRecord ? (
          <RecordMock
            width={PHONE_BODY.w}
            view={viewAt(frame)}
            togglePressAt={{ view: "month", at: monthTap }}
            navPressAt={{ dir: "prev", at: prevTap }}
          />
        ) : (
          <SchedulePage />
        )}
      </StudentShellMock>
    </PhoneFrame>
  );
};

// 폰 안 표는 한 칸이 62×40, 달력은 53×72 라 O·X·점이 영상에서 읽히지 않는다 — 같은 칸을 키워 폰 왼쪽에 띄운다.
const ZOOM_PAD = 18;

const ZoomCard: React.FC<{
  from: number;
  to: number;
  top: number;
  color: string;
  rows: { rect: Rect; zoom: number; title: string; sub: string; tone: string; render: React.ReactNode }[];
}> = ({ from, to, top, color, rows }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame > to) return null;
  const shown = tween(frame, [from, from + 12], [0, 1]) * tween(frame, [to - 8, to], [1, 0]);
  return (
    <div
      style={{
        position: "absolute",
        right: ZOOM_CARD_RIGHT,
        top,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: `${ZOOM_PAD}px 30px`,
        background: colors.white,
        borderRadius: 18,
        border: `3px solid ${color}`,
        boxShadow: "0 20px 50px rgba(15,23,42,0.12)",
        fontFamily: FONT,
        opacity: shown,
        translate: `${(shown - 1) * 20}px 0px`,
      }}
    >
      {rows.map((row) => (
        <div key={row.title} style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: row.rect.w * row.zoom,
              height: row.rect.h * row.zoom,
              overflow: "hidden",
              position: "relative",
              flexShrink: 0,
              border: `1px solid ${colors.gray200}`,
              borderRadius: 8,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: -row.rect.x * row.zoom,
                top: -row.rect.y * row.zoom,
                transform: `scale(${row.zoom})`,
                transformOrigin: "top left",
              }}
            >
              {row.render}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: row.tone, whiteSpace: "nowrap" }}>{row.title}</span>
            <span style={{ fontSize: 19, fontWeight: 500, color: colors.gray600, whiteSpace: "nowrap" }}>{row.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// 확대 카드 안에서는 목업을 목업 자체 좌표(폰 본문 오프셋 없이)로 다시 그린다.
const localRect = (r: Rect): Rect => ({ ...r, y: r.y - STUDENT_BODY.y });

const WeekMock = <RecordMock width={PHONE_BODY.w} view="week" />;
const MonthMock = <RecordMock width={PHONE_BODY.w} view="month" />;

const WEEK_ZOOM = 3;
const CAL_ZOOM = 2.4;

export const RecordScene: React.FC<DemoProps> = () => (
  <GuideScene id={ID} step={7} label="출결기록">
    <Stage />

    <Annotation
      {...between(lineAt(ID, 0, 0.05), tabTap)}
      {...rightLabeled(recordTab, 3)}
      label="출결기록 탭"
      color={colors.blue600}
    />

    <Annotation {...between(lineAt(ID, 1, 0.08), lineEnd(ID, 1))} {...phoneBox(PRESENT_CELL, 2)} color={colors.green600} />
    <Annotation {...between(lineAt(ID, 1, 0.3), lineEnd(ID, 1))} {...phoneBox(ABSENT_CELL, 2)} color={colors.red600} />
    <Annotation {...between(lineAt(ID, 1, 0.55), lineEnd(ID, 1))} {...phoneBox(BLANK_CELL, 2)} color={colors.gray500} />
    <ZoomCard
      from={lineAt(ID, 1, 0.12)}
      to={lineEnd(ID, 1)}
      top={300}
      color={colors.blue600}
      rows={[
        { rect: localRect(PRESENT_CELL), zoom: WEEK_ZOOM, title: "O 출석", sub: "그 시간에 출석했습니다", tone: colors.green600, render: WeekMock },
        { rect: localRect(ABSENT_CELL), zoom: WEEK_ZOOM, title: "X 결석", sub: "그 시간에 결석했습니다", tone: colors.red600, render: WeekMock },
        { rect: localRect(BLANK_CELL), zoom: WEEK_ZOOM, title: "- 줄표", sub: "체크 전이거나 참여하지 않는 시간", tone: colors.gray500, render: WeekMock },
      ]}
    />

    <Annotation
      {...between(lineAt(ID, 2, 0.08), lineEnd(ID, 2))}
      {...leftLabeled(reasonsBox, 5)}
      label="결석 사유"
      color={colors.purple600}
    />

    <Annotation {...between(lineStart(ID, 3), monthTap)} {...phoneBox(monthToggle, 4)} color={colors.blue600} />
    <Annotation
      {...between(lineAt(ID, 3, 0.62), lineEnd(ID, 3))}
      {...leftLabeled(legend, 5)}
      label="초록 점 출석 · 빨간 점 결석"
      color={colors.indigo600}
    />
    <Annotation {...between(lineAt(ID, 3, 0.45), lineEnd(ID, 3))} {...phoneBox(absentDayCell, 2)} color={colors.red600} />
    <ZoomCard
      from={lineAt(ID, 3, 0.45)}
      to={lineEnd(ID, 3)}
      top={330}
      color={colors.red600}
      rows={[
        {
          rect: localRect(absentDayCell),
          zoom: CAL_ZOOM,
          title: "9월 15일",
          sub: "오후1 빨간 점 = 결석",
          tone: colors.red600,
          render: MonthMock,
        },
      ]}
    />

    <Annotation
      {...between(lineAt(ID, 4, 0.08), lineEnd(ID, 4) + 8)}
      {...leftLabeled(navRow, 4)}
      label="지난주 · 지난달 보기"
      color={colors.blue600}
    />

    <PhoneTap at={tabTap} target={rectCenter(recordTab)} endAt={recordAt} />
    <PhoneTap at={monthTap} target={rectCenter(monthToggle)} endAt={monthAt} />
    <PhoneTap at={prevTap} target={rectCenter(navPrev)} />
  </GuideScene>
);
