// src/app/attendance/[grade]/page.tsx renderAbsenceRequests (789-884행) 이식. 폰 본문 폭(390) 기준, 세로는 내용에 맞춰 자란다.
import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import type { Point, Rect } from "../../app-mocks/layout";
import { pressScale } from "../../app-mocks/primitives";
import { FONT } from "../../fonts";
import { ABSENCE_REASON_META, studentById, type AbsenceRequest, type AbsenceSession } from "../../app-mocks/data";

export const SESSION_LABEL: Record<AbsenceSession, string> = {
  afternoon1: "오후1 자습",
  afternoon2: "오후2 자습",
  night: "야간자습",
};

const STATUS_LABEL: Record<AbsenceRequest["status"], string> = {
  pending: "대기중",
  approved: "승인",
  rejected: "반려",
};

export type AbsenceFilter = "pending" | "approved" | "rejected";

const PANEL_PAD = 12; // p-3 (1009행 카드 래퍼)
const FILTER_ROW_H = 30;
const FILTER_GAP = 8; // gap-2 (795행)
const FILTER_MB = 16; // mb-4
const CARD_GAP = 8; // flex flex-col gap-2 (829행)
const CARD_PAD = 12; // p-3 (836행)
const CARD_NAME_H = 18;
const CARD_NAME_GAP = 4; // mt-1
const CARD_META_H = 16;
const CARD_DETAIL_GAP = 2; // mt-0.5
const CARD_DETAIL_H = 14;
const CARD_REVIEWER_GAP = 4; // mt-1
const CARD_REVIEWER_H = 14;
const REMOVE_FRAMES = 8; // 모달 등장(10프레임)보다 퇴장이 빨라야 한다.
// 승인/반려 버튼(px-3 py-1.5 text-xs, gap-1.5) — 실제 앱은 auto width 지만, 좌표 계산과 어긋나지 않게 고정폭으로 그린다.
// 장면에서 absencePanelPoint 의 중심 좌표로 버튼 Rect 를 만들 때도 이 크기를 그대로 쓴다.
export const CARD_BTN_W = 48;
export const CARD_BTN_H = 30;
const CARD_BTN_GAP = 6;

// px-3(양쪽 12) + 글자당 대략 폭. 커서 좌표용 근사치 — 픽셀 완전 일치 불필요.
const pillWidth = (label: string) => label.length * 8 + 24;

const FILTER_ORDER: AbsenceFilter[] = ["pending", "approved", "rejected"];

const filterLabel = (filter: AbsenceFilter, pendingCount: number) => {
  if (filter === "pending") return `대기중${pendingCount > 0 ? ` (${pendingCount})` : ""}`;
  if (filter === "approved") return "승인";
  return "반려";
};

const bulkLabel = (bulkCount: number) => `일괄승인${bulkCount > 0 ? ` (${bulkCount})` : ""}`;

const filterPillX = (width: number, filter: AbsenceFilter, pendingCount: number) => {
  let x = PANEL_PAD;
  for (const f of FILTER_ORDER) {
    const w = pillWidth(filterLabel(f, pendingCount));
    if (f === filter) return { x, w };
    x += w + FILTER_GAP;
  }
  return { x, w: pillWidth(filterLabel(filter, pendingCount)) };
};

const cardContentHeight = (r: AbsenceRequest) =>
  CARD_NAME_H +
  CARD_NAME_GAP +
  CARD_META_H +
  (r.detail ? CARD_DETAIL_GAP + CARD_DETAIL_H : 0) +
  (r.reviewer ? CARD_REVIEWER_GAP + CARD_REVIEWER_H : 0);

const cardHeight = (r: AbsenceRequest) => CARD_PAD * 2 + cardContentHeight(r);

const visibleRequests = (requests: AbsenceRequest[], filter: AbsenceFilter) =>
  requests.filter((r) => r.status === filter);

