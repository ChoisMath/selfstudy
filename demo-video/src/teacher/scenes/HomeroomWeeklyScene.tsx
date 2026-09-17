import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { GuideScene } from "../../guide/GuideScene";
import { APP_HOST } from "../../app-mocks/data";
import { PcViewport, pcAbs, pcRectAbs, type Point, type Rect } from "../../app-mocks/layout";
import { colors } from "../../theme";
import { lineAt, lineEnd, lineStart } from "../timing";
import { HOMEROOM_BODY, HomeroomShellMock } from "../mocks/HomeroomShellMock";
import { HomeroomWeeklyMock, homeroomWeeklyRect } from "../mocks/HomeroomWeeklyMock";
import type { DemoProps } from "../../props";

const ID = "HomeroomWeekly";
const W = HOMEROOM_BODY.w;

// 표 아래 "총 12명"까지 보이도록 페이지를 내리는 양 — 주간표(약 555px)가 본문 높이(514px)보다 길다.
export const WEEKLY_PAGE_SCROLL = 66;
const PAGE_SCROLL = WEEKLY_PAGE_SCROLL;
const ARROW_W = 30;
const LEGEND_W = 346;

const scrollFrom = lineAt(ID, 4, 0.02);
const scrollTo = lineAt(ID, 4, 0.2);
const totalsFrom = lineAt(ID, 4, 0.22);

const triangleClick = lineAt(ID, 3, 0.12);
const remarkClick = lineAt(ID, 3, 0.55);

const bodyRect = (r: Rect, scroll = 0) =>
  pcRectAbs({ x: HOMEROOM_BODY.x + r.x, y: HOMEROOM_BODY.y + r.y - scroll, w: r.w, h: r.h });
const bodyPoint = (p: Point) => pcAbs({ x: HOMEROOM_BODY.x + p.x, y: HOMEROOM_BODY.y + p.y });

const PAD = 6;
const box = (r: { x: number; y: number; width: number; height: number }, pad = PAD) => ({
  x: r.x - pad,
  y: r.y - pad,
  width: r.width + pad * 2,
  height: r.height + pad * 2,
});

const cell = (studentNo: number, day: number, session: "afternoon1" | "afternoon2" | "night") =>
  homeroomWeeklyRect(`cell_${studentNo}_${day}_${session}`, W);

const union = (a: Rect, b: Rect): Rect => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  w: Math.max(a.x + a.w, b.x + b.w) - Math.min(a.x, b.x),
  h: Math.max(a.y + a.h, b.y + b.h) - Math.min(a.y, b.y),
});

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const scroll = tween(frame, [scrollFrom, scrollTo], [0, PAGE_SCROLL]);
  const tooltip =
    frame >= remarkClick
      ? { studentNo: 6, day: 2, session: "night" as const, from: remarkClick + 2 }
      : { studentNo: 5, day: 0, session: "afternoon1" as const, from: triangleClick + 2 };
  const tooltipOn = frame < lineEnd(ID, 3) + 6;
  return (
    <BrowserFrame url={`${APP_HOST}/homeroom`} tabTitle="포산고 자율학습">
      <PcViewport>
        <HomeroomShellMock tab="students" role="homeroom">
          <div style={{ position: "absolute", left: 0, top: -scroll }}>
            <HomeroomWeeklyMock
              width={W}
              height={HOMEROOM_BODY.h + PAGE_SCROLL}
              tooltip={tooltipOn ? tooltip : undefined}
              highlightRow={frame >= totalsFrom ? "totals" : undefined}
            />
          </div>
        </HomeroomShellMock>
      </PcViewport>
    </BrowserFrame>
  );
};

