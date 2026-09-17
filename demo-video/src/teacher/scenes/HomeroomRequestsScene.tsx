import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { GuideScene } from "../../guide/GuideScene";
import { FONT } from "../../fonts";
import { APP_HOST } from "../../app-mocks/data";
import { PC_VIEWPORT, PcViewport, pcAbs, pcRectAbs, type Point, type Rect } from "../../app-mocks/layout";
import { pressScale } from "../../app-mocks/primitives";
import { colors } from "../../theme";
import { lineAt, lineEnd, lineStart } from "../timing";
import { AbsenceReasonFormMock } from "../mocks/AbsenceReasonFormMock";
import { HOMEROOM_BODY, HomeroomShellMock, homeroomTabPoint } from "../mocks/HomeroomShellMock";
import { HomeroomRequestsMock, homeroomRequestsPoint, type HomeroomRequestFilter } from "../mocks/HomeroomRequestsMock";
import type { DemoProps } from "../../props";

const ID = "HomeroomRequests";
const W = HOMEROOM_BODY.w;
const APPROVE_ID = 4;
const SUPERVISOR_REVIEWED_ID = 7;
const ROW_COUNT_ALL = 5;
// 앞 장면에서 이미 끝난 입력·등록 — 첫 프레임부터 완료된 모습으로 그린다.
const SETTLED = -1000;

// HomeroomRequestsMock 내부 치수(앱 absence-requests/page.tsx 압축판) — 머리 34, 행 52, 상태 열 96, 처리 열 140.
const HEAD_H = 34;
const ROW_H = 52;
const STATUS_COL_W = 96;
const ACTION_COL_W = 140;
const ACTION_GROUP_W = 84;
const ACTION_BTN_H = 22;
// homeroomRequestsPoint 는 처리 열을 (열 x + 26)부터 승인 폭 44로 잡는다.
const POINT_GROUP_INSET = 26;
const POINT_APPROVE_HALF = 22;
const FILTER_PENDING_W = 64;
const FILTER_H = 26;

const tabClick = lineAt(ID, 0, 0.2);
const pageSwap = tabClick + 3;
const pendingClick = lineAt(ID, 1, 0.1);
const approveClick = lineAt(ID, 1, 0.42);
const confirmOpen = approveClick + 6;
const okClick = lineAt(ID, 1, 0.9);
const confirmClose = okClick + 5;
const approvedFrom = okClick + 7;
const allClick = lineAt(ID, 2, 0.08);

// 브라우저 기본 confirm 창(크롬 데스크톱) — 앱 CSS가 그리지 않는 UI라 크롬 기본 색을 쓴다.
const CONFIRM = { w: 360, top: 10, padX: 20, padY: 16, buttonW: 64, buttonH: 28, gap: 8, titleH: 17, messageGap: 10, buttonsGap: 18 } as const;
const CONFIRM_H = CONFIRM.padY * 2 + CONFIRM.titleH * 2 + CONFIRM.messageGap + CONFIRM.buttonsGap + CONFIRM.buttonH;
const CONFIRM_X = (PC_VIEWPORT.w - CONFIRM.w) / 2;
const confirmOkPoint: Point = {
  x: CONFIRM_X + CONFIRM.w - CONFIRM.padX - CONFIRM.buttonW / 2,
  y: CONFIRM.top + CONFIRM_H - CONFIRM.padY - CONFIRM.buttonH / 2,
};

