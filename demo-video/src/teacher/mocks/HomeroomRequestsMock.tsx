// src/app/homeroom/absence-requests/page.tsx 이식 — 헤더 셸 없이 본문만 그린다.
// 담임 화면은 1-2반 신청만 보이므로 ABSENCE_REQUESTS 중 1-2반(4, 7) 두 건만 쓰고,
// 표를 채우기 위해 1-2반 학생 가상 신청 3건(8~10)을 이 파일에 로컬로 추가한다(brief 허용 범위).
import React from "react";
import { useCurrentFrame } from "remotion";
import { FONT } from "../../fonts";
import type { Point, Rect } from "../../app-mocks/layout";
import { pressScale } from "../../app-mocks/primitives";
import { tw } from "../../app-mocks/tw";
import { ABSENCE_REASON_META, ABSENCE_REQUESTS, studentById, type AbsenceRequest, type AbsenceSession } from "../../app-mocks/data";

const PAD_X = 16; // lg:px-4 (homeroom/layout.tsx main)
const PAD_TOP = 24; // py-6 (homeroom/layout.tsx main) — HomeroomShellMock은 헤더만 그리므로 본문 패딩은 여기서 직접 재현한다
const TITLE_H = 30; // text-2xl 줄높이(95행)와 필터 버튼 행(97-109행) 공유 높이

const HEADER_MB = 16; // mb-6 근사치(압축, 94행)
const HEAD_H = 34; // thead 행(116-125행)
const ROW_H = 52; // tbody 행(148-200행) — 학생 셀 2줄 기준
const FOOT_H = 32; // 총 N건(206-210행)
const EMPTY_H = 48;

const COL = { student: 260, date: 90, session: 78, reason: 78, status: 96, action: 140 } as const;

const SESSION_SHORT: Record<AbsenceSession, string> = { afternoon1: "오후1", afternoon2: "오후2", night: "야간" };
const STATUS_LABEL: Record<AbsenceRequest["status"], string> = { pending: "대기중", approved: "승인", rejected: "반려" };
const STATUS_COLOR: Record<AbsenceRequest["status"], { bg: string; fg: string }> = {
  pending: { bg: tw.yellow[100], fg: tw.yellow[800] },
  approved: { bg: tw.green[100], fg: tw.green[800] },
  rejected: { bg: tw.red[100], fg: tw.red[800] },
};

// 표를 채우기 위한 1-2반 가상 불참신청 3건 — STUDENTS의 기존 1-2반 학생만 사용, 새 이름 없음.
// 205(안지호)는 ABSENCE_REASON_EXAMPLE과 같은 학생·사유로, 등록 화면과 자연스럽게 이어지도록 골랐다.
const EXTRA_REQUESTS: AbsenceRequest[] = [
  { id: 8, studentId: 205, date: "2026-09-17", dateLabel: "9/17(목)", session: "afternoon1", reason: "academy", detail: "수학 학원", status: "pending" },
  { id: 9, studentId: 208, date: "2026-09-16", dateLabel: "9/16(수)", session: "afternoon2", reason: "illness", detail: "감기", status: "approved", reviewer: "박지훈" },
  { id: 10, studentId: 211, date: "2026-09-15", dateLabel: "9/15(화)", session: "night", reason: "afterschool", status: "rejected", reviewer: "박지훈" },
];

const REQUESTS: AbsenceRequest[] = [
  ...ABSENCE_REQUESTS.filter((r) => studentById(r.studentId).classNumber === 2),
  ...EXTRA_REQUESTS,
];

export type HomeroomRequestFilter = "all" | "pending" | "approved" | "rejected";

const FILTER_ORDER: { key: HomeroomRequestFilter; label: string; w: number }[] = [
  { key: "all", label: "전체", w: 48 },
  { key: "pending", label: "대기중", w: 64 },
  { key: "approved", label: "승인", w: 48 },
  { key: "rejected", label: "반려", w: 48 },
];
const FILTER_GAP = 8;
const FILTER_H = 26;

// 처리 열의 승인/반려 버튼 묶음(176-199행).
const ACTION = { approveW: 44, rejectW: 40, gap: 4, h: 22 } as const;
const ACTION_GROUP_W = ACTION.approveW + ACTION.gap + ACTION.rejectW;

const withApproved = (r: AbsenceRequest, approvedIds?: number[]): AbsenceRequest =>
  approvedIds?.includes(r.id) ? { ...r, status: "approved", reviewer: "박지훈" } : r;

