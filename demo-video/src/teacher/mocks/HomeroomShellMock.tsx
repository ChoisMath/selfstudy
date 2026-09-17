// src/app/homeroom/layout.tsx 이식(64-134행, lg 이상 폭 기준) — 담임/감독 공용 페이지 셸.
import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { ME } from "../../app-mocks/data";
import { PC_VIEWPORT, type Point, type Rect } from "../../app-mocks/layout";
import { pressScale } from "../../app-mocks/primitives";
import { tw } from "../../app-mocks/tw";
import { FONT } from "../../fonts";

export type HomeroomTab =
  | "students"
  | "attendance"
  | "participation"
  | "absenceReasons"
  | "absenceRequests"
  | "schedule"
  | "password";

const HEADER_H = 56; // layout.tsx 69행: h-14
const PAGE_PAD_X = 16; // layout.tsx 68행 lg:px-4(헤더 내부 좌우 여백)

// 헤더 아래 전체 영역 — main(132행)의 px-4 py-6 패딩은 이 셸이 아니라 각 본문 목업이 스스로 그린다
// (Task 6 HomeroomWeeklyMock 등과 동일 컨벤션 — 컨트롤러 결정).
export const HOMEROOM_BODY: Rect = {
  x: 0,
  y: HEADER_H,
  w: PC_VIEWPORT.w,
  h: PC_VIEWPORT.h - HEADER_H,
};

// 10-16행: 담임 전용 탭(homeroomItems) + 19-22행: 공통 탭(commonItems)
const HOMEROOM_TABS: { tab: HomeroomTab; label: string; homeroomOnly: boolean }[] = [
  { tab: "students", label: "학생관리", homeroomOnly: true },
  { tab: "attendance", label: "월간출결", homeroomOnly: true },
  { tab: "participation", label: "참여설정", homeroomOnly: true },
  { tab: "absenceReasons", label: "불참사유등록", homeroomOnly: true },
  { tab: "absenceRequests", label: "불참신청", homeroomOnly: true },
  { tab: "schedule", label: "감독일정", homeroomOnly: false },
  { tab: "password", label: "비밀번호", homeroomOnly: false },
];

const tabsForRole = (role: "homeroom" | "supervisor") =>
  HOMEROOM_TABS.filter((t) => role === "homeroom" || !t.homeroomOnly);

// 83행 px-3(24) 패딩 + 텍스트 폭(14px 글자 ≈14px/자) 근사.
const tabWidth = (label: string) => 24 + label.length * 14;

const LOGO_IMG = 32; // 75행 sm:w-8 sm:h-8(lg에서도 유지)
const LOGO_GAP = 8; // 75행 sm:gap-2
const LOGO_TEXT_W = 46; // "출석부" text-lg font-bold(76행) 근사
const LOGO_BLOCK_W = LOGO_IMG + LOGO_GAP + LOGO_TEXT_W;
const LOGO_MR = 16; // 73행 lg:mr-4
const TAB_GAP = 4; // 70행 gap-1

const tabLayout = (role: "homeroom" | "supervisor") => {
  let x = PAGE_PAD_X + LOGO_BLOCK_W + LOGO_MR + TAB_GAP;
  return tabsForRole(role).map((t) => {
    const w = tabWidth(t.label);
    const rect: Rect = { x, y: 0, w, h: HEADER_H };
    x += w + TAB_GAP;
    return { ...t, rect };
  });
};

export const homeroomTabPoint = (tab: HomeroomTab, role: "homeroom" | "supervisor"): Point => {
  const found = tabLayout(role).find((t) => t.tab === tab);
  const rect = found?.rect ?? { x: PAGE_PAD_X, y: 0, w: 0, h: HEADER_H };
  return { x: rect.x + rect.w / 2, y: HEADER_H / 2 };
};

const GAP_RIGHT = 12; // 94행 sm:gap-3
const CHIP_W = 40; // 96-98행 "1-2" px-2 py-1 text-xs
const BELL_W = 96; // NotificationBell.tsx 89행 min-w-11 px-2 + "🔕 알림 켜기"(92행 sm:inline)
const NAME_W = ME.name.length * 14;
const HELP_HIT = 44; // 컨트롤러 결정: 44px 히트 영역
const HELP_DOT = 28; // 보이는 원 28px
const LOGOUT_W = 16 + "로그아웃".length * 13; // 104행 px-2 + 텍스트

type RightBlock = { key: string; x: number; w: number };

const rightLayout = (role: "homeroom" | "supervisor", showHelp: boolean): RightBlock[] => {
  const blocks: { key: string; w: number }[] = [];
  if (role === "homeroom") blocks.push({ key: "chip", w: CHIP_W });
  blocks.push({ key: "bell", w: BELL_W });
  blocks.push({ key: "name", w: NAME_W });
  if (showHelp) blocks.push({ key: "help", w: HELP_HIT });
  blocks.push({ key: "logout", w: LOGOUT_W });

  let right = PC_VIEWPORT.w - PAGE_PAD_X;
  const placed: RightBlock[] = [];
  for (let i = blocks.length - 1; i >= 0; i -= 1) {
    const b = blocks[i];
    const x = right - b.w;
    placed.unshift({ key: b.key, x, w: b.w });
    right = x - GAP_RIGHT;
  }
  return placed;
};

