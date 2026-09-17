// school_cowork demo-video/src/guide/mocks/ModalShell.tsx 53-102행 이식. 색만 tw 로 교체.
import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../anim";
import { tw } from "./tw";

export const pressScale = (frame: number, pressAt?: number | null) => {
  if (pressAt === undefined || pressAt === null) {
    return 1;
  }
  return (
    1 -
    0.08 * tween(frame, [pressAt, pressAt + 4], [0, 1]) * tween(frame, [pressAt + 4, pressAt + 12], [1, 0])
  );
};

export const typedSlice = (text: string, frame: number, from: number | undefined) => {
  if (from === undefined) {
    return text;
  }
  return text.slice(0, Math.max(0, Math.floor((frame - from) / 2)));
};

export const Caret: React.FC<{ height?: number }> = ({ height = 18 }) => (
  <span
    style={{
      display: "inline-block",
      width: 0,
      borderLeft: `2px solid ${tw.gray[800]}`,
      marginLeft: 1,
      height,
      verticalAlign: "middle",
    }}
  />
);

// 타이핑 중에는 캐럿이 깜빡이고, 다 치면 사라진다.
export const TypedText: React.FC<{ text: string; from?: number; placeholder?: string }> = ({
  text,
  from,
  placeholder,
}) => {
  const frame = useCurrentFrame();
  const shown = typedSlice(text, frame, from);
  const typing = from !== undefined && frame >= from && shown.length < text.length;
  const caretOn = typing && Math.floor(frame / 8) % 2 === 0;
  if (shown.length === 0 && !typing) {
    return <span style={{ color: tw.gray[400], whiteSpace: "nowrap" }}>{placeholder ?? ""}</span>;
  }
  return (
    <span style={{ whiteSpace: "nowrap" }}>
      {shown}
      {caretOn ? <Caret /> : null}
    </span>
  );
};
