// src/components/admin-shared/AdminNav.tsx(58-121행, subAdminGrades=[GRADE] 세션) +
// src/app/grade-admin/[grade]/page.tsx(56-72행 6탭) 이식 — PC 폭 학년관리 셸.
// 나머지 학년관리자 목업 태스크가 GRADE_ADMIN_BODY·gradeAdminTabPoint 를 기준으로 본문을 얹는다.
import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { GRADE, ME } from "../data";
import { PC_VIEWPORT, type Point, type Rect } from "../../app-mocks/layout";
import { pressScale } from "../../app-mocks/primitives";
import { tw } from "../../app-mocks/tw";
import { FONT } from "../../fonts";

export type GradeAdminTab = "today" | "students" | "participation" | "seats" | "supervisors" | "monthly";

const HEADER_H = 56; // AdminNav.tsx 60행 h-14
const NAV_PAD_X = 16; // AdminNav.tsx 59행 "max-w-7xl mx-auto px-4"

const MAIN_PAD_X = 16; // [grade]/layout.tsx 6행 main lg:px-4 (PC 폭이라 lg 적용)
const MAIN_PAD_TOP = 12; // 같은 행 py-3(반응형 접두어 없음)

const TAB_ROW_Y = HEADER_H + MAIN_PAD_TOP; // 68
const TAB_H = 42; // page.tsx 65행 px-5 py-2.5(20) + text-sm 줄높이(20) + border-b-2(2)
const TAB_MB = 12; // page.tsx 61행 mb-3

// 헤더 + 6탭 아래, 실제 탭 콘텐츠가 시작되는 사각형 — 전체 폭을 주고, main 의 lg:px-4 는
// 이 셸이 아니라 각 본문 목업이 스스로 그린다(teacher/mocks/HomeroomShellMock.tsx 의 HOMEROOM_BODY 와 같은 관례).
export const GRADE_ADMIN_BODY: Rect = {
  x: 0,
  y: TAB_ROW_Y + TAB_H + TAB_MB,
  w: PC_VIEWPORT.w,
  h: PC_VIEWPORT.h - (TAB_ROW_Y + TAB_H + TAB_MB),
};

const TABS: { tab: GradeAdminTab; label: string }[] = [
  { tab: "today", label: "오늘출결" },
  { tab: "students", label: "학생 관리" },
  { tab: "participation", label: "참여 설정" },
  { tab: "seats", label: "좌석 배치" },
  { tab: "supervisors", label: "감독 배정" },
  { tab: "monthly", label: "월간출결" },
];

// page.tsx 65행 px-5(40) + text-sm(14px/자) 근사 — teacher/mocks/HomeroomShellMock.tsx tabWidth 관례와 동일.
const tabWidth = (label: string) => 40 + label.length * 14;

const tabLayout = () => {
  let x = MAIN_PAD_X;
  return TABS.map((t) => {
    const w = tabWidth(t.label);
    const rect: Rect = { x, y: TAB_ROW_Y, w, h: TAB_H };
    x += w; // page.tsx 60행 flex 컨테이너에 gap 클래스 없음 — 탭이 서로 붙어 있다.
    return { ...t, rect };
  });
};

export const gradeAdminTabPoint = (tab: GradeAdminTab): Point => {
  const found = tabLayout().find((t) => t.tab === tab);
  const rect = found?.rect ?? { x: MAIN_PAD_X, y: TAB_ROW_Y, w: 0, h: TAB_H };
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
};

// AdminNav.tsx 33-38행 gradeAdminItems — subAdminGrades=[GRADE] 하나뿐이라 이 셸 안에서는 항상 active(초록).
const GRADE_LABEL = `${GRADE}학년 데이터관리`;
const LOGO_IMG = 32; // AdminNav.tsx 67행 w-8 h-8
const LOGO_GAP = 8; // 같은 행 gap-2
const LOGO_TEXT_W = 46; // "출석부" text-lg font-bold 근사 — HomeroomShellMock.tsx 와 동일 수치
const LOGO_BLOCK_W = LOGO_IMG + LOGO_GAP + LOGO_TEXT_W;
const LOGO_MR = 16; // 66행 mr-4
const NAV_ITEM_GAP = 4; // 63행 gap-1(로고 링크와 학년 칩 사이에도 적용된다)
const GRADE_CHIP_X = NAV_PAD_X + LOGO_BLOCK_W + LOGO_MR + NAV_ITEM_GAP;
const GRADE_CHIP_W = 24 + GRADE_LABEL.length * 14; // px-3(24) + text-sm(14px/자)

const HOMEROOM_CHIP_LABEL = "담임교사"; // AdminNav.tsx 96-101행 — ME 는 1-2 담임(roles.includes("homeroom"))
const HOMEROOM_CHIP_W = 24 + HOMEROOM_CHIP_LABEL.length * 12; // px-3(24) + text-xs(12px/자)
const BELL_W = 96; // NotificationBell.tsx — 아이콘 + "알림 켜기"(sm:inline 라벨)
const NAME_W = ME.name.length * 14;
const HELP_HIT = 44; // 컨트롤러 결정: AdminNav 에는 아직 없는 "?" 도움말 — 44px 히트 영역
const HELP_DOT = 28; // GuideHelpButton.tsx 실제 원 크기(h-7 w-7)
const LOGOUT_W = 16 + "로그아웃".length * 13;
const GAP_RIGHT = 12; // AdminNav.tsx 94행 gap-3

type RightBlock = { key: string; x: number; w: number };

