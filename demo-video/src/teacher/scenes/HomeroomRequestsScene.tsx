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
import {
  HomeroomRequestsMock,
  homeroomRequestsPoint,
  homeroomRequestsRect,
  type HomeroomRequestFilter,
} from "../mocks/HomeroomRequestsMock";
import type { DemoProps } from "../../props";

const ID = "HomeroomRequests";
const W = HOMEROOM_BODY.w;
const APPROVE_ID = 4;
const SUPERVISOR_REVIEWED_ID = 7;
// 앞 장면에서 이미 끝난 입력·등록 — 첫 프레임부터 완료된 모습으로 그린다.
const SETTLED = -1000;
// "대기중만 보기" 라벨을 왼쪽 전체 칩 너머 빈 자리까지 밀어내는 거리(화면 px).
const PENDING_LABEL_GAP = 78;

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
            <AbsenceReasonFormMock
              width={W}
              step={{ student: SETTLED, detailTypeFrom: SETTLED, successFrom: SETTLED, clearedFrom: SETTLED }}
            />
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
  const allPill = bodyPoint(homeroomRequestsPoint("filter_all", W));
  const pendingPill = bodyPoint(homeroomRequestsPoint("filter_pending", W));
  const approve = bodyPoint(homeroomRequestsPoint(`approve_${APPROVE_ID}`, W, "pending"));
  const ok = pcAbs(confirmOkPoint);

  const tableRect = bodyRect(homeroomRequestsRect("table", W, "all"));
  const actionGroup = bodyRect(homeroomRequestsRect(`actions_${APPROVE_ID}`, W, "pending"));
  const reviewerColumn = bodyRect(homeroomRequestsRect("actionColumn", W, "all"));
  const statusColumn = homeroomRequestsRect("statusColumn", W, "all");
  const supervisorRow = homeroomRequestsRect(`row_${SUPERVISOR_REVIEWED_ID}`, W, "all");
  const supervisorCell = bodyRect({
    x: statusColumn.x,
    y: supervisorRow.y,
    w: statusColumn.w + homeroomRequestsRect("actionColumn", W, "all").w,
    h: supervisorRow.h,
  });
  const pendingPillRect = bodyRect(homeroomRequestsRect("filter_pending", W));

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

      {/* 필터 칩이 촘촘해 라벨을 왼쪽에 두면 옆 칩(전체)을 덮는다 — 칩 줄 왼쪽 빈 자리로 띄운다. */}
      <Annotation
        from={pendingClick + 4}
        durationInFrames={approveClick - 10 - pendingClick}
        {...box(pendingPillRect, 4)}
        label="대기중만 보기"
        labelPosition="left"
        labelGap={PENDING_LABEL_GAP}
      />
      {/* 왼쪽 라벨은 상태 열의 대기중 배지를 덮어, 버튼 묶음 위로 올린다. */}
      <Annotation
        from={lineAt(ID, 1, 0.26)}
        durationInFrames={confirmOpen - lineAt(ID, 1, 0.26)}
        {...box(actionGroup, 5)}
        label="승인 · 반려"
        labelPosition="top"
        labelAlign="end"
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
          { frame: pendingClick - 6, x: pendingPill.x, y: pendingPill.y },
          { frame: pendingClick + 8, x: pendingPill.x, y: pendingPill.y },
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