const effectiveRequests = (approvedIds?: number[]) => REQUESTS.map((r) => withApproved(r, approvedIds));

const visibleRows = (filter: HomeroomRequestFilter, approvedIds?: number[]) => {
  const eff = effectiveRequests(approvedIds);
  return filter === "all" ? eff : eff.filter((r) => r.status === filter);
};

// 표 컨테이너(래핑 div)가 이미 left: PAD_X에 있으므로, 여기서 반환하는 x들은 그 컨테이너 기준
// "상대" 오프셋이다(학생 열은 0부터 시작) — 렌더링(Th/행 셀)은 그대로 쓰면 되고, 페이지 절대
// 좌표가 필요한 곳(homeroomRequestsPoint)에서만 PAD_X를 더한다.
const columnX = (width: number) => {
  const contentW = width - PAD_X * 2;
  const detailW = contentW - (COL.student + COL.date + COL.session + COL.reason + COL.status + COL.action);
  const studentX = 0;
  const dateX = studentX + COL.student;
  const sessionX = dateX + COL.date;
  const reasonX = sessionX + COL.session;
  const detailX = reasonX + COL.reason;
  const statusX = detailX + detailW;
  const actionX = statusX + COL.status;
  return { contentW, detailW, studentX, dateX, sessionX, reasonX, detailX, statusX, actionX };
};

const filterRowLayout = (width: number) => {
  const totalW = FILTER_ORDER.reduce((sum, f) => sum + f.w, 0) + FILTER_GAP * (FILTER_ORDER.length - 1);
  let x = width - PAD_X - totalW;
  return FILTER_ORDER.map((f) => {
    const rect = { key: f.key, label: f.label, x, w: f.w };
    x += f.w + FILTER_GAP;
    return rect;
  });
};

const tableY = PAD_TOP + TITLE_H + HEADER_MB;

const rowIndexOf = (id: number, rows: AbsenceRequest[]) => {
  const index = rows.findIndex((r) => r.id === id);
  if (index === -1) throw new Error(`request ${id} not visible under the given filter`);
  return index;
};

export const homeroomRequestsPoint = (
  key: `filter_${string}` | `approve_${number}` | `reject_${number}` | "table" | "total",
  width: number,
  filter: HomeroomRequestFilter = "all",
): Point => {
  const { contentW, actionX } = columnX(width);
  // table/total/approve/reject는 모두 `filter`가 골라내는 행 순서·행수를 기준으로 계산한다 —
  // 컴포넌트의 visibleRows()와 같은 필터링. approvedIds는 이 함수가 받지 않으므로 반영되지 않는다:
  // 장면이 approvedIds도 함께 넘길 때는 그 프레임에 대상 행의 실제 상태·필터 조합이
  // 이 계산과 일치하는지(예: 승인 처리 후에는 "pending" 필터에서 더 이상 보이지 않음) 스스로 맞춰야 한다.
  const rowsForFilter = visibleRows(filter);
  if (key === "table") {
    return { x: PAD_X + contentW / 2, y: tableY + (HEAD_H + rowsForFilter.length * ROW_H + FOOT_H) / 2 };
  }
  if (key === "total") {
    return { x: PAD_X + 40, y: tableY + HEAD_H + rowsForFilter.length * ROW_H + FOOT_H / 2 };
  }
  if (key.startsWith("filter_")) {
    const f = key.slice(7);
    const pill = filterRowLayout(width).find((p) => p.key === f);
    if (!pill) throw new Error(`unknown filter: ${f}`);
    return { x: pill.x + pill.w / 2, y: PAD_TOP + TITLE_H / 2 };
  }
  // approve_<id> / reject_<id> — `filter`로 실제 화면에 보이는 행 순서 기준 위치를 반환한다.
  const [, idStr] = key.split("_");
  const id = Number(idStr);
  const rowIndex = rowIndexOf(id, rowsForFilter);
  const rowY = tableY + HEAD_H + rowIndex * ROW_H;
  const groupX = PAD_X + actionX + (COL.action - ACTION_GROUP_W) / 2;
  const x = key.startsWith("approve_")
    ? groupX + ACTION.approveW / 2
    : groupX + ACTION.approveW + ACTION.gap + ACTION.rejectW / 2;
  return { x, y: rowY + ROW_H / 2 };
};

