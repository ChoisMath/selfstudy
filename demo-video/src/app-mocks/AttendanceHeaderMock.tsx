// 앱 src/app/attendance/layout.tsx 헤더 재현 + NotificationBell(기본 상태 "알림 켜기") + GuideHelpButton(`?`).
import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { FONT } from "../fonts";
import type { Point, Rect } from "./layout";
import { pressScale } from "./primitives";
import { tw } from "./tw";

// Inter + Noto Sans KR 실측(9~16px) 기준 글자 폭(em). 목업 좌표 계산용 근사.
const CHAR_EM: Record<string, number> = {
  " ": 0.28,
  ".": 0.3,
  ",": 0.3,
  "(": 0.36,
  ")": 0.36,
  "-": 0.43,
  "*": 0.58,
  "?": 0.55,
  "▾": 0.64,
};
const HANGUL = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/;
const DIGIT = /[0-9]/;

export const textWidth = (text: string, size: number, weight = 400): number => {
  let em = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code === 0xfe0f) continue;
    if (HANGUL.test(ch)) em += 0.92;
    else if (code >= 0x1f000) em += 1.29;
    else if (ch === "1") em += 0.43;
    else if (DIGIT.test(ch)) em += weight >= 600 ? 0.64 : 0.6;
    else em += CHAR_EM[ch] ?? 0.6;
  }
  return em * size;
};

export type AttendanceHeaderProps = {
  width: number;
  role: "homeroom" | "supervisor";
  gradeAdmin?: number;
  name: string;
  showHelp?: boolean;
  pressKey?: "homeroom" | "schedule" | "gradeAdmin" | "help";
  pressAt?: number;
};

export type AttendanceHeaderKey = "logo" | "gradeAdmin" | "homeroom" | "schedule" | "bell" | "name" | "help" | "logout";

// py-2 + min-h-11 + border-b
export const ATTENDANCE_HEADER_H = 61;
const ROW_Y = 8;
const ROW_H = 44;
const SM_BREAKPOINT = 640;
const HIT = 44;
const BELL_ICON = "🔕";
const BELL_LABEL = "알림 켜기";
// 앱 globals.css body color
const FOREGROUND = "#171717";

type ItemKind = "gradeAdmin" | "role" | "bell" | "name" | "help" | "logout";
type HeaderItem = { kind: ItemKind; x: number; w: number };

const headerLayout = (props: AttendanceHeaderProps) => {
  const sm = props.width >= SM_BREAKPOINT;
  const padX = sm ? 16 : 8;
  const logoSize = sm ? 32 : 28;
  const logoGap = sm ? 8 : 6;
  const titleFont = sm ? 16 : 14;
  const chipFont = sm ? 12 : 11;
  const chipPadX = sm ? 12 : 6;
  const gap = sm ? 12 : 6;
  const textFont = sm ? 14 : 12;
  const logoW = logoSize + logoGap + textWidth("출석부", titleFont, 700);

  const chipW = (label: string) => textWidth(label, chipFont, 500) + chipPadX * 2 + 2;
  const bellContent = textWidth(BELL_ICON, 14) + (sm ? 4 + textWidth(BELL_LABEL, 14) : 0);
  const widths: { kind: ItemKind; w: number }[] = [];
  if (props.gradeAdmin !== undefined) widths.push({ kind: "gradeAdmin", w: chipW(`${props.gradeAdmin}학년 관리`) });
  widths.push({ kind: "role", w: chipW(props.role === "homeroom" ? "담임교사" : "감독일정") });
  widths.push({ kind: "bell", w: Math.max(HIT, bellContent + 16) });
  widths.push({ kind: "name", w: textWidth(props.name, textFont) });
  if (props.showHelp) widths.push({ kind: "help", w: HIT });
  widths.push({ kind: "logout", w: textWidth("로그아웃", textFont) + 16 });

  const contentW = widths.reduce((sum, item) => sum + item.w, 0) + gap * (widths.length - 1);
  const available = props.width - padX * 2 - logoW;
  // 오른쪽 묶음은 min-w-0 overflow-x-auto — 넘치면 로고 바로 뒤에서 시작해 끝이 잘린다.
  const rightX = contentW <= available ? props.width - padX - contentW : padX + logoW;
  let cursor = 0;
  const items: HeaderItem[] = widths.map((item) => {
    const placed = { kind: item.kind, x: cursor, w: item.w };
    cursor += item.w + gap;
    return placed;
  });
  return {
    sm,
    padX,
    logoSize,
    logoGap,
    logoW,
    titleFont,
    chipFont,
    chipPadX,
    gap,
    textFont,
    rightX,
    rightW: Math.min(contentW, available),
    items,
  };
};

