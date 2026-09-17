// src/app/attendance/layout.tsx 9-53행 헤더 이식 — 교사 편 헤더 목업은 전부 폰 폭이라 재사용 불가.
// PC 폭(1248) 기준. Enter 장면이 초록 "1학년 관리" 칩을 눌러 학년 데이터관리로 넘어갈 때 쓴다.
import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { GRADE, ME } from "../data";
import { PC_VIEWPORT, type Rect } from "../../app-mocks/layout";
import { pressScale } from "../../app-mocks/primitives";
import { tw } from "../../app-mocks/tw";
import { FONT } from "../../fonts";

export type AttendanceTopBarKey = "logo" | "help" | "gradeAdmin" | "homeroom" | "bell" | "name" | "logout";

const HEADER_H = 60; // layout.tsx 11행 py-2(16) + min-h-11(44) 버튼 높이
const PAGE_PAD_X = 16; // 같은 행 sm:px-4(PC 폭이라 sm 적용)
const GAP_RIGHT = 12; // 15행 sm:gap-3

const LOGO_IMG = 32; // 18행 sm:w-8 sm:h-8
const LOGO_GAP = 8; // 17행 sm:gap-2
const LOGO_TEXT_W = 42; // "출석부" text-sm sm:text-base(16px) 근사
const LOGO_BLOCK_W = LOGO_IMG + LOGO_GAP + LOGO_TEXT_W;

const GRADE_LABEL = `${GRADE}학년 관리`; // layout.tsx 30행 {g}학년 관리
const GRADE_CHIP_W = 24 + GRADE_LABEL.length * 12; // sm:px-3(24) + sm:text-xs(12px/자)
const HOMEROOM_LABEL = "담임교사"; // layout.tsx 38행 — ME 는 homeroom
const HOMEROOM_CHIP_W = 24 + HOMEROOM_LABEL.length * 12;
const BELL_W = 96; // NotificationBell.tsx — 아이콘 + "알림 켜기"(sm:inline 라벨)
const NAME_W = ME.name.length * 14; // sm:text-sm(14px/자)
const HELP_HIT = 44; // GuideHelpButton.tsx min-h-11 min-w-11
const LOGOUT_W = 16 + "로그아웃".length * 13; // sm:px-2 sm:text-sm

type Block = { key: AttendanceTopBarKey; x: number; w: number };

// layout.tsx 22-49행 순서: ? 도움말 · 초록 학년 칩 · 파랑 담임/감독 칩 · 알림벨 · 이름 · 로그아웃.
const rightLayout = (width: number): Block[] => {
  const blocks: { key: AttendanceTopBarKey; w: number }[] = [
    { key: "help", w: HELP_HIT },
    { key: "gradeAdmin", w: GRADE_CHIP_W },
    { key: "homeroom", w: HOMEROOM_CHIP_W },
    { key: "bell", w: BELL_W },
    { key: "name", w: NAME_W },
    { key: "logout", w: LOGOUT_W },
  ];
  let right = width - PAGE_PAD_X;
  const placed: Block[] = [];
  for (let i = blocks.length - 1; i >= 0; i -= 1) {
    const b = blocks[i];
    const x = right - b.w;
    placed.unshift({ key: b.key, x, w: b.w });
    right = x - GAP_RIGHT;
  }
  return placed;
};

export const attendanceTopBarRect = (key: AttendanceTopBarKey, width: number = PC_VIEWPORT.w): Rect => {
  if (key === "logo") return { x: PAGE_PAD_X, y: 0, w: LOGO_BLOCK_W, h: HEADER_H };
  const found = rightLayout(width).find((b) => b.key === key);
  const block = found ?? { x: width - PAGE_PAD_X, w: 0 };
  return { x: block.x, y: 0, w: block.w, h: HEADER_H };
};

export type AttendanceTopBarMockProps = {
  width: number;
  gradePressAt?: number;
};

export const AttendanceTopBarMock: React.FC<AttendanceTopBarMockProps> = ({ width, gradePressAt }) => {
  const frame = useCurrentFrame();
  const right = rightLayout(width);
  const rightOf = (key: AttendanceTopBarKey) => right.find((b) => b.key === key);
  const help = rightOf("help");
  const gradeAdmin = rightOf("gradeAdmin");
  const homeroom = rightOf("homeroom");
  const bell = rightOf("bell");
  const name = rightOf("name");
  const logout = rightOf("logout");

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width,
        height: HEADER_H,
        background: tw.white,
        borderBottom: `1px solid ${tw.gray[200]}`,
        boxSizing: "border-box",
        fontFamily: FONT,
      }}
    >
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
          fontSize: 16,
          fontWeight: 700,
          color: tw.gray[900],
          whiteSpace: "nowrap",
        }}
      >
        출석부
      </span>

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
          {/* GuideHelpButton.tsx — h-7 w-7(28) border-2 border-current text-sm font-bold */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
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

      {gradeAdmin ? (
        <div
          style={{
            position: "absolute",
            left: gradeAdmin.x,
            top: (HEADER_H - 44) / 2,
            width: gradeAdmin.w,
            height: 44,
            borderRadius: 6,
            background: tw.green[50],
            color: tw.green[700],
            border: `1px solid ${tw.green[200]}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 500,
            whiteSpace: "nowrap",
            boxSizing: "border-box",
            scale: String(pressScale(frame, gradePressAt)),
          }}
        >
          {GRADE_LABEL}
        </div>
      ) : null}

      {homeroom ? (
        <div
          style={{
            position: "absolute",
            left: homeroom.x,
            top: (HEADER_H - 44) / 2,
            width: homeroom.w,
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
          {HOMEROOM_LABEL}
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
            color: tw.gray[600],
            whiteSpace: "nowrap",
          }}
        >
          {ME.name}
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
            color: tw.gray[600],
            whiteSpace: "nowrap",
          }}
        >
          로그아웃
        </div>
      ) : null}
    </div>
  );
};