export const absenceCardRect = (
  requestId: number,
  width: number,
  requests: AbsenceRequest[],
  filter: AbsenceFilter,
): Rect => {
  const list = visibleRequests(requests, filter);
  const cardW = width - PANEL_PAD * 2;
  let y = PANEL_PAD + FILTER_ROW_H + FILTER_MB;
  for (const r of list) {
    const h = cardHeight(r);
    if (r.id === requestId) {
      return { x: PANEL_PAD, y, w: cardW, h };
    }
    y += h + CARD_GAP;
  }
  throw new Error(`absence request not visible under filter "${filter}": ${requestId}`);
};

export const absencePanelPoint = (
  key: `filter_${AbsenceFilter}` | "bulk" | `approve_${number}` | `reject_${number}`,
  width: number,
  requests: AbsenceRequest[],
  filter: AbsenceFilter,
): Point => {
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  if (key === "bulk") {
    // 시그니처에 bulkCount가 없어 정확한 라벨 폭을 알 수 없다 — 커서 좌표용 근사치.
    const w = pillWidth(bulkLabel(0));
    return { x: width - PANEL_PAD - w / 2, y: PANEL_PAD + FILTER_ROW_H / 2 };
  }
  if (key.startsWith("filter_")) {
    const f = key.slice(7) as AbsenceFilter;
    const { x, w } = filterPillX(width, f, pendingCount);
    return { x: x + w / 2, y: PANEL_PAD + FILTER_ROW_H / 2 };
  }
  const [, idStr] = key.split("_");
  const requestId = Number(idStr);
  const rect = absenceCardRect(requestId, width, requests, filter);
  // 버튼 그룹은 카드 오른쪽 끝(패딩 제외)에 붙는다: [승인][반려] — 반려가 가장 오른쪽.
  const rightEdge = rect.x + rect.w - CARD_PAD;
  const isApprove = key.startsWith("approve_");
  const centerX = isApprove
    ? rightEdge - CARD_BTN_W - CARD_BTN_GAP - CARD_BTN_W / 2
    : rightEdge - CARD_BTN_W / 2;
  return { x: centerX, y: rect.y + CARD_PAD + CARD_BTN_H / 2 };
};

const FilterPill: React.FC<{ label: string; active: boolean; x: number; w: number; pressAt?: number | null }> = ({
  label,
  active,
  x,
  w,
  pressAt,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: PANEL_PAD,
        width: w,
        height: FILTER_ROW_H,
        borderRadius: 999,
        background: active ? "#3b82f6" : "#f1f5f9",
        color: active ? "#fff" : "#64748b",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
        boxSizing: "border-box",
        scale: String(pressScale(frame, pressAt)),
      }}
    >
      {label}
    </div>
  );
};

