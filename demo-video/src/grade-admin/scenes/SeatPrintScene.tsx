import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import { APP_URL } from "../../app-mocks/data";
import { PC_VIEWPORT, PcViewport, pcRectAbs, type Point, type Rect } from "../../app-mocks/layout";
import { tw } from "../../app-mocks/tw";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";
import { FONT } from "../../fonts";
import { BROWSER, colors } from "../../theme";
import { padRect } from "../../teacher/scenes/pc-helpers";
import { GRADE, PRINT_GROUPS } from "../data";
import { GRADE_ADMIN_BODY, GradeAdminShellMock } from "../mocks/GradeAdminShellMock";
import { SeatEditorMock, seatEditorRect } from "../mocks/SeatEditorMock";
import { SeatPrintMock, seatPrintRect, type SeatPrintGroupState } from "../mocks/SeatPrintMock";
import { lineAt, lineEnd, lineStart } from "../timing";
import { SAVED_SEATS, SavedSeatLayout } from "./SeatEditScene";

const ID = "SeatPrint";
const TAB_TITLE = "포산고 자율학습";
const PRINT_TAB_TITLE = "좌석배치도 인쇄";
const W = PC_VIEWPORT.w;
const LAST_CLASS = PRINT_GROUPS[PRINT_GROUPS.length - 1].classNumber;

// 미리보기 상태 3단계 — 3반을 체크해 넣고, 3반 방향을 가로로 바꾼다.
const GROUPS_BASE: SeatPrintGroupState[] = PRINT_GROUPS.map((g) => ({ ...g }));
const GROUPS_CHECKED: SeatPrintGroupState[] = GROUPS_BASE.map((g) => (g.classNumber === LAST_CLASS ? { ...g, checked: true } : g));
const GROUPS_FINAL: SeatPrintGroupState[] = GROUPS_CHECKED.map((g) =>
  g.classNumber === LAST_CLASS ? { ...g, orientation: "landscape" as const } : g,
);

const LAST_PAGE = seatPrintRect(`page_${LAST_CLASS}`, W, GROUPS_FINAL);
const PRINT_H = LAST_PAGE.y + LAST_PAGE.h + 24;

// AdminNav(56) 만큼 내리면 툴바가 화면 맨 위에 붙고, 더 내리면 A4 한 장이 가득 찬다.
const TOOLBAR_TOP = 56;
const PAGE_VIEW = 230;

const printClick = lineAt(ID, 0, 0.32);
const switchAt = printClick + 5;
const printBoxFrom = lineAt(ID, 0, 0.08);
const tabBoxFrom = switchAt + 6;
const scroll1From = switchAt + 8;
const scroll1To = scroll1From + 12;

const chipsFrom = lineAt(ID, 1, 0.05);
const checkPress = lineAt(ID, 1, 0.22);
const orientPress = lineAt(ID, 1, 0.45);
const orientBoxFrom = orientPress + 4;
const cursorHide = lineAt(ID, 1, 0.5);

const scroll2From = lineAt(ID, 2, 0.2);
const scroll2To = scroll2From + 18;
const pageBoxFrom = scroll2To - 4;

const scroll3From = lineStart(ID, 3) + 2;
const scroll3To = scroll3From + 16;
const warnFrom = lineAt(ID, 3, 0.16);

const printScroll = (frame: number) => {
  if (frame < scroll2From) return tween(frame, [scroll1From, scroll1To], [0, TOOLBAR_TOP]);
  if (frame < scroll3From) return tween(frame, [scroll2From, scroll2To], [TOOLBAR_TOP, PAGE_VIEW]);
  return tween(frame, [scroll3From, scroll3To], [PAGE_VIEW, TOOLBAR_TOP]);
};

const groupsAt = (frame: number) => (frame >= orientPress + 3 ? GROUPS_FINAL : frame >= checkPress + 3 ? GROUPS_CHECKED : GROUPS_BASE);

// --- A4 위에 저장된 배치를 덮어 그린다 --------------------------------------------------
// SeatPrintMock 은 원본 SEAT_EDITOR 를 그리므로 SeatEdit 이 저장한 좌석만 다시 얹는다.
// 좌표는 SeatPrintMock 의 PrintPageContent 기하 그대로(셀 96x60, gap 4, 분단 사이 16,
// 세로 라벨 20 + columnGap 4 양쪽, 제목 36 + 분단 라벨 20).
const CELL_W = 96;
const CELL_H = 60;
const CELL_GAP = 4;
const DIV_CONTENT_W = CELL_W * 2 + CELL_GAP;
const DIV_PITCH = DIV_CONTENT_W + 16;
const SIDE_X = 20 + CELL_GAP * 2;
const CELLS_Y = 36 + 20;
const GROUP_CONTENT_W = DIV_CONTENT_W * 3 + 16 * 2 + (20 + CELL_GAP * 2) * 2;