const BrowserConfirm: React.FC<{ message: string; openAt: number; closeAt: number; okPressAt: number }> = ({ message, openAt, closeAt, okPressAt }) => {
  const frame = useCurrentFrame();
  if (frame < openAt || frame >= closeAt) return null;
  const enter = tween(frame, [openAt, openAt + 8], [0, 1]);
  const button = (label: string, primary: boolean, pressAt?: number): React.ReactNode => (
    <div
      style={{
        width: CONFIRM.buttonW,
        height: CONFIRM.buttonH,
        borderRadius: CONFIRM.buttonH / 2,
        boxSizing: "border-box",
        border: primary ? "none" : "1px solid #dadce0",
        background: primary ? "#1a73e8" : "#fff",
        color: primary ? "#fff" : "#1a73e8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: 500,
        whiteSpace: "nowrap",
        scale: String(pressScale(frame, pressAt)),
      }}
    >
      {label}
    </div>
  );
  return (
    <div
      style={{
        position: "absolute",
        left: CONFIRM_X,
        top: CONFIRM.top,
        width: CONFIRM.w,
        height: CONFIRM_H,
        boxSizing: "border-box",
        padding: `${CONFIRM.padY}px ${CONFIRM.padX}px`,
        background: "#fff",
        borderRadius: 10,
        boxShadow: "0 6px 24px rgba(0,0,0,0.28)",
        fontFamily: FONT,
        opacity: enter,
        scale: String(0.96 + 0.04 * enter),
      }}
    >
      <div style={{ height: CONFIRM.titleH, fontSize: 13, fontWeight: 600, color: "#202124", whiteSpace: "nowrap" }}>{APP_HOST} 내용:</div>
      <div style={{ height: CONFIRM.titleH, marginTop: CONFIRM.messageGap, fontSize: 13, color: "#3c4043", whiteSpace: "nowrap" }}>{message}</div>
      <div style={{ marginTop: CONFIRM.buttonsGap, display: "flex", justifyContent: "flex-end", gap: CONFIRM.gap }}>
        {button("취소", false)}
        {button("확인", true, okPressAt)}
      </div>
    </div>
  );
};

const filterAt = (frame: number): HomeroomRequestFilter => {
  if (frame >= allClick + 3) return "all";
  if (frame >= pendingClick + 3) return "pending";
  return "all";
};

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const onRequests = frame >= pageSwap;
  return (
    <BrowserFrame url={`${APP_HOST}/homeroom/${onRequests ? "absence-requests" : "absence-reasons"}`} tabTitle="포산고 자율학습">
      <PcViewport>
        <HomeroomShellMock
          tab={onRequests ? "absenceRequests" : "absenceReasons"}
          role="homeroom"
          tabPressAt={{ tab: "absenceRequests", at: tabClick }}
        >
          {onRequests ? (
            <div style={{ position: "absolute", inset: 0, opacity: tween(frame, [pageSwap, pageSwap + 8], [0, 1]) }}>
              <HomeroomRequestsMock
                width={W}
                filter={filterAt(frame)}
                approvePressAt={{ requestId: APPROVE_ID, at: approveClick }}
                approvedIds={frame >= approvedFrom ? [APPROVE_ID] : []}
              />
            </div>
          ) : (
            // 앞 장면(AbsenceReason)이 끝난 모습 — 등록을 마친 폼.
            <AbsenceReasonFormMock width={W} step={{ student: SETTLED, detailTypeFrom: SETTLED, successFrom: SETTLED }} />
          )}
        </HomeroomShellMock>
        <BrowserConfirm message="이 신청을 승인하시겠습니까?" openAt={confirmOpen} closeAt={confirmClose} okPressAt={okClick} />
      </PcViewport>
    </BrowserFrame>
  );
};

const bodyRect = (r: Rect) => pcRectAbs({ x: HOMEROOM_BODY.x + r.x, y: HOMEROOM_BODY.y + r.y, w: r.w, h: r.h });
const bodyPoint = (p: Point) => pcAbs({ x: HOMEROOM_BODY.x + p.x, y: HOMEROOM_BODY.y + p.y });

const box = (r: { x: number; y: number; width: number; height: number }, pad = 6) => ({
  x: r.x - pad,
  y: r.y - pad,
  width: r.width + pad * 2,
  height: r.height + pad * 2,
});