export type HomeroomShellMockProps = {
  tab: HomeroomTab;
  role: "homeroom" | "supervisor";
  showHelp?: boolean;
  tabPressAt?: { tab: HomeroomTab; at: number };
  children: React.ReactNode;
};

export const HomeroomShellMock: React.FC<HomeroomShellMockProps> = ({ tab, role, showHelp, tabPressAt, children }) => {
  const frame = useCurrentFrame();
  const tabs = tabLayout(role);
  const rightBlocks = rightLayout(role, Boolean(showHelp));
  const rightOf = (key: string) => rightBlocks.find((b) => b.key === key);
  const chip = rightOf("chip");
  const bell = rightOf("bell");
  const name = rightOf("name");
  const help = rightOf("help");
  const logout = rightOf("logout");

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: PC_VIEWPORT.w, height: PC_VIEWPORT.h, background: tw.gray[50], fontFamily: FONT, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: PC_VIEWPORT.w, height: HEADER_H, background: tw.white, borderBottom: `1px solid ${tw.gray[200]}`, boxSizing: "border-box" }}>
        {/* 로고 + "출석부"(71-77행) */}
        <Img
          src={staticFile("posan.svg")}
          alt=""
          width={LOGO_IMG}
          height={LOGO_IMG}
          style={{ position: "absolute", left: PAGE_PAD_X, top: (HEADER_H - LOGO_IMG) / 2, width: LOGO_IMG, height: LOGO_IMG }}
        />
        <span
          style={{
            position: "absolute",
            left: PAGE_PAD_X + LOGO_IMG + LOGO_GAP,
            top: 0,
            height: HEADER_H,
            display: "flex",
            alignItems: "center",
            fontSize: 18,
            fontWeight: 700,
            color: tw.gray[900],
            whiteSpace: "nowrap",
          }}
        >
          출석부
        </span>

        {/* 탭(79-91행) */}
        {tabs.map((t) => {
          const active = t.tab === tab;
          const pressing = tabPressAt && tabPressAt.tab === t.tab ? tabPressAt.at : null;
          return (
            <div
              key={t.tab}
              style={{
                position: "absolute",
                left: t.rect.x,
                top: 0,
                width: t.rect.w,
                height: HEADER_H,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 500,
                borderRadius: 6,
                whiteSpace: "nowrap",
                boxSizing: "border-box",
                background: active ? tw.blue[50] : "transparent",
                color: active ? tw.blue[700] : tw.gray[600],
              }}
            >
              <span style={{ scale: String(pressScale(frame, pressing)) }}>{t.label}</span>
            </div>
          );
        })}

        {/* 우측: 반 칩·알림 벨·이름·(도움말)·로그아웃(94-107행) */}
        {chip ? (
          <div
            style={{
              position: "absolute",
              left: chip.x,
              top: (HEADER_H - 22) / 2,
              width: chip.w,
              height: 22,
              borderRadius: 4,
              background: tw.gray[100],
              color: tw.gray[400],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              whiteSpace: "nowrap",
              boxSizing: "border-box",
            }}
          >
            {ME.homeroom.grade}-{ME.homeroom.classNumber}
          </div>
        ) : null}

        {bell ? (
          <div
            style={{
              position: "absolute",
              left: bell.x,
              top: 0,
              width: bell.w,
              height: HEADER_H,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              fontSize: 14,
              color: tw.gray[600],
              whiteSpace: "nowrap",
            }}
          >
            <span>🔕</span>
            <span>알림 켜기</span>
          </div>
        ) : null}

        {name ? (
          <div
            style={{
              position: "absolute",
              left: name.x,
              top: 0,
              width: name.w,
              height: HEADER_H,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              color: tw.gray[500],
              whiteSpace: "nowrap",
            }}
          >
            {ME.name}
          </div>
        ) : null}

        {/* ? 도움말 버튼 — 앱에는 아직 없음(컨트롤러 결정: 로그아웃 직전, 28px 원 + 44px 히트 영역) */}
        {help ? (
          <div style={{ position: "absolute", left: help.x, top: (HEADER_H - HELP_HIT) / 2, width: HELP_HIT, height: HELP_HIT, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div
              style={{
                width: HELP_DOT,
                height: HELP_DOT,
                borderRadius: HELP_DOT / 2,
                border: `1px solid ${tw.gray[300]}`,
                color: tw.gray[500],
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: "nowrap",
                boxSizing: "border-box",
              }}
            >
              ?
            </div>
          </div>
        ) : null}

        {logout ? (
          <div
            style={{
              position: "absolute",
              left: logout.x,
              top: 0,
              width: logout.w,
              height: HEADER_H,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              color: tw.gray[500],
              whiteSpace: "nowrap",
            }}
          >
            로그아웃
          </div>
        ) : null}
      </div>

      {/* 본문(132행 main, HOMEROOM_BODY 영역) */}
      <div style={{ position: "absolute", left: HOMEROOM_BODY.x, top: HOMEROOM_BODY.y, width: HOMEROOM_BODY.w, height: HOMEROOM_BODY.h, overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
};
