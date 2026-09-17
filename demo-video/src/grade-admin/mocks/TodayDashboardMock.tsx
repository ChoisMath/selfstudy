// src/components/grade-admin/TodayAttendanceDashboard.tsx 이식 — 셸 없이 본문만 그린다.
// GradeAdminShellMock 의 GRADE_ADMIN_BODY(전체 폭) 안에 children 으로 얹히며, 스크롤은 셸의 scrollY 가 담당한다.
// main 의 lg:px-4 는 셸이 아니라 이 목업이 스스로 그린다(HOMEROOM_BODY 관례 — StudentTableMock.tsx 의 PAD_X 와 동일).
import React from "react";
import type { Rect } from "../../app-mocks/layout";
import { tw } from "../../app-mocks/tw";
import { TODAY } from "../../app-mocks/data";
import { TODAY_STATS } from "../data";
import { FONT } from "../../fonts";

export type TodaySession = "afternoon1" | "afternoon2" | "night";
// data.ts 의 SessionStats.excused == 앱 SessionStats.excusedAbsent(TodayAttendanceDashboard.tsx 8행) 와 같은 값, 이름만 다르다.
export type TodayStatKey = "present" | "absent" | "excused" | "afterSchool";

export type TodayRectKey =
  | "date"
  | TodaySession
  | `${TodaySession}_supervisor`
  | `${TodaySession}_${TodayStatKey}`
  | `${TodaySession}_total`;

const SESSIONS: { key: TodaySession; icon: string; title: string }[] = [
  { key: "afternoon1", icon: "☀️", title: "오후1 자습" }, // lib/sessions.ts SESSION_META
  { key: "afternoon2", icon: "🌤️", title: "오후2 자습" },
  { key: "night", icon: "🌙", title: "야간자습" },
];

const STAT_ORDER: { key: TodayStatKey; label: string; color: "green" | "red" | "orange" | "yellow" }[] = [
  { key: "present", label: "출석", color: "green" },
  { key: "absent", label: "결석", color: "red" },
  { key: "excused", label: "사유결석", color: "orange" },
  { key: "afterSchool", label: "방과후", color: "yellow" },
];

const STAT_COLOR: Record<string, { bg: string; text: string }> = {
  green: { bg: tw.green[50], text: tw.green[600] },
  red: { bg: tw.red[50], text: tw.red[600] },
  orange: { bg: tw.orange[50], text: tw.orange[600] },
  yellow: { bg: tw.yellow[50], text: tw.yellow[600] },
};

const [Y, M, D] = TODAY.split("-").map(Number);
// TodayAttendanceDashboard.tsx 89행 dateDisplay 포맷 — TODAY=2026-09-17 은 목요일로 고정.
const DATE_DISPLAY = `${Y}년 ${M}월 ${D}일 (목)`;

const PAGE_PAD_X = 16; // [grade]/layout.tsx main lg:px-4(PC 폭이라 lg 적용)
const DATE_H = 28; // text-lg(줄높이 28)
const DATE_MB = 20; // mb-5
const CARD_GAP = 16; // space-y-4
const CARD_PAD = 20; // p-5
const HEADER_ROW_H = 24; // text-base 줄높이(24) — 감독 배지(24)와 동일
const HEADER_MB = 16; // mb-4
const STAT_GAP = 12; // grid-cols-4 gap-3
const STAT_ROW_H = 88; // p-4(32) + text-3xl 줄높이(36) + mt-1(4) + text-xs 줄높이(16)
const FOOTER_MT = 12; // mt-3
const FOOTER_H = 20; // text-sm 줄높이
const CARD_H = CARD_PAD * 2 + HEADER_ROW_H + HEADER_MB + STAT_ROW_H + FOOTER_MT + FOOTER_H; // 200

const cardY = (index: number) => DATE_H + DATE_MB + index * (CARD_H + CARD_GAP);

const statColW = (width: number) => (width - CARD_PAD * 2 - STAT_GAP * 3) / 4;