export const HomeroomRequestsScene: React.FC<DemoProps> = () => {
  const tab = pcAbs(homeroomTabPoint("absenceRequests", "homeroom"));
  const pendingPill = homeroomRequestsPoint("filter_pending", W);
  const allPill = bodyPoint(homeroomRequestsPoint("filter_all", W));
  const approvePoint = homeroomRequestsPoint(`approve_${APPROVE_ID}`, W, "pending");
  const approveLogical = { x: approvePoint.x, y: approvePoint.y };
  const approve = bodyPoint(approveLogical);
  const ok = pcAbs(confirmOkPoint);

  const firstRowAll = homeroomRequestsPoint(`approve_${APPROVE_ID}`, W, "all");
  const tableTop = firstRowAll.y - ROW_H / 2 - HEAD_H;
  const actionX = firstRowAll.x - POINT_APPROVE_HALF - POINT_GROUP_INSET;
  const tableRect = bodyRect({ x: 16, y: tableTop, w: W - 32, h: homeroomRequestsPoint("total", W).y + 16 - tableTop });
  const actionGroup = bodyRect({
    x: actionX + (ACTION_COL_W - ACTION_GROUP_W) / 2,
    y: approveLogical.y - ACTION_BTN_H / 2,
    w: ACTION_GROUP_W,
    h: ACTION_BTN_H,
  });
  const reviewerColumn = bodyRect({ x: actionX, y: tableTop, w: ACTION_COL_W, h: HEAD_H + ROW_H * ROW_COUNT_ALL });
  const supervisorRowY = homeroomRequestsPoint(`approve_${SUPERVISOR_REVIEWED_ID}`, W, "all").y - ROW_H / 2;
  const supervisorCell = bodyRect({ x: actionX - STATUS_COL_W, y: supervisorRowY, w: STATUS_COL_W + ACTION_COL_W, h: ROW_H });
  const pendingPillRect = bodyRect({ x: pendingPill.x - FILTER_PENDING_W / 2, y: pendingPill.y - FILTER_H / 2, w: FILTER_PENDING_W, h: FILTER_H });

  return (
    <GuideScene id={ID} step={18} label="불참신청 관리">
      <Stage />

      <Annotation
        from={pageSwap + 20}
        durationInFrames={lineEnd(ID, 0) - pageSwap - 20}
        {...box(tableRect)}
        label="우리 반 학생들의 불참신청"
        labelPosition="bottom"
        labelAlign="end"
        color={colors.blue600}
      />

      <Annotation
        from={pendingClick + 4}
        durationInFrames={approveClick - 10 - pendingClick}
        {...box(pendingPillRect, 4)}
        label="대기중만 보기"
        labelPosition="left"
      />
      <Annotation
        from={lineAt(ID, 1, 0.26)}
        durationInFrames={confirmOpen - lineAt(ID, 1, 0.26)}
        {...box(actionGroup, 5)}
        label="승인 · 반려"
        labelPosition="left"
      />

      <Annotation
        from={lineAt(ID, 2, 0.2)}
        durationInFrames={lineAt(ID, 2, 0.5) - lineAt(ID, 2, 0.2)}
        {...box(supervisorCell, 2)}
        label="감독 선생님이 처리한 신청"
        labelPosition="left"
      />
      <Annotation
        from={lineAt(ID, 2, 0.5)}
        durationInFrames={lineEnd(ID, 2) + 10 - lineAt(ID, 2, 0.5)}
        {...box(reviewerColumn, 4)}
        label="처리한 선생님 이름"
        labelPosition="bottom"
        labelAlign="end"
        color={colors.green600}
      />

      <Cursor
        path={[
          { frame: lineStart(ID, 0), x: 1100, y: 640 },
          { frame: tabClick - 6, x: tab.x, y: tab.y },
          { frame: tabClick + 10, x: tab.x, y: tab.y },
          { frame: pendingClick - 6, x: bodyPoint(pendingPill).x, y: bodyPoint(pendingPill).y },
          { frame: pendingClick + 8, x: bodyPoint(pendingPill).x, y: bodyPoint(pendingPill).y },
          { frame: approveClick - 6, x: approve.x, y: approve.y },
          { frame: confirmOpen + 6, x: approve.x, y: approve.y },
          { frame: lineAt(ID, 1, 0.72), x: ok.x, y: ok.y },
          { frame: okClick + 8, x: ok.x, y: ok.y },
          { frame: allClick - 6, x: allPill.x, y: allPill.y },
          { frame: allClick + 10, x: allPill.x, y: allPill.y },
          { frame: lineAt(ID, 2, 0.45), x: 1480, y: 820 },
        ]}
        clicks={[tabClick, pendingClick, approveClick, okClick, allClick]}
        hideAfter={lineEnd(ID, 2)}
      />
    </GuideScene>
  );
};
