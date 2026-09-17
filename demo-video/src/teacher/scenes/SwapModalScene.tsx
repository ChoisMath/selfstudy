import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import { APP_URL, SUPERVISOR_SEPT, SWAP_EXAMPLE, TEACHERS } from "../../app-mocks/data";
import { PC_SCALE, PcViewport, pcAbs, pcRectAbs } from "../../app-mocks/layout";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { FlashNotice } from "../../components/FlashNotice";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";
import { BROWSER, colors } from "../../theme";
import { HomeroomShellMock } from "../mocks/HomeroomShellMock";
import { SwapModalMock, swapModalPoint, swapModalRect } from "../mocks/SwapModalMock";
import { lineAt, lineEnd, lineStart } from "../timing";
import {
  InsetCard,
  SWAPPED_SEPT,
  SchedulePage,
  TAB_TITLE,
  calendarRowRect,
  insetCardSize,
  insetRectAbs,
  labelGapBelowCell,
  padRect,
  type InsetCrop,
} from "./pc-helpers";

const ID = "SwapModal";

const SWAP_GRADE = SWAP_EXAMPLE.grade;

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

const PANEL = swapModalRect("panel");

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const swapped = frame >= changedFrom;
  const modalOpacity =
    tween(frame, [modalOpenAt, modalOpenAt + MODAL_FADE_IN], [0, 1]) *
    tween(frame, [modalCloseAt, modalCloseAt + MODAL_FADE_OUT], [1, 0]);
  const modalVisible = frame >= modalOpenAt && frame < modalCloseAt + MODAL_FADE_OUT;
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
            <SwapModalMock
              date={SWAP_EXAMPLE.date}
              grade={SWAP_GRADE}
              search={{ text: SEARCH_TEXT, typeFrom }}
              dropdownOpenAt={searchClick + 2}
              picked={frame >= pickAt ? SWAP_EXAMPLE.to : undefined}
              reason={{ text: SWAP_EXAMPLE.reason, typeFrom: reasonTypeFrom }}
              confirmPressAt={confirmClick}
              busy={frame >= busyFrom}
            />
          </div>
        ) : null}
      </PcViewport>
    </BrowserFrame>
  );
};

// 다른 학년 선생님을 고른 경우 — 교체를 한 번 누르면 경고와 "확인 후 교체"가 나온다(앱 handleSwapSubmit).
const INSET_CROP: InsetCrop = { rect: PANEL, scale: PC_SCALE };
const INSET_SIZE = insetCardSize(INSET_CROP);
const INSET_CARD = {
  x: BROWSER.x + 40,
  y: BROWSER.y + BROWSER.chrome + (BROWSER.h - BROWSER.chrome - INSET_SIZE.height) / 2,
};
const INSET_BOTTOM = INSET_CARD.y + INSET_SIZE.height;

const OtherGradeModal: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SwapModalMock
      date={OTHER_GRADE_DATE}
      grade={SWAP_GRADE}
      search={{ text: "" }}
      picked={OTHER_GRADE_TEACHER}
      otherGrade={frame >= warningAt}
      reason={{ text: SWAP_EXAMPLE.reason }}
      confirmPressAt={frame >= insetSecondPress ? insetSecondPress : insetFirstPress}
      busy={frame >= insetSecondPress + 4}
    />
  );
};

export const SwapModalScene: React.FC<DemoProps> = () => {
  const row = pcRectAbs(calendarRowRect(SWAP_EXAMPLE.date, SWAP_GRADE));
  const rowPoint = { x: row.x + row.width * 0.72, y: row.y + row.height / 2 };
  const search = pcAbs(swapModalPoint("search"));
  // pickClick 시점엔 "이수"까지 다 입력돼 목록이 이수민 한 명으로 걸러져 있다.
  const option = pcAbs(swapModalPoint(`option_${SWAP_EXAMPLE.to}`, SEARCH_TEXT));
  const reason = pcAbs(swapModalPoint("reason"));
  const confirm = pcAbs(swapModalPoint("confirm"));
  const searchBox = pcRectAbs(swapModalRect("search"));
  const reasonBox = pcRectAbs(swapModalRect("reason"));
  const warningBox = insetRectAbs(INSET_CARD, INSET_CROP, swapModalRect("warning"));
  const insetConfirmBox = insetRectAbs(INSET_CARD, INSET_CROP, swapModalRect("confirm"));
  const insetConfirmPoint = { x: insetConfirmBox.x + insetConfirmBox.width * 0.85, y: insetConfirmBox.y + insetConfirmBox.height * 0.75 };
  // 라벨은 카드 경계에 걸치지 않게 카드 아래(완전히 바깥)에 둔다.
  const insetConfirmLabelGap = INSET_BOTTOM - (insetConfirmBox.y + insetConfirmBox.height + 5) + 10;
  const confirmCursor = { x: confirm.x + 58, y: confirm.y + 12 };

  return (
    <GuideScene id={ID} step={11} label="감독 교체">
      <Stage />
      <Annotation
        from={rowFrom}
        durationInFrames={rowClick - rowFrom}
        {...padRect(row, 2)}
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
        {...padRect(row, 2)}
        label="오후1·오후2·야간 모두 이수민"
        labelPosition="bottom"
        labelAlign="end"
        labelGap={labelGapBelowCell(SWAP_EXAMPLE.date, SWAP_GRADE, 2)}
        color={colors.green600}
      />
      <InsetCard card={INSET_CARD} crop={INSET_CROP} title="다른 학년 선생님을 고르면" from={insetIn} out={insetOut}>
        <OtherGradeModal />
      </InsetCard>
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
        labelPosition="bottom"
        labelAlign="end"
        labelGap={insetConfirmLabelGap}
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