const PrintCellOverlay: React.FC<{ seat: (typeof SAVED_SEATS)[number] }> = ({ seat }) => (
  <div
    style={{
      position: "absolute",
      left: SIDE_X + (seat.division - 1) * DIV_PITCH + (seat.col - 1) * (CELL_W + CELL_GAP),
      top: CELLS_Y + (seat.row - 1) * (CELL_H + CELL_GAP),
      width: CELL_W,
      height: CELL_H,
      border: `1px solid ${tw.gray[700]}`,
      borderRadius: 2,
      background: tw.white,
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    }}
  >
    {seat.student ? (
      <>
        <span style={{ fontSize: 10, color: tw.gray[500], whiteSpace: "nowrap" }}>
          {seat.student.classNumber}-{seat.student.number}
        </span>
        <span style={{ fontSize: 13, fontWeight: 500, color: tw.black, whiteSpace: "nowrap" }}>{seat.student.name}</span>
      </>
    ) : null}
  </div>
);

const PrintSavedSeats: React.FC<{ groups: SeatPrintGroupState[] }> = ({ groups }) => (
  <>
    {groups
      .filter((g) => g.checked && SAVED_SEATS.some((s) => s.classNumber === g.classNumber))
      .map((g) => {
        const content = seatPrintRect(`pageContent_${g.classNumber}`, W, groups);
        return (
          <div
            key={g.classNumber}
            style={{
              position: "absolute",
              left: content.x,
              top: content.y,
              transform: `scale(${content.w / GROUP_CONTENT_W})`,
              transformOrigin: "top left",
            }}
          >
            {SAVED_SEATS.filter((s) => s.classNumber === g.classNumber).map((s) => (
              <PrintCellOverlay key={`${s.division}-${s.row}-${s.col}`} seat={s} />
            ))}
          </div>
        );
      })}
  </>
);

// BrowserFrame 은 탭 하나만 그린다(공용 컴포넌트, 수정 금지) — 인쇄 미리보기가 열리는 새 탭은
// 탭 띠 위에 이 장면이 덧그린다. 좌표는 BrowserFrame.tsx 의 탭 줄(paddingLeft 16 + 신호등 52 + mr 14,
// 탭 높이 32 · 폭 220+padding 32)에서 그대로 따왔다.
const TAB_X = BROWSER.x + 82;
const TAB_Y = BROWSER.y + 8;
const TAB_W = 252;
const TAB_H = 32;
const TAB2_X = TAB_X + TAB_W;

const tabStyle = (active: boolean): React.CSSProperties => ({
  position: "absolute",
  top: TAB_Y,
  width: TAB_W,
  height: TAB_H,
  background: active ? "#fff" : colors.gray300,
  borderRadius: "10px 10px 0 0",
  padding: "0 16px",
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 15,
  color: active ? colors.gray700 : colors.gray500,
  boxSizing: "border-box",
  fontFamily: FONT,
});

const BrowserTabs: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < switchAt) {
    return null;
  }
  return (
    <div style={{ position: "absolute", left: 0, top: 0, opacity: tween(frame, [switchAt, switchAt + 8], [0, 1]) }}>
      <div style={{ ...tabStyle(false), left: TAB_X }}>
        <div style={{ width: 14, height: 14, borderRadius: 3, background: colors.blue600, opacity: 0.6 }} />
        <span style={{ whiteSpace: "nowrap" }}>{TAB_TITLE}</span>
      </div>
      <div style={{ ...tabStyle(true), left: TAB2_X }}>
        <div style={{ width: 14, height: 14, borderRadius: 3, background: colors.blue600 }} />
        <span style={{ whiteSpace: "nowrap" }}>{PRINT_TAB_TITLE}</span>
      </div>
    </div>
  );
};

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const onPrint = frame >= switchAt;
  return (
    <BrowserFrame
      url={onPrint ? `${APP_URL}/grade-admin/${GRADE}/seats/print` : `${APP_URL}/grade-admin/${GRADE}`}
      highlight={onPrint ? "/seats/print" : undefined}
      tabTitle={TAB_TITLE}
    >
      <PcViewport>
        {onPrint ? (
          <div style={{ position: "absolute", left: 0, top: 0, width: W, height: PC_VIEWPORT.h, overflow: "hidden", opacity: tween(frame, [switchAt, switchAt + 6], [0, 1]) }}>
            <div style={{ position: "absolute", left: 0, top: -printScroll(frame), width: W }}>
              <SeatPrintMock
                width={W}
                height={PRINT_H}
                groups={groupsAt(frame)}
                checkboxPressAt={{ classNumber: LAST_CLASS, at: checkPress }}
                orientationPressAt={{ classNumber: LAST_CLASS, orientation: "landscape", at: orientPress }}
              />
              <PrintSavedSeats groups={groupsAt(frame)} />
            </div>
          </div>
        ) : (
          <GradeAdminShellMock tab="seats" showHelp>
            <SeatEditorMock width={GRADE_ADMIN_BODY.w} height={GRADE_ADMIN_BODY.h} session="afternoon" printPressAt={printClick} />
            <SavedSeatLayout />
          </GradeAdminShellMock>
        )}
      </PcViewport>
    </BrowserFrame>
  );
};

