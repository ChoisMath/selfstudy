import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile } from "remotion";
import { FONT } from "../fonts";
import { BROWSER, colors } from "../theme";
import { PhoneFrame, PHONE } from "../components/PhoneFrame";

// 유튜브 목록에서 가로 210px 로 줄어드는 그림이다. 큰 글자 세 줄과 강조색만으로 승부하고
// 작은 글자는 넣지 않는다. 세 편은 ①역할 이름 ②강조색 ③오른쪽 화면 그림만 다르다.
export const THUMB_WIDTH = 1280;
export const THUMB_HEIGHT = 720;

const PAD_X = 48;
// 720 의 1/5(144) 이상. 가장 긴 "학년관리자 편"(6자+공백)이 한 줄에 들어가는 최대치이기도 하다.
const ROLE_FONT = 160;
const SUB_FONT = 84;
const LABEL_FONT = 27;
const LOGO = 46;
const LABEL_ROW_H = 56;
const BLOCK_TOP = 202;
const GAP_LABEL_ROLE = 30;
const GAP_ROLE_SUB = 22;

// 오른쪽 그림 자리. 화면 오른쪽 밖으로 넘어가되, 유튜브 재생시간 배지가 얹히는
// 오른쪽 아래 모서리(약 160×60)에는 걸치지 않도록 아래 끝을 634 로 묶는다.
const GRAPHIC_LEFT = 968;
const GRAPHIC_BOTTOM = 634;

// 프레임·목업의 등장 애니메이션(0~14프레임)이 끝난 뒤 모습을 쓴다. 컴포지션이 1프레임이라
// <Freeze> 는 durationInFrames-1 로 잘려 쓸 수 없다 — 음수 from 의 Sequence 로 시계를 앞당긴다.
const STILL_FRAME = 40;

// PhoneFrame 안쪽 상수와 같은 값 — 그 파일이 내보내지 않아 여기서 다시 적는다.
const PHONE_BEZEL = 12;
const PHONE_SCALE = 0.83;
const PHONE_BOX_H = (PHONE.h + PHONE_BEZEL * 2) * PHONE_SCALE;

const BROWSER_SCALE = 0.79;

const BackgroundMesh: React.FC<{ accent: string }> = ({ accent }) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <div
      style={{
        position: "absolute",
        width: 900,
        height: 900,
        borderRadius: "50%",
        left: -300,
        top: -380,
        filter: "blur(60px)",
        background: `radial-gradient(circle, ${accent}3d, transparent 62%)`,
      }}
    />
    <div
      style={{
        position: "absolute",
        width: 820,
        height: 820,
        borderRadius: "50%",
        left: 170,
        bottom: -430,
        filter: "blur(70px)",
        background: `radial-gradient(circle, ${accent}2e, transparent 65%)`,
      }}
    />
  </AbsoluteFill>
);

// 세 편이 함께 쓰는 폰 자리 — 오른쪽으로 넘치고 위쪽 크롬(노치·주소창)은 화면 위로 잘린다.
export const ThumbPhone: React.FC<{ url: string; children: React.ReactNode }> = ({ url, children }) => (
  <div style={{ position: "absolute", left: GRAPHIC_LEFT, top: GRAPHIC_BOTTOM - PHONE_BOX_H }}>
    <PhoneFrame x={0} y={0} scale={PHONE_SCALE} url={url}>
      {children}
    </PhoneFrame>
  </div>
);

// BrowserFrame 은 1920×1080 화면의 BROWSER 자리에 스스로 붙는다 — 그만큼 되돌려 놓고 줄인다.
export const ThumbBrowser: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: "absolute",
      left: GRAPHIC_LEFT - BROWSER.x * BROWSER_SCALE,
      top: GRAPHIC_BOTTOM - (BROWSER.h + BROWSER.y) * BROWSER_SCALE,
      width: 1920,
      height: 1080,
      transform: `scale(${BROWSER_SCALE})`,
      transformOrigin: "top left",
    }}
  >
    {children}
  </div>
);

export const ThumbnailFrame: React.FC<{
  role: string;
  accent: string;
  children: React.ReactNode;
}> = ({ role, accent, children }) => (
  <AbsoluteFill style={{ background: colors.white, fontFamily: FONT }}>
    <BackgroundMesh accent={accent} />
    <Sequence from={-STILL_FRAME} layout="none">
      {children}
    </Sequence>
    <div style={{ position: "absolute", left: PAD_X, top: BLOCK_TOP }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, height: LABEL_ROW_H }}>
        <Img src={staticFile("posan.svg")} alt="" style={{ width: LOGO, height: LOGO }} />
        <div
          style={{
            background: colors.white,
            border: `2px solid ${colors.gray200}`,
            borderRadius: 999,
            padding: "9px 22px",
            fontSize: LABEL_FONT,
            fontWeight: 700,
            color: colors.gray500,
            whiteSpace: "nowrap",
          }}
        >
          포산고 자율학습 출석부
        </div>
      </div>
      <div
        style={{
          marginTop: GAP_LABEL_ROLE,
          fontSize: ROLE_FONT,
          lineHeight: 1,
          fontWeight: 800,
          color: colors.gray900,
          letterSpacing: -3,
          whiteSpace: "nowrap",
        }}
      >
        {role}
      </div>
      <div
        style={{
          marginTop: GAP_ROLE_SUB,
          fontSize: SUB_FONT,
          lineHeight: 1,
          fontWeight: 800,
          color: accent,
          letterSpacing: -2,
          whiteSpace: "nowrap",
        }}
      >
        사용 안내
      </div>
    </div>
  </AbsoluteFill>
);
