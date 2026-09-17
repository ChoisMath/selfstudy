import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import { APP_URL, SUPERVISOR_SEPT, SWAP_EXAMPLE, TEACHERS } from "../../app-mocks/data";
import { PC_SCALE, PC_VIEWPORT, PcViewport, pcAbs, pcRectAbs, type Point } from "../../app-mocks/layout";
import { tw } from "../../app-mocks/tw";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { FlashNotice } from "../../components/FlashNotice";
import { FONT } from "../../fonts";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";
import { BROWSER, colors } from "../../theme";
import { HomeroomShellMock } from "../mocks/HomeroomShellMock";
import { SwapModalMock, swapModalPoint } from "../mocks/SwapModalMock";
import { lineAt, lineEnd, lineStart } from "../timing";
import { SchedulePage, TAB_TITLE, calendarRowRect, padRect } from "./SwapEntryScene";

const ID = "SwapModal";

const SWAP_GRADE = SWAP_EXAMPLE.grade as 1;

export const SWAPPED_SEPT: typeof SUPERVISOR_SEPT = {
  ...SUPERVISOR_SEPT,
  [SWAP_EXAMPLE.date]: { ...SUPERVISOR_SEPT[SWAP_EXAMPLE.date], [SWAP_GRADE]: SWAP_EXAMPLE.to },
};

const SEARCH_TEXT = "이수";
const OTHER_GRADE_TEACHER = TEACHERS.find((t) => t.primaryGrade !== SWAP_GRADE)?.name ?? "";
const OTHER_GRADE_DATE = "2026-09-29";

const rowFrom = lineAt(ID, 0, 0.15);
const rowClick = lineAt(ID, 1, 0.15);
const modalOpenAt = rowClick + 6;
const searchClick = lineAt(ID, 2, 0.05);
const typeFrom = lineAt(ID, 2, 0.15);
const pickClick = lineAt(ID, 2, 0.36);
const pickAt = pickClick + 2;
const reasonClick = lineAt(ID, 2, 0.5);
const reasonTypeFrom = lineAt(ID, 2, 0.56);
const confirmClick = lineAt(ID, 3, 0.1);
const busyFrom = confirmClick + 4;
const modalCloseAt = confirmClick + 16;
const changedFrom = modalCloseAt + 8;
const insetIn = lineAt(ID, 4, 0.02);
const insetFirstPress = lineAt(ID, 4, 0.3);
const warningAt = insetFirstPress + 4;
const insetSecondPress = lineAt(ID, 4, 0.72);
const insetOut = lineEnd(ID, 4);

const MODAL_FADE_IN = 8;
const MODAL_FADE_OUT = 6;

// SwapModalMock 패널(max-w-md 근사 420 폭, 화면 가운데) — 목업이 패널 좌표를 내보내지 않아 확인 버튼 위치에서 되짚는다.
const PANEL_W = 420;
const PANEL_PAD = 24;
const FOOTER_H = 38;
const confirmPoint = swapModalPoint("confirm");
const panelY = PC_VIEWPORT.h - (confirmPoint.y + FOOTER_H / 2 + PANEL_PAD);
const PANEL = { x: (PC_VIEWPORT.w - PANEL_W) / 2, y: panelY, w: PANEL_W, h: PC_VIEWPORT.h - panelY * 2 };
const FIELD_W = PANEL_W - PANEL_PAD * 2;
const SEARCH_H = 38;
const REASON_H = 54;

// 앱 TeacherSearchSelect 는 입력한 글자로 목록을 거른다. 목업 드롭다운은 거르지 않아 입력 뒤 목록은 장면에서 그린다.
const DROP_ROW_H = 30;
const searchPoint = swapModalPoint("search");
const filteredDrop = { x: searchPoint.x - FIELD_W / 2, y: searchPoint.y + SEARCH_H / 2 + 4, w: FIELD_W, h: DROP_ROW_H + 2 };
const filteredTeachers = TEACHERS.filter((t) => t.name.includes(SEARCH_TEXT));

