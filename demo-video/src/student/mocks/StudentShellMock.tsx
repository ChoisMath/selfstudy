// src/app/student/layout.tsx 이식 — 학생 편 페이지 셸(헤더 2행 + 스크롤 본문).
// 실제 소스에는 아직 없는 ? 도움말 버튼(showHelp)은 src/components/guide/GuideHelpButton.tsx 그대로
// 옮긴다(계획 3 Task 7에서 앱에 추가될 예정, 로그아웃 바로 앞).
import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { textWidth } from "../../app-mocks/AttendanceHeaderMock";
import { PHONE_BODY, type Point, type Rect } from "../../app-mocks/layout";
import { pressScale } from "../../app-mocks/primitives";
import { tw } from "../../app-mocks/tw";
import { FONT } from "../../fonts";
import { ME_STUDENT, ME_STUDENT_HEADER } from "../data";

export type StudentTab = "schedule" | "record" | "absences" | "batch";

// layout.tsx 35행 [--header-h:7.625rem] = 122px(다른 sticky 계산에 쓰이는 실측값을 그대로 따른다).
// 1행(로고·이름·로그아웃) py-4(32) + 내용(logo 32px) ≈ 64, 2행(탭) min-h-11 = 44 — 122와의 차이(14px)는
// 실제 폰트(Noto Sans KR) 줄높이가 근사식보다 커서 생기는 오차이므로, 1행에 그 차이를 흡수시킨다.
const ROW2_H = 44; // 58행 min-h-11 탭
const ROW1_H = 78; // 122 - ROW2_H
export const STUDENT_HEADER_H = ROW1_H + ROW2_H;

const PAGE_PAD_X = 16; // 38행 max-w-2xl mx-auto px-4
const LOGO_SIZE = 32; // 40행 w-8 h-8
const LOGO_GAP = 8; // 39행 gap-2
const TAB_PAD_X = 16; // 68행 px-4(탭 좌우 각 16)
const TAB_GAP = 4; // 58행 gap-1
const GAP_RIGHT = 12; // 컨트롤러 결정: 로그아웃 앞 도움말과의 간격(교사 편 HomeroomShellMock과 동일 값)
const HELP_HIT = 44; // GuideHelpButton.tsx 11행 min-h-11 min-w-11
const HELP_DOT = 28; // GuideHelpButton.tsx 13행 h-7 w-7

// 본문(<main> 83행, px-2 md:px-3 lg:px-4 py-6)은 이 셸이 그린다 — 학생 편은 페이지마다
// 본문이 여러 카드로 쪼개져 있어(계획 3 Task 2/3), 교사 편(HomeroomShellMock)처럼 각 카드 목업에
// 페이지 패딩을 중복해서 넣지 않고 셸 한 곳에서만 적용한다.
const BODY_PAD_X = 8; // px-2(휴대폰 폭 390은 sm 640 미만이라 base 값만 적용)
const BODY_PAD_TOP = 24; // py-6

export const STUDENT_BODY: Rect = {
  x: 0,
  y: STUDENT_HEADER_H,
  w: PHONE_BODY.w,
  h: PHONE_BODY.h - STUDENT_HEADER_H,
};

// 본문 카드(ParticipationCardMock 등)에 넘길 실제 표시 폭 — px-2 좌우 패딩을 뺀 값.
export const STUDENT_CONTENT_W = PHONE_BODY.w - BODY_PAD_X * 2;

// 카드 간 mt-6(page.tsx) 간격.
export const STUDENT_CARD_GAP = 24;

const STUDENT_TABS: { tab: StudentTab; label: string; batchOnly: boolean }[] = [
  { tab: "schedule", label: "참여일정", batchOnly: false },
  { tab: "record", label: "출결기록", batchOnly: false },
  { tab: "absences", label: "불참목록", batchOnly: false },
  { tab: "batch", label: "일괄신청", batchOnly: true },
];

const tabLayout = (showBatchTab: boolean) => {
  let x = PAGE_PAD_X;
  return STUDENT_TABS.filter((t) => !t.batchOnly || showBatchTab).map((t) => {
    const w = TAB_PAD_X * 2 + textWidth(t.label, 14, 500);
    const rect: Rect = { x, y: ROW1_H, w, h: ROW2_H };
    x += w + TAB_GAP;
    return { ...t, rect };
  });
};

type RightBlock = { key: "help" | "logout"; x: number; w: number };