export const HomeroomWeeklyScene: React.FC<DemoProps> = () => {
  const table = homeroomWeeklyRect("table", W);
  const nav = homeroomWeeklyRect("weekNav", W);
  const legend = homeroomWeeklyRect("legend", W);
  const mondayHeader: Rect = { x: cell(1, 0, "afternoon1").x, y: table.y, w: cell(1, 0, "afternoon1").w * 3, h: cell(1, 0, "afternoon1").y - table.y };
  const prevArrow = bodyRect({ x: nav.x, y: nav.y, w: ARROW_W, h: nav.h });
  const nextArrow = bodyRect({ x: nav.x + nav.w - ARROW_W, y: nav.y, w: ARROW_W, h: nav.h });

  const present = bodyRect(cell(1, 0, "afternoon1"));
  const absent = bodyRect(cell(12, 1, "night"));
  const reasoned = bodyRect(cell(5, 0, "afternoon1"));
  const afterSchool = bodyRect(union(cell(8, 3, "afternoon1"), cell(8, 3, "afternoon2")));
  const inactive = bodyRect(union(cell(3, 3, "afternoon1"), cell(3, 3, "night")));
  const remark = bodyRect(cell(6, 2, "night"));
  const totals = bodyRect(homeroomWeeklyRect("totals", W), PAGE_SCROLL);

  const nextArrowPoint = bodyPoint({ x: nav.x + nav.w - ARROW_W / 2, y: nav.y + nav.h / 2 });
  const trianglePoint = { x: reasoned.x + reasoned.width / 2, y: reasoned.y + reasoned.height / 2 };
  // 비고 * 는 칸 오른쪽 위 모서리에 있어, 커서는 칸 아래쪽을 눌러 별표를 가리지 않는다.
  const remarkPoint = { x: remark.x + remark.width / 2, y: remark.y + remark.height - 6 };

  const cells: { r: ReturnType<typeof bodyRect>; label: string; from: number; to: number }[] = [
    { r: present, label: "출석", from: lineAt(ID, 2, 0), to: lineAt(ID, 2, 0.13) },
    { r: absent, label: "무단결석", from: lineAt(ID, 2, 0.12), to: lineAt(ID, 2, 0.29) },
    { r: reasoned, label: "사유결석", from: lineAt(ID, 2, 0.28), to: lineAt(ID, 2, 0.47) },
    { r: afterSchool, label: "방과후", from: lineAt(ID, 2, 0.46), to: lineAt(ID, 2, 0.61) },
    { r: inactive, label: "참여하지 않는 시간", from: lineAt(ID, 2, 0.6), to: lineEnd(ID, 2) },
  ];

  return (
    <GuideScene id={ID} step={14} label="주간 출결">
      <Stage />

      <Annotation
        from={lineAt(ID, 0, 0.3)}
        durationInFrames={lineEnd(ID, 0) - lineAt(ID, 0, 0.3)}
        {...box(bodyRect({ ...table, h: HOMEROOM_BODY.h - table.y - 10 }))}
        label="이번 주 우리 반 출결"
        labelPosition="right"
        color={colors.blue600}
      />

      <Annotation
        from={lineAt(ID, 1, 0.05)}
        durationInFrames={lineAt(ID, 1, 0.5) - lineAt(ID, 1, 0.05)}
        {...box(bodyRect(mondayHeader), 4)}
        label="오후1 · 오후2 · 야간"
        labelPosition="top"
        color={colors.blue600}
      />
      <Annotation
        from={lineAt(ID, 1, 0.52)}
        durationInFrames={lineEnd(ID, 1) - lineAt(ID, 1, 0.52)}
        {...box(prevArrow)}
        label="지난주"
        labelPosition="right"
      />
      <Annotation
        from={lineAt(ID, 1, 0.6)}
        durationInFrames={lineEnd(ID, 1) - lineAt(ID, 1, 0.6)}
        {...box(nextArrow)}
        label="다음 주"
        labelPosition="left"
      />

      <Annotation
        from={lineStart(ID, 2)}
        durationInFrames={lineEnd(ID, 2) - lineStart(ID, 2)}
        {...box(bodyRect({ ...legend, w: LEGEND_W }), 4)}
        label="범례"
        labelPosition="right"
        color={colors.blue600}
      />
      {cells.map((c) => (
        <Annotation
          key={c.label}
          from={c.from}
          durationInFrames={c.to - c.from}
          {...box(c.r, 4)}
          label={c.label}
          labelPosition="right"
        />
      ))}

      <Annotation
        from={triangleClick + 4}
        durationInFrames={remarkClick - 6 - triangleClick}
        {...box(reasoned, 4)}
        label="누르면 사유 표시"
        labelPosition="right"
      />
      <Annotation
        from={remarkClick + 4}
        durationInFrames={lineEnd(ID, 3) - remarkClick - 4}
        {...box(remark, 9)}
        label="감독 선생님이 남긴 비고"
        labelPosition="right"
      />

      <Annotation
        from={totalsFrom + 4}
        durationInFrames={lineEnd(ID, 4) + 10 - totalsFrom}
        {...box(totals, 4)}
        label="출석 / 결석 / 참여 인원"
        labelPosition="right"
        color={colors.green600}
      />

      <Cursor
        path={[
          { frame: lineAt(ID, 1, 0.5), x: 1500, y: 640 },
          { frame: lineAt(ID, 1, 0.66), x: nextArrowPoint.x, y: nextArrowPoint.y + 4 },
        ]}
        hideAfter={lineEnd(ID, 1)}
      />
      <Cursor
        path={[
          { frame: lineStart(ID, 3), x: 900, y: 700 },
          { frame: triangleClick - 6, x: trianglePoint.x, y: trianglePoint.y },
          { frame: remarkClick - 16, x: trianglePoint.x, y: trianglePoint.y },
          { frame: remarkClick - 4, x: remarkPoint.x, y: remarkPoint.y },
        ]}
        clicks={[triangleClick, remarkClick]}
        hideAfter={lineEnd(ID, 3)}
      />
    </GuideScene>
  );
};