// SwapModalMock 우회: 취소·교체 버튼 left 에 뷰포트 x(CANCEL_X·CONFIRM_X)를 패널 안에서 그대로 써서 패널 x 만큼 오른쪽
// 바깥에 그려진다. 마지막 두 자식(취소·교체)만 되돌려 swapModalPoint 위치에 맞춘다. 목업이 고쳐지면 이 스타일을 지울 것.
const SWAP_FOOTER_FIX_CSS = `[data-swap-footer-fix] > div > div > div:nth-last-child(-n+2) { translate: ${-PANEL.x}px 0px; }`;

const SwapModal: React.FC<React.ComponentProps<typeof SwapModalMock>> = (props) => (
  <div data-swap-footer-fix="" style={{ position: "absolute", inset: 0 }}>
    <style>{SWAP_FOOTER_FIX_CSS}</style>
    <SwapModalMock {...props} />
  </div>
);

const FilteredDropdown: React.FC = () => (
  <div
    style={{
      position: "absolute",
      left: filteredDrop.x,
      top: filteredDrop.y,
      width: filteredDrop.w,
      background: tw.white,
      border: `1px solid ${tw.gray[200]}`,
      borderRadius: 6,
      boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
      boxSizing: "border-box",
      overflow: "hidden",
      fontFamily: FONT,
    }}
  >
    {filteredTeachers.map((t, idx) => (
      <div
        key={t.id}
        style={{
          height: DROP_ROW_H,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 6,
          fontSize: 13,
          background: idx === 0 ? tw.blue[50] : tw.white,
          color: idx === 0 ? tw.blue[700] : tw.gray[700],
          whiteSpace: "nowrap",
        }}
      >
        <span>{t.name}</span>
        <span style={{ fontSize: 11, color: tw.gray[400] }}>{t.primaryGrade}학년</span>
      </div>
    ))}
  </div>
);

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const swapped = frame >= changedFrom;
  const modalOpacity =
    tween(frame, [modalOpenAt, modalOpenAt + MODAL_FADE_IN], [0, 1]) *
    tween(frame, [modalCloseAt, modalCloseAt + MODAL_FADE_OUT], [1, 0]);
  const modalVisible = frame >= modalOpenAt && frame < modalCloseAt + MODAL_FADE_OUT;
  const filtering = frame >= typeFrom && frame < pickAt;
  return (
    <BrowserFrame url={`${APP_URL}/homeroom/schedule`} tabTitle={TAB_TITLE}>
      <PcViewport>
        <HomeroomShellMock tab="schedule" role="homeroom" showHelp>
          <SchedulePage
            assignments={swapped ? SWAPPED_SEPT : SUPERVISOR_SEPT}
            rowPressAt={{ date: SWAP_EXAMPLE.date, grade: SWAP_GRADE, at: rowClick }}
            changedCell={swapped ? { date: SWAP_EXAMPLE.date, grade: SWAP_GRADE, from: changedFrom } : undefined}
          />
        </HomeroomShellMock>
        {modalVisible ? (
          <div style={{ position: "absolute", inset: 0, opacity: modalOpacity }}>
            <SwapModal
              date={SWAP_EXAMPLE.date}
              grade={SWAP_GRADE}
              search={{ text: SEARCH_TEXT, typeFrom }}
              dropdownOpenAt={frame < typeFrom ? searchClick + 2 : undefined}
              picked={frame >= pickAt ? SWAP_EXAMPLE.to : undefined}
              reason={{ text: SWAP_EXAMPLE.reason, typeFrom: reasonTypeFrom }}
              confirmPressAt={confirmClick}
              busy={frame >= busyFrom}
            />
            {filtering ? <FilteredDropdown /> : null}
          </div>
        ) : null}
      </PcViewport>
    </BrowserFrame>
  );
};

