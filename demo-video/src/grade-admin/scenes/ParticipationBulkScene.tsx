import React from "react";
import { useCurrentFrame } from "remotion";
import { easeInOut, tween } from "../../anim";
import { APP_HOST, type Session } from "../../app-mocks/data";
import { PC_VIEWPORT, PcViewport, pcAbs, pcRectAbs, type Rect } from "../../app-mocks/layout";
import { ParticipationTableMock, participationRect } from "../../app-mocks/ParticipationTableMock";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";
import { NativeDialogMock, nativeDialogPoint } from "../../teacher/mocks/NativeDialogMock";
import { InsetCard, insetCardSize, padRect, type InsetCrop } from "../../teacher/scenes/pc-helpers";
import { colors } from "../../theme";
import { GRADE } from "../data";
import { GRADE_ADMIN_BODY, GradeAdminShellMock } from "../mocks/GradeAdminShellMock";
import { lineAt, lineEnd, lineStart, sceneFrames } from "../timing";
import { PARTICIPATION_END_ROWS } from "./ParticipationScene";

const ID = "ParticipationBulk";
const TAB_TITLE = "포산고 자율학습";
const W = GRADE_ADMIN_BODY.w;

const FILTER_CLASS = 1;
const BULK_SESSION: Session = "night";
const CLASS_ROWS = PARTICIPATION_END_ROWS.filter((row) => row.student.classNumber === FILTER_CLASS);

// ParticipationManagement.tsx 80행 handleBulkToggle 의 confirm 문구 그대로.
const CONFIRM_MESSAGE = `${FILTER_CLASS}반 학생 ${CLASS_ROWS.length}명의 야간자습 참가를 ${
  CLASS_ROWS.every((r) => r.sessions[BULK_SESSION].participating) ? "해제" : "설정"
}하시겠습니까?`;

// ParticipationTableMock 내부 상수 — 좌표 함수가 합계 아래 캡션 높이를 내보내지 않아 되계산한다.
const FOOTER_BOX_H = 44;

const TOTALS = participationRect("totals", "grade", W, CLASS_ROWS);
const BOTTOM_SCROLL = TOTALS.y + TOTALS.h + FOOTER_BOX_H - GRADE_ADMIN_BODY.h;

const filterClick = lineAt(ID, 0, 0.4);
const bulkClick = lineAt(ID, 1, 0.18);
const dialogOpen = bulkClick + 3;
const confirmClick = lineAt(ID, 1, 0.5);
const dialogClose = confirmClick + 5;
const scrollFrom = dialogClose + 2;
const scrollTo = scrollFrom + 30;
// 일괄 저장 결과는 표가 맨 아래로 내려간 뒤 반영한다 — 헤더 체크박스와 바뀌는 행이 한 화면에
// 같이 들어가지 않아, 스크롤이 멈춘 뒤 바뀌어야 무엇이 달라졌는지 보인다.
const applyAt = scrollTo + 4;
const END = sceneFrames(ID);

const zoomFrom = lineAt(ID, 2, 0.3);
const zoomOut = lineEnd(ID, 2) + 2;

const scrollAt = (frame: number) => tween(frame, [scrollFrom, scrollTo], [0, BOTTOM_SCROLL], easeInOut);

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const filtered = frame >= filterClick;
  const dialogUp = frame >= dialogOpen && frame < dialogClose;
  return (
    <BrowserFrame url={`${APP_HOST}/grade-admin/${GRADE}`} tabTitle={TAB_TITLE}>
      <PcViewport>
        <GradeAdminShellMock tab="participation" showHelp scrollY={scrollAt(frame)}>
          <ParticipationTableMock
            variant="grade"
            width={W}
            rows={filtered ? CLASS_ROWS : PARTICIPATION_END_ROWS}
            classFilter={filtered ? FILTER_CLASS : undefined}
            bulkToggle={{ session: BULK_SESSION, at: applyAt }}
            savingFrom={applyAt + 2}
          />
        </GradeAdminShellMock>
        {dialogUp ? (
          <NativeDialogMock
            width={PC_VIEWPORT.w}
            height={PC_VIEWPORT.h}
            kind="confirm"
            message={CONFIRM_MESSAGE}
            openAt={dialogOpen}
            okPressAt={confirmClick}
          />
        ) : null}
      </PcViewport>
    </BrowserFrame>
  );
};

const bodyRect = (r: Rect, scrollY = 0): Rect => ({
  ...r,
  x: r.x + GRADE_ADMIN_BODY.x,
  y: r.y + GRADE_ADMIN_BODY.y - scrollY,
});

