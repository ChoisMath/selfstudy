import React from "react";
import { useCurrentFrame } from "remotion";
import { easeInOut, tween } from "../../anim";
import { APP_HOST } from "../../app-mocks/data";
import { PcViewport, pcRectAbs, type Rect } from "../../app-mocks/layout";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";
import { colors } from "../../theme";
import { InsetCard, padRect, type InsetCrop } from "../../teacher/scenes/pc-helpers";
import { GRADE_ADMIN_BODY, GradeAdminShellMock } from "../mocks/GradeAdminShellMock";
import { TodayDashboardMock, todayRect, type TodayRectKey } from "../mocks/TodayDashboardMock";
import { lineAt, lineEnd, lineStart } from "../timing";

const ID = "Today";
const TAB_TITLE = "포산고 자율학습";
const W = GRADE_ADMIN_BODY.w;

// TodayDashboardMock 은 카드 3장이라 본문(448)보다 높다 — 야간 카드는 셸 scrollY 로만 드러난다.
const CONTENT_H = todayRect("night", W).y + todayRect("night", W).h;
const MAX_SCROLL = CONTENT_H - GRADE_ADMIN_BODY.h;

const afternoon1From = lineStart(ID, 1);
const afternoon2From = lineAt(ID, 1, 0.09);
const scrollFrom = lineAt(ID, 1, 0.17);
const scrollTo = scrollFrom + 24;
const nightFrom = scrollTo + 2;
const supervisorFrom = lineAt(ID, 1, 0.33);
const statsFrom = lineAt(ID, 1, 0.45);
const zoomFrom = supervisorFrom + 4;
// 확대 카드는 감독 배지를 읽을 만큼만 띄우고 숫자 타일 설명이 시작되면 물린다 — 위 카드의 타일을 오래 덮지 않게.
const zoomOut = lineAt(ID, 1, 0.45) + 30;
const totalFrom = lineAt(ID, 2, 0.06);

// 본문 좌표(스크롤 반영) → 뷰포트 좌표
const bodyRect = (r: Rect, scrollY: number): Rect => ({
  ...r,
  x: r.x + GRADE_ADMIN_BODY.x,
  y: r.y + GRADE_ADMIN_BODY.y - scrollY,
});

// 본문 밖으로 나간 부분은 셸이 잘라 낸다 — 상자도 같이 잘라야 브라우저 아래로 삐져나오지 않는다.
const clipToBody = (r: Rect): Rect => {
  const bottom = Math.min(r.y + r.h, GRADE_ADMIN_BODY.y + GRADE_ADMIN_BODY.h - 2);
  return { ...r, h: Math.max(0, bottom - r.y) };
};

const cardRect = (key: TodayRectKey, scrollY: number) => clipToBody(bodyRect(todayRect(key, W), scrollY));

// 감독 배지는 12px 이라 1.25배로 키워도 작다 — 야간 카드 위쪽 빈 자리에 확대 카드를 둔다.
const BADGE = todayRect("night_supervisor", W);
const BADGE_CROP: InsetCrop = {
  rect: { x: BADGE.x - 10, y: BADGE.y + GRADE_ADMIN_BODY.y - MAX_SCROLL - 10, w: BADGE.w + 20, h: BADGE.h + 20 },
  scale: 3,
};
const BADGE_CARD = { x: 1278, y: 330 };

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const scrollY = tween(frame, [scrollFrom, scrollTo], [0, MAX_SCROLL], easeInOut);
  return (
    <BrowserFrame url={`${APP_HOST}/grade-admin/1`} tabTitle={TAB_TITLE}>
      <PcViewport>
        <GradeAdminShellMock tab="today" showHelp scrollY={scrollY}>
          <TodayDashboardMock width={W} />
        </GradeAdminShellMock>
      </PcViewport>
    </BrowserFrame>
  );
};

export const TodayScene: React.FC<DemoProps> = () => {
  const dashboard = pcRectAbs({ x: 16, y: GRADE_ADMIN_BODY.y, w: W - 32, h: GRADE_ADMIN_BODY.h - 2 });
  const afternoon1 = pcRectAbs(cardRect("afternoon1", 0));
  const afternoon2 = pcRectAbs(cardRect("afternoon2", 0));
  const night = pcRectAbs(cardRect("night", MAX_SCROLL));
  const badge = pcRectAbs(cardRect("night_supervisor", MAX_SCROLL));
  const first = cardRect("night_present", MAX_SCROLL);
  const last = cardRect("night_afterSchool", MAX_SCROLL);
  const stats = pcRectAbs({ x: first.x, y: first.y, w: last.x + last.w - first.x, h: first.h });
  const totalLine = cardRect("night_total", MAX_SCROLL);
  // 합계 줄은 카드 폭 전체지만 글자는 오른쪽 끝에 붙는다 — 글자 부분만 감싸고 라벨은 빈 왼쪽으로 뺀다.
  const total = pcRectAbs({ ...totalLine, x: totalLine.x + totalLine.w - 180, w: 180 });

  return (
    <GuideScene id={ID} step={2} label="오늘출결">
      <Stage />

      <Annotation
        from={lineAt(ID, 0, 0.12)}
        durationInFrames={lineEnd(ID, 0) + 6 - lineAt(ID, 0, 0.12)}
        {...padRect(dashboard, 4)}
        label="학년 전체 오늘 출결"
        labelPosition="top"
        labelAlign="end"
        color={colors.blue600}
      />

      <Annotation
        from={afternoon1From}
        durationInFrames={afternoon2From + 6 - afternoon1From}
        {...padRect(afternoon1, 3)}
        color={colors.blue600}
      />
      <Annotation
        from={afternoon2From}
        durationInFrames={scrollFrom + 2 - afternoon2From}
        {...padRect(afternoon2, 3)}
        color={colors.blue600}
      />
      <Annotation
        from={nightFrom}
        durationInFrames={supervisorFrom + 6 - nightFrom}
        {...padRect(night, 3)}
        label="야간 자습"
        labelPosition="top"
        color={colors.blue600}
      />

      <Annotation
        from={supervisorFrom}
        durationInFrames={lineEnd(ID, 1) + 4 - supervisorFrom}
        {...padRect(badge, 5)}
        label="감독교사"
        labelPosition="left"
        color={colors.indigo600}
      />
      <Annotation
        from={statsFrom}
        durationInFrames={lineEnd(ID, 1) + 4 - statsFrom}
        {...padRect(stats, 5)}
        label="출석 · 결석 · 사유결석 · 방과후"
        // 아래에 두면 라벨 밑동이 스틸 크롭선(브라우저 아래 끝)에 1px 까지 붙는다 — 카드 머리줄로 올린다.
        labelPosition="top"
        color={colors.blue600}
      />

      <InsetCard card={BADGE_CARD} crop={BADGE_CROP} title="감독교사 확대" from={zoomFrom} out={zoomOut}>
        <GradeAdminShellMock tab="today" showHelp scrollY={MAX_SCROLL}>
          <TodayDashboardMock width={W} />
        </GradeAdminShellMock>
      </InsetCard>

      <Annotation
        from={totalFrom}
        durationInFrames={lineEnd(ID, 2) + 10 - totalFrom}
        {...padRect(total, 6)}
        label="그 시간 자습대상 전체 인원"
        labelPosition="left"
        color={colors.red600}
      />
    </GuideScene>
  );
};