// 다른 학년 선생님을 고른 경우 — 교체를 한 번 누르면 경고와 "확인 후 교체"가 나온다(앱 handleSwapSubmit).
const INSET_SCALE = PC_SCALE;
const INSET_PAD = 18;
const INSET_TITLE_H = 40;
const INSET_W = PANEL.w * INSET_SCALE + INSET_PAD * 2;
const INSET_H = INSET_TITLE_H + PANEL.h * INSET_SCALE + INSET_PAD * 2;
const INSET_X = BROWSER.x + 40;
const INSET_Y = BROWSER.y + BROWSER.chrome + (BROWSER.h - BROWSER.chrome - INSET_H) / 2;
const insetAbs = (p: Point): Point => ({
  x: INSET_X + INSET_PAD + (p.x - PANEL.x) * INSET_SCALE,
  y: INSET_Y + INSET_PAD + INSET_TITLE_H + (p.y - PANEL.y) * INSET_SCALE,
});

const OtherGradeInset: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = tween(frame, [insetIn, insetIn + 10], [0, 1]) * tween(frame, [insetOut, insetOut + 6], [1, 0]);
  if (frame < insetIn || frame > insetOut + 6) {
    return null;
  }
  const lift = tween(frame, [insetIn, insetIn + 12], [16, 0]);
  return (
    <div
      style={{
        position: "absolute",
        left: INSET_X,
        top: INSET_Y,
        width: INSET_W,
        height: INSET_H,
        opacity,
        translate: `0px ${lift}px`,
        background: colors.white,
        borderRadius: 16,
        boxShadow: "0 18px 44px rgba(15,23,42,0.28), 0 0 0 1px rgba(15,23,42,0.08)",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: INSET_PAD,
          top: INSET_PAD,
          height: INSET_TITLE_H,
          display: "flex",
          alignItems: "center",
          fontSize: 22,
          fontWeight: 700,
          color: colors.gray700,
          whiteSpace: "nowrap",
        }}
      >
        다른 학년 선생님을 고르면
      </div>
      <div
        style={{
          position: "absolute",
          left: INSET_PAD,
          top: INSET_PAD + INSET_TITLE_H,
          width: PANEL.w * INSET_SCALE,
          height: PANEL.h * INSET_SCALE,
          overflow: "hidden",
          borderRadius: 8 * INSET_SCALE,
          boxShadow: `0 0 0 1px ${colors.gray200}`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -PANEL.x * INSET_SCALE,
            top: -PANEL.y * INSET_SCALE,
            width: PC_VIEWPORT.w,
            height: PC_VIEWPORT.h,
            transform: `scale(${INSET_SCALE})`,
            transformOrigin: "top left",
          }}
        >
          <SwapModal
            date={OTHER_GRADE_DATE}
            grade={SWAP_GRADE}
            search={{ text: "" }}
            picked={OTHER_GRADE_TEACHER}
            otherGrade={frame >= warningAt}
            reason={{ text: SWAP_EXAMPLE.reason }}
            confirmPressAt={frame >= insetSecondPress ? insetSecondPress : insetFirstPress}
            busy={frame >= insetSecondPress + 4}
          />
        </div>
      </div>
    </div>
  );
};