// 장면이 상자를 그릴 때 쓰는 영역들 — 목업 내부 치수를 장면에서 다시 적지 않게 한다.
export const homeroomRequestsRect = (
  key: "table" | "statusColumn" | "actionColumn" | `row_${number}` | `actions_${number}` | `filter_${string}`,
  width: number,
  filter: HomeroomRequestFilter = "all",
): Rect => {
  const { contentW, statusX, actionX } = columnX(width);
  const rows = visibleRows(filter);
  const bodyH = HEAD_H + rows.length * ROW_H;
  if (key === "table") {
    return { x: PAD_X, y: tableY, w: contentW, h: bodyH + FOOT_H };
  }
  if (key === "statusColumn") {
    return { x: PAD_X + statusX, y: tableY, w: COL.status, h: bodyH };
  }
  if (key === "actionColumn") {
    return { x: PAD_X + actionX, y: tableY, w: COL.action, h: bodyH };
  }
  if (key.startsWith("filter_")) {
    const p = homeroomRequestsPoint(key as `filter_${string}`, width, filter);
    const pill = filterRowLayout(width).find((f) => f.key === key.slice(7));
    if (!pill) throw new Error(`unknown filter: ${key.slice(7)}`);
    return { x: pill.x, y: p.y - FILTER_H / 2, w: pill.w, h: FILTER_H };
  }
  const id = Number(key.split("_")[1]);
  const rowY = tableY + HEAD_H + rowIndexOf(id, rows) * ROW_H;
  if (key.startsWith("row_")) {
    return { x: PAD_X, y: rowY, w: contentW, h: ROW_H };
  }
  return {
    x: PAD_X + actionX + (COL.action - ACTION_GROUP_W) / 2,
    y: rowY + (ROW_H - ACTION.h) / 2,
    w: ACTION_GROUP_W,
    h: ACTION.h,
  };
};

const Th: React.FC<{ x: number; w: number; align: "left" | "center"; children: React.ReactNode }> = ({ x, w, align, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: 0,
      width: w,
      height: HEAD_H,
      display: "flex",
      alignItems: "center",
      justifyContent: align === "left" ? "flex-start" : "center",
      padding: align === "left" ? "0 12px" : 0,
      fontSize: 12,
      fontWeight: 500,
      color: tw.gray[600],
      whiteSpace: "nowrap",
      boxSizing: "border-box",
    }}
  >
    {children}
  </div>
);