const rightLayout = (showHelp: boolean): RightBlock[] => {
  const blocks: { key: string; w: number }[] = [
    { key: "homeroom", w: HOMEROOM_CHIP_W },
    { key: "bell", w: BELL_W },
    { key: "name", w: NAME_W },
  ];
  if (showHelp) blocks.push({ key: "help", w: HELP_HIT });
  blocks.push({ key: "logout", w: LOGOUT_W });

  let right = PC_VIEWPORT.w - NAV_PAD_X;
  const placed: RightBlock[] = [];
  for (let i = blocks.length - 1; i >= 0; i -= 1) {
    const b = blocks[i];
    const x = right - b.w;
    placed.unshift({ key: b.key, x, w: b.w });
    right = x - GAP_RIGHT;
  }
  return placed;
};

export type GradeAdminShellMockProps = {
  tab: GradeAdminTab;
  tabPressAt?: { tab: GradeAdminTab; at: number };
  showHelp?: boolean;
  scrollY?: number;
  children?: React.ReactNode;
};

export const GradeAdminShellMock: React.FC<GradeAdminShellMockProps> = ({
  tab,
  tabPressAt,
  showHelp,
  scrollY = 0,
  children,
}) => {
  const frame = useCurrentFrame();
  const tabs = tabLayout();
  const right = rightLayout(Boolean(showHelp));
  const rightOf = (key: string) => right.find((b) => b.key === key);
  const homeroomChip = rightOf("homeroom");
  const bell = rightOf("bell");
  const name = rightOf("name");
  const help = rightOf("help");
  const logout = rightOf("logout");

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: PC_VIEWPORT.w,
        height: PC_VIEWPORT.h,
        background: tw.gray[50],
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      {/* AdminNav.tsx 58-121행 */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: PC_VIEWPORT.w,
          height: HEADER_H,
          background: tw.white,
          borderBottom: `1px solid ${tw.gray[200]}`,
          boxSizing: "border-box",
        }}
      >
        <Img
          src={staticFile("posan.svg")}
          alt=""
          width={LOGO_IMG}
          height={LOGO_IMG}
          style={{ position: "absolute", left: NAV_PAD_X, top: (HEADER_H - LOGO_IMG) / 2, width: LOGO_IMG, height: LOGO_IMG }}
        />
        <span
          style={{
            position: "absolute",
            left: NAV_PAD_X + LOGO_IMG + LOGO_GAP,
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

        <div
          style={{
            position: "absolute",
            left: GRADE_CHIP_X,
            top: (HEADER_H - 44) / 2,
            width: GRADE_CHIP_W,
            height: 44,
            borderRadius: 6,
            background: tw.green[50],
            color: tw.green[700],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 500,
            whiteSpace: "nowrap",
            boxSizing: "border-box",
          }}
        >
          {GRADE_LABEL}
        </div>

        {/* 우측: 담임교사 칩·알림벨·이름·(도움말)·로그아웃(94-107행) */}
        {homeroomChip ? (
          <div
            style={{
              position: "absolute",
              left: homeroomChip.x,
              top: (HEADER_H - 44) / 2,
              width: homeroomChip.w,
              height: 44,
              borderRadius: 6,
              background: tw.blue[50],
              color: tw.blue[700],
              border: `1px solid ${tw.blue[200]}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 500,
              whiteSpace: "nowrap",
              boxSizing: "border-box",
            }}
          >
            {HOMEROOM_CHIP_LABEL}
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

        {/* ? 도움말 — AdminNav 에는 아직 없음(컨트롤러 결정: HomeroomShellMock/StudentShellMock 과 동일 관례,
            로그아웃 직전 44px 히트 영역 + GuideHelpButton.tsx 실제 스타일: border-2 border-current text-sm font-bold) */}
        {help ? (
          <div
            style={{
              position: "absolute",
              left: help.x,
              top: (HEADER_H - HELP_HIT) / 2,
              width: HELP_HIT,
              height: HELP_HIT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: HELP_DOT,
                height: HELP_DOT,
                borderRadius: HELP_DOT / 2,
                border: `2px solid ${tw.gray[500]}`,
                color: tw.gray[500],
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
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

      {/* page.tsx 60행 탭 줄 밑선(전체 폭 1px) — active 탭의 2px 파란 밑선이 그 위에 겹쳐 그려진다 */}
      <div
        style={{
          position: "absolute",
          left: MAIN_PAD_X,
          top: TAB_ROW_Y + TAB_H - 1,
          width: PC_VIEWPORT.w - MAIN_PAD_X * 2,
          height: 1,
          background: tw.gray[200],
        }}
      />

      {/* page.tsx 56-72행: 6탭 */}
      {tabs.map((t) => {
        const active = t.tab === tab;
        const pressing = tabPressAt && tabPressAt.tab === t.tab ? tabPressAt.at : null;
        return (
          <div
            key={t.tab}
            style={{
              position: "absolute",
              left: t.rect.x,
              top: t.rect.y,
              width: t.rect.w,
              height: t.rect.h,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 500,
              whiteSpace: "nowrap",
              boxSizing: "border-box",
              borderBottom: `2px solid ${active ? tw.blue[600] : "transparent"}`,
              color: active ? tw.blue[600] : tw.gray[500],
            }}
          >
            <span style={{ scale: String(pressScale(frame, pressing)) }}>{t.label}</span>
          </div>
        );
      })}

      {/* 탭 콘텐츠(GRADE_ADMIN_BODY) — overflow-y 스크롤을 scrollY 로 흉내 낸다 */}
      <div
        style={{
          position: "absolute",
          left: GRADE_ADMIN_BODY.x,
          top: GRADE_ADMIN_BODY.y,
          width: GRADE_ADMIN_BODY.w,
          height: GRADE_ADMIN_BODY.h,
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", left: 0, top: -scrollY, width: GRADE_ADMIN_BODY.w }}>{children}</div>
      </div>
    </div>
  );
};
