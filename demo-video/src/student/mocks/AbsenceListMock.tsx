// src/app/student/absence-requests/page.tsx 이식. 헤더 없이 폰 본문 폭(390) 기준, 페이지 자체의
// 여백(main px-2 py-6, student/layout.tsx:83)을 이 목업이 직접 그린다. 신청 목록은 항상
// student/data.ts의 MY_REQUESTS(최신순 3건, 대기중·승인·반려 각 1건)를 그대로 쓴다.
import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import type { Rect } from "../../app-mocks/layout";
import { tw } from "../../app-mocks/tw";
import { ABSENCE_REASON_META, type AbsenceRequest } from "../../app-mocks/data";
import { MY_REQUESTS, sessionLabels } from "../data";
import { FONT } from "../../fonts";

const PAD_X = 8; // main px-2 (student/layout.tsx:83)
const PAD_TOP = 24; // main py-6

const TITLE_H = 28; // text-xl font-bold (page.tsx:37)
const TITLE_MB = 8; // mb-2

const NOTICE_H = 18; // text-sm 한 줄(38-44행) — 이 폭에서 줄바꿈 없이 들어가는 근사치
const NOTICE_MB = 16; // mb-4

const CARD_GAP = 8; // space-y-2 (53행)
const CARD_PAD_X = 16; // px-4 (65행)
const CARD_PAD_Y = 12; // py-3
const LINE1_H = 18; // text-sm font-medium (68행)
const LINE_GAP = 2; // mt-0.5
const LINE2_H = 14; // text-xs (72행)
const CARD_H = CARD_PAD_Y * 2 + LINE1_H + LINE_GAP + LINE2_H; // 58

const STATUS_LABEL: Record<AbsenceRequest["status"], { text: string; bg: string; color: string }> = {
  pending: { text: "대기중", bg: tw.yellow[100], color: tw.yellow[700] },
  approved: { text: "승인", bg: tw.green[100], color: tw.green[700] },
  rejected: { text: "반려", bg: tw.red[100], color: tw.red[700] },
};

// px-2.5(양쪽 10) + 글자당 근사폭(fontSize 11) — 커서 좌표용, 픽셀 완전 일치 불필요.
const badgeWidth = (label: string) => label.length * 11 + 20;
const BADGE_H = 22; // px-2.5 py-1 text-xs rounded-full (77행)

const cardY = (index: number) => PAD_TOP + TITLE_H + TITLE_MB + NOTICE_H + NOTICE_MB + index * (CARD_H + CARD_GAP);

export const absenceListRect = (key: "notice" | `card_${number}` | `badge_${number}`, width: number): Rect => {
  const cardW = width - PAD_X * 2;
  if (key === "notice") return { x: PAD_X, y: PAD_TOP + TITLE_H + TITLE_MB, w: cardW, h: NOTICE_H };
  const id = Number(key.split("_")[1]);
  const index = MY_REQUESTS.findIndex((r) => r.id === id);
  if (index === -1) throw new Error(`absence request not in MY_REQUESTS: ${id}`);
  const y = cardY(index);
  if (key.startsWith("card_")) return { x: PAD_X, y, w: cardW, h: CARD_H };
  const request = MY_REQUESTS[index];
  const status = STATUS_LABEL[request.status];
  const bw = badgeWidth(status.text);
  return { x: PAD_X + cardW - CARD_PAD_X - bw, y: y + (CARD_H - BADGE_H) / 2, w: bw, h: BADGE_H };
};

const AbsenceCard: React.FC<{ request: AbsenceRequest; rect: Rect; highlightOpacity: number }> = ({
  request,
  rect,
  highlightOpacity,
}) => {
  const reason = ABSENCE_REASON_META[request.reason];
  const status = STATUS_LABEL[request.status];
  const bw = badgeWidth(status.text);
  return (
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        borderRadius: 8,
        background: tw.white,
        border: `1px solid ${tw.gray[200]}`,
        boxSizing: "border-box",
        padding: `${CARD_PAD_Y}px ${CARD_PAD_X}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      {highlightOpacity > 0 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 8,
            background: tw.blue[50],
            opacity: highlightOpacity,
          }}
        />
      ) : null}
      <div style={{ position: "relative", minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: tw.gray[900], whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {request.dateLabel} {sessionLabels[request.session]}
        </div>
        <div style={{ fontSize: 11, color: tw.gray[500], marginTop: LINE_GAP, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {reason.label}
          {request.detail ? ` - ${request.detail}` : ""}
        </div>
      </div>
      <span
        style={{
          position: "relative",
          flexShrink: 0,
          width: bw,
          height: BADGE_H,
          borderRadius: 999,
          background: status.bg,
          color: status.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
        {status.text}
      </span>
    </div>
  );
};

export const AbsenceListMock: React.FC<{ width: number; highlight?: { id: number; from: number } }> = ({ width, highlight }) => {
  const frame = useCurrentFrame();
  const cardW = width - PAD_X * 2;
  const listBottom = cardY(MY_REQUESTS.length - 1) + CARD_H;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width, height: listBottom + PAD_TOP, background: tw.gray[50], fontFamily: FONT, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: PAD_X, top: PAD_TOP, fontSize: 20, fontWeight: 700, color: tw.gray[900], whiteSpace: "nowrap" }}>
        불참목록
      </div>

      <div
        style={{
          position: "absolute",
          left: PAD_X,
          top: PAD_TOP + TITLE_H + TITLE_MB,
          width: cardW,
          height: NOTICE_H,
          display: "flex",
          alignItems: "center",
          flexWrap: "nowrap",
          gap: 4,
          fontSize: 12,
          color: tw.gray[500],
          whiteSpace: "nowrap",
        }}
      >
        <span>불참 신청은</span>
        <span style={{ color: tw.blue[600], fontWeight: 500, textDecoration: "underline" }}>참여일정</span>
        <span>탭에서 요일을 눌러 할 수 있습니다.</span>
      </div>

      {MY_REQUESTS.map((request, index) => {
        const rect: Rect = { x: PAD_X, y: cardY(index), w: cardW, h: CARD_H };
        const highlightOpacity =
          highlight?.id === request.id ? tween(frame, [highlight.from, highlight.from + 30], [1, 0]) : 0;
        return <AbsenceCard key={request.id} request={request} rect={rect} highlightOpacity={highlightOpacity} />;
      })}
    </div>
  );
};