const union = (a: Rect, b: Rect): Rect => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};
const centerOf = (r: { x: number; y: number; width: number; height: number }): Point => ({
  x: r.x + r.width / 2,
  y: r.y + r.height / 2,
});
const bodyAbs = (r: Rect) => pcRectAbs({ x: r.x, y: GRADE_ADMIN_BODY.y + r.y, w: r.w, h: r.h });
const printAbs = (r: Rect, scrollY: number) => pcRectAbs({ x: r.x, y: r.y - scrollY, w: r.w, h: r.h });

const CHIPS = union(seatPrintRect(`groupChip_${PRINT_GROUPS[0].classNumber}`, W, GROUPS_FINAL), seatPrintRect(`groupChip_${LAST_CLASS}`, W, GROUPS_FINAL));
const ORIENTATION = union(
  seatPrintRect(`groupLandscape_${LAST_CLASS}`, W, GROUPS_FINAL),
  seatPrintRect(`groupPortrait_${LAST_CLASS}`, W, GROUPS_FINAL),
);
const CHECKBOX = seatPrintRect(`groupCheckbox_${LAST_CLASS}`, W, GROUPS_CHECKED);
const PRINT_BTN = seatPrintRect("printButton", W, GROUPS_FINAL);
const PAGE_CONTENT = seatPrintRect(`pageContent_${PRINT_GROUPS[0].classNumber}`, W, GROUPS_FINAL);

export const SeatPrintScene: React.FC<DemoProps> = () => {
  const printPoint = centerOf(bodyAbs(seatEditorRect("printButton")));
  const checkboxPoint = centerOf(printAbs(CHECKBOX, TOOLBAR_TOP));
  const landscapePoint = centerOf(printAbs(seatPrintRect(`groupLandscape_${LAST_CLASS}`, W, GROUPS_CHECKED), TOOLBAR_TOP));

  return (
    <GuideScene id={ID} step={13} label="출력">
      <Stage />
      <BrowserTabs />

      <Annotation
        from={printBoxFrom}
        durationInFrames={switchAt - printBoxFrom}
        {...padRect(bodyAbs(seatEditorRect("printButton")), 5)}
        label="출력"
        labelPosition="top"
        labelAlign="start"
        color={colors.blue600}
      />
      <Annotation
        from={tabBoxFrom}
        durationInFrames={lineEnd(ID, 0) - tabBoxFrom}
        {...padRect({ x: TAB2_X, y: TAB_Y, width: TAB_W, height: TAB_H }, 4)}
        label="새 탭으로 열립니다"
        labelPosition="right"
        color={colors.green600}
      />

      {/* 문장 1 — 도움말 스틸(1, 0.7): 체크·방향을 고른 뒤 커서가 사라진 상태. */}
      <Annotation
        from={chipsFrom}
        durationInFrames={lineEnd(ID, 1) - chipsFrom}
        {...padRect(printAbs(CHIPS, TOOLBAR_TOP), 5)}
        label="인쇄할 학급"
        labelPosition="bottom"
        // 왼쪽 아래에는 툴바 안내문("가로·세로 혼합 인쇄는…")이 있어 오른쪽 끝에 붙인다.
        labelAlign="end"
        color={colors.blue600}
      />
      <Annotation
        from={orientBoxFrom}
        durationInFrames={lineEnd(ID, 1) - orientBoxFrom}
        {...padRect(printAbs(ORIENTATION, TOOLBAR_TOP), 4)}
        color={colors.green600}
      />

      <Annotation
        from={pageBoxFrom}
        durationInFrames={lineEnd(ID, 2) - pageBoxFrom}
        {...padRect(printAbs(PAGE_CONTENT, PAGE_VIEW), 6)}
        label="학급 하나에 A4 한 장"
        labelPosition="bottom"
        labelAlign="start"
        color={colors.blue600}
      />

      <Annotation
        from={warnFrom}
        durationInFrames={lineEnd(ID, 3) + 10 - warnFrom}
        {...padRect(printAbs(PRINT_BTN, TOOLBAR_TOP), 5)}
        label="저장한 배치만 인쇄됩니다"
        labelPosition="bottom"
        labelAlign="end"
      />

      <Cursor
        path={[
          { frame: lineStart(ID, 0) + 6, x: printPoint.x - 140, y: printPoint.y + 230 },
          { frame: printClick - 7, x: printPoint.x, y: printPoint.y },
          { frame: printClick + 10, x: printPoint.x, y: printPoint.y },
        ]}
        clicks={[printClick]}
        hideAfter={printClick + 12}
      />
      <Cursor
        path={[
          { frame: lineStart(ID, 1) + 4, x: checkboxPoint.x + 60, y: checkboxPoint.y + 220 },
          { frame: checkPress - 6, x: checkboxPoint.x, y: checkboxPoint.y },
          { frame: checkPress + 10, x: checkboxPoint.x, y: checkboxPoint.y },
          { frame: orientPress - 6, x: landscapePoint.x, y: landscapePoint.y },
          { frame: cursorHide, x: landscapePoint.x, y: landscapePoint.y },
        ]}
        clicks={[checkPress, orientPress]}
        hideAfter={cursorHide}
      />
    </GuideScene>
  );
};