export const SwapModalScene: React.FC<DemoProps> = () => {
  const row = pcRectAbs(calendarRowRect(SWAP_EXAMPLE.date, SWAP_GRADE));
  const rowPoint = { x: row.x + row.width * 0.72, y: row.y + row.height / 2 };
  const search = pcAbs(searchPoint);
  const option = pcAbs({ x: filteredDrop.x + 60, y: filteredDrop.y + DROP_ROW_H / 2 });
  const reason = pcAbs(swapModalPoint("reason"));
  const confirm = pcAbs(confirmPoint);
  const searchBox = pcRectAbs({ x: searchPoint.x - FIELD_W / 2, y: searchPoint.y - SEARCH_H / 2, w: FIELD_W, h: SEARCH_H });
  const reasonPoint = swapModalPoint("reason");
  const reasonBox = pcRectAbs({ x: reasonPoint.x - FIELD_W / 2, y: reasonPoint.y - REASON_H / 2, w: FIELD_W, h: REASON_H });
  const insetConfirm = insetAbs(confirmPoint);
  const warningBox = {
    x: INSET_X + INSET_PAD + PANEL_PAD * INSET_SCALE,
    y: insetConfirm.y - (FOOTER_H / 2 + 20 + 40) * INSET_SCALE,
    width: FIELD_W * INSET_SCALE,
    height: 40 * INSET_SCALE,
  };
  const insetConfirmBox = {
    x: insetConfirm.x - 66 * INSET_SCALE,
    y: insetConfirm.y - (FOOTER_H / 2) * INSET_SCALE,
    width: 132 * INSET_SCALE,
    height: FOOTER_H * INSET_SCALE,
  };
  const insetConfirmPoint = { x: insetConfirm.x + 58, y: insetConfirm.y + 12 };
  const confirmCursor = { x: confirm.x + 58, y: confirm.y + 12 };

  return (
    <GuideScene id={ID} step={11} label="감독 교체">
      <Stage />
      <Annotation
        from={rowFrom}
        durationInFrames={rowClick - rowFrom}
        {...padRect(row, 5)}
        label="교체 버튼"
        labelAlign="end"
      />
      <Annotation
        from={pickAt + 4}
        durationInFrames={confirmClick - pickAt - 4}
        {...padRect(searchBox, 2)}
        label="교체할 선생님"
        labelPosition="left"
        labelGap={24}
      />
      <Annotation
        from={reasonTypeFrom}
        durationInFrames={confirmClick - reasonTypeFrom}
        {...padRect(reasonBox, 2)}
        label="필요하면 사유 입력"
        labelPosition="left"
        labelGap={24}
        color={colors.blue600}
      />
      <Annotation
        from={changedFrom + 6}
        durationInFrames={insetIn - changedFrom - 6}
        {...padRect(row, 5)}
        label="오후1·오후2·야간 모두 이수민"
        labelPosition="bottom"
        labelAlign="end"
        color={colors.green600}
      />
      <OtherGradeInset />
      <Annotation
        from={warningAt + 6}
        durationInFrames={insetOut - warningAt - 6}
        {...padRect(warningBox, 5)}
        color={colors.red600}
      />
      <Annotation
        from={warningAt + 12}
        durationInFrames={insetOut - warningAt - 12}
        {...padRect(insetConfirmBox, 5)}
        label="한 번 더 누르기"
        labelPosition="right"
      />
      <FlashNotice
        from={lineStart(ID, 5) + 6}
        durationInFrames={lineEnd(ID, 5) - lineStart(ID, 5)}
        text="교체 기록은 관리자에게 남습니다"
        hint="바꾸기 전에 상대 선생님과 먼저 이야기해 주세요"
      />
      <Cursor
        path={[
          { frame: lineStart(ID, 0) + 10, x: 1560, y: 800 },
          { frame: lineAt(ID, 0, 0.55), x: rowPoint.x, y: rowPoint.y },
          { frame: rowClick + 4, x: rowPoint.x, y: rowPoint.y },
          { frame: searchClick - 2, x: search.x, y: search.y },
          { frame: typeFrom + 6, x: search.x, y: search.y },
          { frame: pickClick - 2, x: option.x, y: option.y },
          { frame: pickClick + 4, x: option.x, y: option.y },
          { frame: reasonClick - 2, x: reason.x, y: reason.y },
          { frame: reasonTypeFrom + 4, x: reason.x + 140, y: reason.y + 70 },
          { frame: lineEnd(ID, 2), x: reason.x + 140, y: reason.y + 70 },
          { frame: confirmClick - 2, x: confirmCursor.x, y: confirmCursor.y },
          { frame: modalCloseAt, x: confirmCursor.x, y: confirmCursor.y },
          { frame: changedFrom + 10, x: row.x + row.width + 120, y: row.y + 150 },
          { frame: insetFirstPress - 2, x: insetConfirmPoint.x, y: insetConfirmPoint.y },
          { frame: insetSecondPress + 6, x: insetConfirmPoint.x, y: insetConfirmPoint.y },
        ]}
        clicks={[rowClick, searchClick, pickClick, reasonClick, confirmClick, insetFirstPress, insetSecondPress]}
        hideAfter={insetOut}
      />
    </GuideScene>
  );
};