const AbsenceCard: React.FC<{
  request: AbsenceRequest;
  rect: Rect;
  approvePressAt?: number | null;
  removeFrom?: number;
}> = ({ request, rect, approvePressAt, removeFrom }) => {
  const frame = useCurrentFrame();
  const student = studentById(request.studentId);
  const reason = ABSENCE_REASON_META[request.reason];
  const opacity = removeFrom === undefined ? 1 : tween(frame, [removeFrom, removeFrom + REMOVE_FRAMES], [1, 0]);
  if (removeFrom !== undefined && frame >= removeFrom + REMOVE_FRAMES) {
    return null;
  }
  return (
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        boxSizing: "border-box",
        padding: CARD_PAD,
        opacity,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
            {student.name} <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: 12 }}>{student.grade}학년 {student.classNumber}반 {student.number}번</span>
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: CARD_NAME_GAP, whiteSpace: "nowrap" }}>
            {request.dateLabel} · {SESSION_LABEL[request.session]} · <span style={{ color: reason.color }}>{reason.label}</span>
          </div>
          {request.detail ? (
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: CARD_DETAIL_GAP, whiteSpace: "nowrap" }}>{request.detail}</div>
          ) : null}
          {request.reviewer ? (
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: CARD_REVIEWER_GAP, whiteSpace: "nowrap" }}>
              처리: {request.reviewer} ({STATUS_LABEL[request.status]})
            </div>
          ) : null}
        </div>
        {request.status === "pending" ? (
          <div style={{ display: "flex", gap: CARD_BTN_GAP, flexShrink: 0 }}>
            <div
              style={{
                width: CARD_BTN_W,
                height: CARD_BTN_H,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#3b82f6",
                color: "#fff",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: "nowrap",
                boxSizing: "border-box",
                scale: String(pressScale(frame, approvePressAt)),
              }}
            >
              승인
            </div>
            <div
              style={{
                width: CARD_BTN_W,
                height: CARD_BTN_H,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f1f5f9",
                color: "#64748b",
                borderRadius: 6,
                fontSize: 12,
                whiteSpace: "nowrap",
                boxSizing: "border-box",
              }}
            >
              반려
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const AbsencePanelMock: React.FC<{
  width: number;
  filter: AbsenceFilter;
  filterPressAt?: number;
  requests: AbsenceRequest[];
  approvePressAt?: { requestId: number; at: number };
  bulkCount: number;
  bulkPressAt?: number;
  removingId?: { requestId: number; from: number };
}> = ({ width, filter, filterPressAt, requests, approvePressAt, bulkCount, bulkPressAt, removingId }) => {
  const frame = useCurrentFrame();
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const list = visibleRequests(requests, filter);

  let y = PANEL_PAD + FILTER_ROW_H + FILTER_MB;
  const cards = list.map((r) => {
    const h = cardHeight(r);
    const rect: Rect = { x: PANEL_PAD, y, w: width - PANEL_PAD * 2, h };
    y += h + CARD_GAP;
    return { request: r, rect };
  });
  const contentH = list.length === 0 ? 48 : y - CARD_GAP;
  const panelH = PANEL_PAD + FILTER_ROW_H + FILTER_MB + contentH + PANEL_PAD;

  const bulkW = pillWidth(bulkLabel(bulkCount));
  const bulkDisabled = bulkCount <= 0;

  return (
    <div
      style={{
        position: "relative",
        width,
        height: panelH,
        background: "#fff",
        borderRadius: "0 0 12px 12px",
        boxSizing: "border-box",
        overflow: "hidden",
        fontFamily: FONT,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      {FILTER_ORDER.map((f) => {
        const { x, w } = filterPillX(width, f, pendingCount);
        return (
          <FilterPill
            key={f}
            label={filterLabel(f, pendingCount)}
            active={f === filter}
            x={x}
            w={w}
            pressAt={f === filter ? filterPressAt : undefined}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          left: width - PANEL_PAD - bulkW,
          top: PANEL_PAD,
          width: bulkW,
          height: FILTER_ROW_H,
          borderRadius: 6,
          background: bulkDisabled ? "#cbd5e1" : "#2563eb",
          color: bulkDisabled ? "#64748b" : "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 600,
          whiteSpace: "nowrap",
          boxSizing: "border-box",
          scale: String(pressScale(frame, bulkPressAt)),
        }}
      >
        {bulkLabel(bulkCount)}
      </div>

      {list.length === 0 ? (
        <div
          style={{
            position: "absolute",
            left: PANEL_PAD,
            top: PANEL_PAD + FILTER_ROW_H + FILTER_MB,
            width: width - PANEL_PAD * 2,
            height: contentH,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            color: "#94a3b8",
            whiteSpace: "nowrap",
          }}
        >
          {filter === "pending" ? "대기 중인 불참신청이 없습니다." : "불참신청이 없습니다."}
        </div>
      ) : (
        cards.map(({ request, rect }) => (
          <AbsenceCard
            key={request.id}
            request={request}
            rect={rect}
            approvePressAt={approvePressAt?.requestId === request.id ? approvePressAt.at : undefined}
            removeFrom={removingId?.requestId === request.id ? removingId.from : undefined}
          />
        ))
      )}
    </div>
  );
};