export const HomeroomRequestsMock: React.FC<{
  width: number;
  filter: HomeroomRequestFilter;
  approvePressAt?: { requestId: number; at: number };
  approvedIds?: number[];
}> = ({ width, filter, approvePressAt, approvedIds }) => {
  const frame = useCurrentFrame();
  const { contentW, detailW, studentX, dateX, sessionX, reasonX, detailX, statusX, actionX } = columnX(width);
  const rows = visibleRows(filter, approvedIds);
  const tableH = HEAD_H + (rows.length === 0 ? EMPTY_H : rows.length * ROW_H + FOOT_H);

  return (
    <div style={{ position: "absolute", inset: 0, background: tw.gray[50], fontFamily: FONT, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: PAD_X,
          top: PAD_TOP,
          fontSize: 22,
          fontWeight: 700,
          color: tw.gray[900],
          whiteSpace: "nowrap",
        }}
      >
        불참신청 관리
      </div>

      {filterRowLayout(width).map((pill) => {
        const active = pill.key === filter;
        return (
          <div
            key={pill.key}
            style={{
              position: "absolute",
              left: pill.x,
              top: PAD_TOP + (TITLE_H - FILTER_H) / 2,
              width: pill.w,
              height: FILTER_H,
              borderRadius: 6,
              border: `1px solid ${active ? tw.blue[500] : tw.gray[300]}`,
              background: active ? tw.blue[50] : tw.white,
              color: active ? tw.blue[700] : tw.gray[600],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              whiteSpace: "nowrap",
              boxSizing: "border-box",
            }}
          >
            {pill.label}
          </div>
        );
      })}

      <div
        style={{
          position: "absolute",
          left: PAD_X,
          top: tableY,
          width: contentW,
          height: tableH,
          background: tw.white,
          border: `1px solid ${tw.gray[200]}`,
          borderRadius: 8,
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <div style={{ position: "relative", height: HEAD_H, background: tw.gray[50], borderBottom: `1px solid ${tw.gray[200]}` }}>
          <Th x={studentX} w={COL.student} align="left">학생</Th>
          <Th x={dateX} w={COL.date} align="center">날짜</Th>
          <Th x={sessionX} w={COL.session} align="center">시간</Th>
          <Th x={reasonX} w={COL.reason} align="center">사유</Th>
          <Th x={detailX} w={detailW} align="left">상세</Th>
          <Th x={statusX} w={COL.status} align="center">상태</Th>
          <Th x={actionX} w={COL.action} align="center">처리</Th>
        </div>

        {rows.length === 0 ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: HEAD_H,
              width: contentW,
              height: EMPTY_H,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              color: tw.gray[400],
              whiteSpace: "nowrap",
            }}
          >
            신청이 없습니다.
          </div>
        ) : (
          rows.map((r, i) => {
            const student = studentById(r.studentId);
            const rowY = HEAD_H + i * ROW_H;
            const status = STATUS_COLOR[r.status];
            const bounceAt = approvePressAt?.requestId === r.id ? approvePressAt.at : undefined;
            return (
              <div key={r.id} style={{ position: "absolute", left: 0, top: rowY, width: contentW, height: ROW_H, borderTop: i === 0 ? "none" : `1px solid ${tw.gray[100]}` }}>
                <div style={{ position: "absolute", left: studentX, top: 0, width: COL.student, height: ROW_H, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 12px", boxSizing: "border-box" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: tw.gray[900], whiteSpace: "nowrap" }}>{student.name}</span>
                  <span style={{ fontSize: 11, color: tw.gray[500], whiteSpace: "nowrap" }}>
                    {student.grade}-{student.classNumber} {student.number}번
                  </span>
                </div>
                <div style={{ position: "absolute", left: dateX, top: 0, width: COL.date, height: ROW_H, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: tw.gray[600], whiteSpace: "nowrap" }}>
                  {r.date}
                </div>
                <div style={{ position: "absolute", left: sessionX, top: 0, width: COL.session, height: ROW_H, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: tw.gray[600], whiteSpace: "nowrap" }}>
                  {SESSION_SHORT[r.session]}
                </div>
                <div style={{ position: "absolute", left: reasonX, top: 0, width: COL.reason, height: ROW_H, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: tw.gray[600], whiteSpace: "nowrap" }}>
                  {ABSENCE_REASON_META[r.reason].label}
                </div>
                <div style={{ position: "absolute", left: detailX, top: 0, width: detailW, height: ROW_H, display: "flex", alignItems: "center", padding: "0 12px", boxSizing: "border-box", fontSize: 12, color: tw.gray[600], whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.detail ?? "-"}
                </div>
                <div style={{ position: "absolute", left: statusX, top: 0, width: COL.status, height: ROW_H, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 999, background: status.bg, color: status.fg, fontSize: 11, fontWeight: 500, whiteSpace: "nowrap" }}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
                <div style={{ position: "absolute", left: actionX, top: 0, width: COL.action, height: ROW_H, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {r.status === "pending" ? (
                    <div style={{ display: "flex", gap: ACTION.gap }}>
                      <div
                        style={{
                          width: ACTION.approveW,
                          height: ACTION.h,
                          borderRadius: 4,
                          border: `1px solid ${tw.green[200]}`,
                          background: tw.green[50],
                          color: tw.green[700],
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxSizing: "border-box",
                          fontSize: 11,
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                          scale: String(pressScale(frame, bounceAt)),
                        }}
                      >
                        승인
                      </div>
                      <div
                        style={{
                          width: ACTION.rejectW,
                          height: ACTION.h,
                          borderRadius: 4,
                          border: `1px solid ${tw.red[200]}`,
                          background: tw.red[50],
                          color: tw.red[700],
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxSizing: "border-box",
                          fontSize: 11,
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                        }}
                      >
                        반려
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: tw.gray[400], whiteSpace: "nowrap" }}>{r.reviewer}</span>
                  )}
                </div>
              </div>
            );
          })
        )}

        {rows.length > 0 ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: HEAD_H + rows.length * ROW_H,
              width: contentW,
              height: FOOT_H,
              background: tw.gray[50],
              borderTop: `1px solid ${tw.gray[200]}`,
              display: "flex",
              alignItems: "center",
              padding: "0 16px",
              boxSizing: "border-box",
              fontSize: 13,
              color: tw.gray[500],
              whiteSpace: "nowrap",
            }}
          >
            총 {rows.length}건
          </div>
        ) : null}
      </div>
    </div>
  );
};
