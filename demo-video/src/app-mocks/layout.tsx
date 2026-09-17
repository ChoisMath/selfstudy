import React from "react";
import { BROWSER } from "../theme";

export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

// PC 목업은 1248px 폭 화면을 1.25배로 키워 브라우저 본문(1560×712)을 채운다 — 실제 크기 글자(14px)가 영상에서 읽히게.
export const PC_VIEWPORT = { w: 1248, h: 570 } as const;
export const PC_SCALE = BROWSER.w / PC_VIEWPORT.w;
export const PHONE_BODY = { w: 390, h: 752 } as const;

export const pcAbs = (p: Point): Point => ({
  x: BROWSER.x + p.x * PC_SCALE,
  y: BROWSER.y + BROWSER.chrome + p.y * PC_SCALE,
});

export const pcRectAbs = (r: Rect) => ({
  ...pcAbs(r),
  width: r.w * PC_SCALE,
  height: r.h * PC_SCALE,
});

export const PcViewport: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      width: PC_VIEWPORT.w,
      height: PC_VIEWPORT.h,
      transform: `scale(${PC_SCALE})`,
      transformOrigin: "top left",
      overflow: "hidden",
    }}
  >
    {children}
  </div>
);