const CLASS_FILTER = participationRect("classFilter", "grade", W, CLASS_ROWS);
const BULK_BOX = participationRect(`bulkToggle_${BULK_SESSION}`, "grade", W, CLASS_ROWS);
// 야간 참가 열 — 맨 아래로 내린 화면에서 보이는 행부터 합계 줄까지 한 상자로 묶는다.
const NIGHT_COLUMN: Rect = {
  x: BULK_BOX.x,
  y: BOTTOM_SCROLL + 14,
  w: BULK_BOX.w,
  h: TOTALS.y + TOTALS.h - (BOTTOM_SCROLL + 14),
};

// 합계 줄은 11px 글자라 확대 카드로 읽힌다 — 이름(합계) 칸부터 오후1 여섯 칸까지 자른다.
const ZOOM_SCALE = 1.7;
const ZOOM_CROP: InsetCrop = {
  rect: bodyRect(
    {
      x: TOTALS.x,
      y: TOTALS.y - 3,
      w: participationRect(`control_101_afternoon2_participating`, "grade", W, CLASS_ROWS).x - TOTALS.x,
      h: TOTALS.h + 6,
    },
    BOTTOM_SCROLL,
  ),
  scale: ZOOM_SCALE,
};
const ZOOM_SIZE = insetCardSize(ZOOM_CROP);
const ZOOM_CARD = { x: 1740 - ZOOM_SIZE.width - 24, y: 470 };

export const ParticipationBulkScene: React.FC<DemoProps> = () => {
  const filter = pcRectAbs(bodyRect(CLASS_FILTER));
  const bulk = pcRectAbs(bodyRect(BULK_BOX));
  const nightColumn = pcRectAbs(bodyRect(NIGHT_COLUMN, BOTTOM_SCROLL));
  const totals = pcRectAbs(bodyRect(TOTALS, BOTTOM_SCROLL));

  const filterCenter = { x: filter.x + filter.width / 2, y: filter.y + filter.height / 2 };
  const bulkCenter = { x: bulk.x + bulk.width / 2, y: bulk.y + bulk.height / 2 };
  const okPoint = pcAbs(nativeDialogPoint("ok", PC_VIEWPORT.w, PC_VIEWPORT.h, "confirm", CONFIRM_MESSAGE));

  return (
    <GuideScene id={ID} step={8} label="일괄 설정">
      <Stage />

      <Annotation
        from={lineStart(ID, 0) + 2}
        durationInFrames={filterClick + 20 - lineStart(ID, 0) - 2}
        {...padRect(filter, 5)}
        label="반 선택 = 한 반만 보기"
        labelPosition="right"
        color={colors.indigo600}
      />

      <Annotation
        from={lineStart(ID, 1) + 2}
        durationInFrames={dialogOpen + 8 - lineStart(ID, 1) - 2}
        {...padRect(bulk, 5)}
        label="시간 이름 아래 체크박스"
        labelPosition="top"
        labelGap={46}
        labelAlign="end"
        color={colors.blue600}
      />
      <Annotation
        from={applyAt + 6}
        durationInFrames={lineEnd(ID, 1) + 6 - applyAt - 6}
        {...padRect(nightColumn, 4)}
        label={`보이는 ${CLASS_ROWS.length}명 전부 참가`}
        labelPosition="left"
        color={colors.green600}
      />

      <Annotation
        from={lineStart(ID, 2) + 2}
        durationInFrames={END - lineStart(ID, 2) - 2}
        {...padRect(totals, 4)}
        label="합계 줄 — 시간별 · 요일별 인원"
        labelPosition="bottom"
        labelAlign="end"
        color={colors.blue600}
      />
      <InsetCard card={ZOOM_CARD} crop={ZOOM_CROP} title="합계 확대 · 시간별 · 요일별" from={zoomFrom} out={zoomOut}>
        <GradeAdminShellMock tab="participation" showHelp scrollY={BOTTOM_SCROLL}>
          <ParticipationTableMock
            variant="grade"
            width={W}
            rows={CLASS_ROWS}
            classFilter={FILTER_CLASS}
            bulkToggle={{ session: BULK_SESSION, at: applyAt }}
          />
        </GradeAdminShellMock>
      </InsetCard>

      <Cursor
        path={[
          { frame: lineStart(ID, 0) + 2, x: 700, y: 700 },
          { frame: filterClick - 10, x: filterCenter.x, y: filterCenter.y },
          { frame: filterClick + 12, x: filterCenter.x, y: filterCenter.y },
          { frame: bulkClick - 10, x: bulkCenter.x, y: bulkCenter.y },
          { frame: bulkClick + 10, x: bulkCenter.x, y: bulkCenter.y },
          { frame: confirmClick - 10, x: okPoint.x, y: okPoint.y },
          { frame: dialogClose, x: okPoint.x, y: okPoint.y },
        ]}
        clicks={[filterClick, bulkClick, confirmClick]}
        hideAfter={dialogClose}
      />
    </GuideScene>
  );
};