const rightLayout = (showHelp: boolean): RightBlock[] => {
  const logoutW = 24 + textWidth("로그아웃", 14, 400); // 49행 px-3(12+12) + 텍스트
  const blocks: { key: "help" | "logout"; w: number }[] = [];
  if (showHelp) blocks.push({ key: "help", w: HELP_HIT });
  blocks.push({ key: "logout", w: logoutW });

  let right = PHONE_BODY.w - PAGE_PAD_X;
  const placed: RightBlock[] = [];
  for (let i = blocks.length - 1; i >= 0; i -= 1) {
    const b = blocks[i];
    const x = right - b.w;
    placed.unshift({ key: b.key, x, w: b.w });
    right = x - GAP_RIGHT;
  }
  return placed;
};

// 이름 h1(41-46행): "{name} " 은 text-lg font-bold, "({code})" 는 중첩 span text-sm font-normal.
const nameBlockWidth = () =>
  textWidth(`${ME_STUDENT.name} `, 18, 700) + textWidth(`(${ME_STUDENT_HEADER})`, 14, 400);

export const studentShellPoint = (key: `tab_${StudentTab}` | "logout" | "help" | "name"): Point => {
  if (key.startsWith("tab_")) {
    const tab = key.slice(4) as StudentTab;
    const found = tabLayout(true).find((t) => t.tab === tab);
    const rect = found?.rect ?? { x: PAGE_PAD_X, y: ROW1_H, w: 0, h: ROW2_H };
    return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  }
  if (key === "name") {
    const x = PAGE_PAD_X + LOGO_SIZE + LOGO_GAP;
    return { x: x + nameBlockWidth() / 2, y: ROW1_H / 2 };
  }
  const block = rightLayout(true).find((b) => b.key === key);
  const rect = block ?? { x: PHONE_BODY.w - PAGE_PAD_X, y: 0, w: 0 };
  return { x: rect.x + rect.w / 2, y: ROW1_H / 2 };
};

export type StudentShellMockProps = {
  width: number;
  height: number;
  tab: StudentTab;
  showBatchTab?: boolean;
  showHelp?: boolean;
  tabPressAt?: { tab: StudentTab; at: number };
  scrollY?: number;
  children: React.ReactNode;
};

export const StudentShellMock: React.FC<StudentShellMockProps> = ({
  width,
  height,
  tab,
  showBatchTab,
  showHelp,
  tabPressAt,
  scrollY = 0,
  children,
}) => {
  const frame = useCurrentFrame();
  const tabs = tabLayout(Boolean(showBatchTab));
  const right = rightLayout(Boolean(showHelp));
  const help = right.find((b) => b.key === "help");
  const logout = right.find((b) => b.key === "logout");
  const bodyH = height - STUDENT_HEADER_H;

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        background: tw.gray[50],
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height: STUDENT_HEADER_H,
          background: tw.white,
          borderBottom: `1px solid ${tw.gray[200]}`,
          boxSizing: "border-box",
          zIndex: 10,
        }}
      >
        {/* 1행: 로고 + 이름(학번) + 로그아웃(38-54행) */}
        <Img
          src={staticFile("posan.svg")}
          alt=""
          width={LOGO_SIZE}
          height={LOGO_SIZE}
          style={{ position: "absolute", left: PAGE_PAD_X, top: (ROW1_H - LOGO_SIZE) / 2, width: LOGO_SIZE, height: LOGO_SIZE }}
        />
        <span
          style={{
            position: "absolute",
            left: PAGE_PAD_X + LOGO_SIZE + LOGO_GAP,
            top: 0,
            height: ROW1_H,
            display: "flex",
            alignItems: "center",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: tw.gray[900] }}>{ME_STUDENT.name} </span>
          <span style={{ fontSize: 14, fontWeight: 400, color: tw.gray[500] }}>({ME_STUDENT_HEADER})</span>
        </span>

        {help ? (
          <div
            style={{
              position: "absolute",
              left: help.x,
              top: (ROW1_H - HELP_HIT) / 2,
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
                lineHeight: 1,
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
              height: ROW1_H,
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

        {/* 2행: 탭(56-79행) */}
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
                borderRadius: "8px 8px 0 0",
                boxSizing: "border-box",
                whiteSpace: "nowrap",
                background: active ? tw.gray[50] : "transparent",
                color: active ? tw.blue[600] : tw.gray[500],
                borderBottom: `2px solid ${active ? tw.blue[600] : "transparent"}`,
              }}
            >
              <span style={{ scale: String(pressScale(frame, pressing)) }}>{t.label}</span>
            </div>
          );
        })}
      </div>

      {/* 본문(83행 main, px-2 py-6) — overflow-y 스크롤을 scrollY 로 흉내 낸다 */}
      <div
        style={{
          position: "absolute",
          left: STUDENT_BODY.x,
          top: STUDENT_BODY.y,
          width: STUDENT_BODY.w,
          height: bodyH,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: -scrollY,
            width: STUDENT_BODY.w,
            boxSizing: "border-box",
            padding: `${BODY_PAD_TOP}px ${BODY_PAD_X}px`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