const itemKindOf = (key: AttendanceHeaderKey): ItemKind | "logo" => {
  if (key === "homeroom" || key === "schedule") return "role";
  return key;
};

export const attendanceHeaderRect = (key: AttendanceHeaderKey, props: AttendanceHeaderProps): Rect => {
  const layout = headerLayout(props);
  const kind = itemKindOf(key);
  if (kind === "logo") {
    return { x: layout.padX, y: ROW_Y, w: layout.logoW, h: ROW_H };
  }
  const item = layout.items.find((i) => i.kind === kind) ?? layout.items.find((i) => i.kind === "role");
  if (!item) throw new Error(`header item missing: ${key}`);
  return { x: layout.rightX + item.x, y: ROW_Y, w: item.w, h: ROW_H };
};

export const attendanceHeaderPoint = (key: AttendanceHeaderKey, props: AttendanceHeaderProps): Point => {
  const r = attendanceHeaderRect(key, props);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
};

const Chip: React.FC<{ label: string; tone: "green" | "blue"; font: number; padX: number; scale: number }> = ({
  label,
  tone,
  font,
  padX,
  scale,
}) => (
  <div
    style={{
      height: ROW_H,
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      padding: `0 ${padX}px`,
      fontSize: font,
      fontWeight: 500,
      color: tw[tone][700],
      background: tw[tone][50],
      border: `1px solid ${tw[tone][200]}`,
      borderRadius: 6,
      whiteSpace: "nowrap",
      transform: `scale(${scale})`,
    }}
  >
    {label}
  </div>
);

export const AttendanceHeaderMock: React.FC<AttendanceHeaderProps> = (props) => {
  const frame = useCurrentFrame();
  const layout = headerLayout(props);
  const scaleFor = (key: NonNullable<AttendanceHeaderProps["pressKey"]>) =>
    props.pressKey === key ? pressScale(frame, props.pressAt) : 1;

  const renderItem = (item: HeaderItem) => {
    switch (item.kind) {
      case "gradeAdmin":
        return (
          <Chip
            label={`${props.gradeAdmin}학년 관리`}
            tone="green"
            font={layout.chipFont}
            padX={layout.chipPadX}
            scale={scaleFor("gradeAdmin")}
          />
        );
      case "role":
        return (
          <Chip
            label={props.role === "homeroom" ? "담임교사" : "감독일정"}
            tone="blue"
            font={layout.chipFont}
            padX={layout.chipPadX}
            scale={scaleFor(props.role === "homeroom" ? "homeroom" : "schedule")}
          />
        );
      case "bell":
        return (
          <div
            style={{
              height: ROW_H,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              fontSize: 14,
              whiteSpace: "nowrap",
            }}
          >
            <span>{BELL_ICON}</span>
            {layout.sm ? <span style={{ color: FOREGROUND }}>{BELL_LABEL}</span> : null}
          </div>
        );
      case "name":
        return (
          <div
            style={{
              height: ROW_H,
              display: "flex",
              alignItems: "center",
              fontSize: layout.textFont,
              color: tw.gray[600],
              whiteSpace: "nowrap",
            }}
          >
            {props.name}
          </div>
        );
      case "help":
        return (
          <div
            style={{
              height: ROW_H,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: tw.gray[500],
              transform: `scale(${scaleFor("help")})`,
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                border: "2px solid currentColor",
                fontSize: 14,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              ?
            </span>
          </div>
        );
      default:
        return (
          <div
            style={{
              height: ROW_H,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: layout.textFont,
              color: tw.gray[600],
              whiteSpace: "nowrap",
            }}
          >
            로그아웃
          </div>
        );
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: props.width,
        height: ATTENDANCE_HEADER_H,
        boxSizing: "border-box",
        background: "#fff",
        borderBottom: `1px solid ${tw.gray[200]}`,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: layout.padX,
          top: ROW_Y,
          height: ROW_H,
          display: "flex",
          alignItems: "center",
          gap: layout.logoGap,
          whiteSpace: "nowrap",
        }}
      >
        <Img src={staticFile("posan.svg")} style={{ width: layout.logoSize, height: layout.logoSize }} />
        <span style={{ fontSize: layout.titleFont, fontWeight: 700, color: tw.gray[900], lineHeight: 1.5 }}>출석부</span>
      </div>
      <div
        style={{
          position: "absolute",
          left: layout.rightX,
          top: ROW_Y,
          width: layout.rightW,
          height: ROW_H,
          overflow: "hidden",
        }}
      >
        {layout.items.map((item) => (
          <div key={item.kind} style={{ position: "absolute", left: item.x, top: 0, width: item.w, height: ROW_H }}>
            {renderItem(item)}
          </div>
        ))}
      </div>
    </div>
  );
};