export const todayRect = (key: TodayRectKey, width: number): Rect => {
  const contentW = width - PAGE_PAD_X * 2;
  if (key === "date") return { x: PAGE_PAD_X, y: 0, w: contentW, h: DATE_H };

  const [sessionKey, sub] = key.split("_") as [TodaySession, string | undefined];
  const index = SESSIONS.findIndex((s) => s.key === sessionKey);
  const y = cardY(index);

  if (!sub) return { x: PAGE_PAD_X, y, w: contentW, h: CARD_H };

  if (sub === "supervisor") {
    const label = `감독: ${TODAY_STATS[sessionKey].supervisor}`;
    const w = 24 + label.length * 12; // px-3(24) + text-xs(12px/자)
    return { x: PAGE_PAD_X + contentW - CARD_PAD - w, y: y + CARD_PAD, w, h: HEADER_ROW_H };
  }

  if (sub === "total") {
    return {
      x: PAGE_PAD_X + CARD_PAD,
      y: y + CARD_PAD + HEADER_ROW_H + HEADER_MB + STAT_ROW_H + FOOTER_MT,
      w: contentW - CARD_PAD * 2,
      h: FOOTER_H,
    };
  }

  const statIndex = STAT_ORDER.findIndex((s) => s.key === sub);
  const colW = statColW(contentW);
  return {
    x: PAGE_PAD_X + CARD_PAD + statIndex * (colW + STAT_GAP),
    y: y + CARD_PAD + HEADER_ROW_H + HEADER_MB,
    w: colW,
    h: STAT_ROW_H,
  };
};

export const TodayDashboardMock: React.FC<{ width: number }> = ({ width }) => {
  const contentW = width - PAGE_PAD_X * 2;
  const colW = statColW(contentW);
  return (
    <div style={{ position: "relative", width, fontFamily: FONT }}>
      <div
        style={{
          position: "absolute",
          left: PAGE_PAD_X,
          top: 0,
          width: contentW,
          height: DATE_H,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: 600,
          color: tw.gray[800],
          whiteSpace: "nowrap",
        }}
      >
        {DATE_DISPLAY}
      </div>

      {SESSIONS.map((session, index) => {
        const y = cardY(index);
        const stats = TODAY_STATS[session.key];
        return (
          <div
            key={session.key}
            style={{
              position: "absolute",
              left: PAGE_PAD_X,
              top: y,
              width: contentW,
              height: CARD_H,
              background: tw.white,
              border: `1px solid ${tw.gray[200]}`,
              borderRadius: 12,
              boxSizing: "border-box",
            }}
          >
            <div style={{ position: "absolute", left: CARD_PAD, top: CARD_PAD, height: HEADER_ROW_H, display: "flex", alignItems: "center", fontSize: 16, fontWeight: 600, color: tw.gray[700], whiteSpace: "nowrap" }}>
              {session.icon} {session.title}
            </div>
            {stats.supervisor ? (
              <div
                style={{
                  position: "absolute",
                  right: CARD_PAD,
                  top: CARD_PAD,
                  height: HEADER_ROW_H,
                  padding: "0 12px",
                  borderRadius: 999,
                  background: tw.blue[100],
                  color: tw.blue[800],
                  display: "flex",
                  alignItems: "center",
                  fontSize: 12,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  boxSizing: "border-box",
                }}
              >
                감독: {stats.supervisor}
              </div>
            ) : null}

            {STAT_ORDER.map((stat, statIndex) => {
              const color = STAT_COLOR[stat.color];
              return (
                <div
                  key={stat.key}
                  style={{
                    position: "absolute",
                    left: CARD_PAD + statIndex * (colW + STAT_GAP),
                    top: CARD_PAD + HEADER_ROW_H + HEADER_MB,
                    width: colW,
                    height: STAT_ROW_H,
                    borderRadius: 8,
                    background: color.bg,
                    boxSizing: "border-box",
                    textAlign: "center",
                    padding: "16px 0",
                  }}
                >
                  <div style={{ fontSize: 30, fontWeight: 700, lineHeight: "36px", color: color.text, whiteSpace: "nowrap" }}>{stats[stat.key]}</div>
                  <div style={{ marginTop: 4, fontSize: 12, lineHeight: "16px", color: tw.gray[500], whiteSpace: "nowrap" }}>{stat.label}</div>
                </div>
              );
            })}

            <div
              style={{
                position: "absolute",
                left: CARD_PAD,
                top: CARD_PAD + HEADER_ROW_H + HEADER_MB + STAT_ROW_H + FOOTER_MT,
                width: contentW - CARD_PAD * 2,
                height: FOOTER_H,
                textAlign: "right",
                fontSize: 14,
                lineHeight: "20px",
                color: tw.gray[400],
                whiteSpace: "nowrap",
              }}
            >
              총 자습대상: {stats.total}명
            </div>
          </div>
        );
      })}
    </div>
  );
};
