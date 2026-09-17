import React from "react";
import { useCurrentFrame } from "remotion";
import { easeInOut, tween } from "../../anim";
import { textWidth } from "../../app-mocks/AttendanceHeaderMock";
import { APP_HOST, type Student } from "../../app-mocks/data";
import { PHONE_BODY, PcViewport, pcRectAbs, type Point, type Rect } from "../../app-mocks/layout";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { PHONE, PhoneFrame } from "../../components/PhoneFrame";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";
import { BatchAbsenceMock } from "../../student/mocks/BatchAbsenceMock";
import { STUDENT_BODY, StudentShellMock, studentShellPoint } from "../../student/mocks/StudentShellMock";
import { InsetCard, insetCardSize, padRect, type InsetCrop } from "../../teacher/scenes/pc-helpers";
import { colors } from "../../theme";
import { GRADE, NEW_STUDENT, NEW_STUDENT_CODE, STUDENT_ROWS, type StudentRow } from "../data";
import { GRADE_ADMIN_BODY, GradeAdminShellMock } from "../mocks/GradeAdminShellMock";
import { StudentTableMock, studentTableRect } from "../mocks/StudentTableMock";
import { lineAt, lineEnd, lineStart, sceneFrames } from "../timing";

const ID = "Helper";
const TAB_TITLE = "포산고 자율학습";
const W = GRADE_ADMIN_BODY.w;

// 1-3 7번 하준서 — 학생 편 ME_STUDENT 와 같은 인물. data.ts 는 이 id 를 내보내지 않아 여기서 다시 적는다.
const HELPER_ID = 307;
const HELPER_CLASS = 3;

// StudentAdd 가 추가한 정다온(2반 13번)은 이후 장면의 표에도 남는다.
const ADDED_STUDENT: Student = {
  id: NEW_STUDENT.classNumber * 100 + NEW_STUDENT.number,
  grade: GRADE,
  classNumber: NEW_STUDENT.classNumber,
  number: NEW_STUDENT.number,
  name: NEW_STUDENT.name,
};

const sortRows = (rows: StudentRow[]) =>
  [...rows].sort((a, b) => a.student.classNumber - b.student.classNumber || a.student.number - b.student.number);

const withHelper = (rows: StudentRow[], on: boolean): StudentRow[] =>
  rows.map((row) => (row.student.id === HELPER_ID ? { ...row, isHelper: on } : row));

const ALL_ROWS = sortRows([
  ...STUDENT_ROWS,
  { student: ADDED_STUDENT, code: NEW_STUDENT_CODE, status: "active" as const, isHelper: false },
]);

// STUDENT_ROWS 는 하준서를 이미 도우미로 들고 있다 — 이 장면이 버튼을 눌러 그 상태를 만든다.
const ALL_ROWS_BEFORE = withHelper(ALL_ROWS, false);
const CLASS_ROWS_BEFORE = ALL_ROWS_BEFORE.filter((row) => row.student.classNumber === HELPER_CLASS);
const CLASS_ROWS_AFTER = withHelper(CLASS_ROWS_BEFORE, true);

// 다음 장면(Participation)이 탭을 옮기기 전 화면으로 쓴다.
export const HELPER_END_ROWS = CLASS_ROWS_AFTER;
export const HELPER_END_CLASS = HELPER_CLASS;

const filterClick = lineAt(ID, 0, 0.62);
const scrollFrom = lineAt(ID, 1, 0.02);
const scrollTo = scrollFrom + 26;
const helperClick = lineAt(ID, 1, 0.44);
const cursorHide = helperClick + 12;
const zoomFrom = helperClick + 8;
const zoomOut = lineEnd(ID, 1) + 4;
const phoneFrom = lineAt(ID, 2, 0.05);
const tabBoxFrom = lineAt(ID, 2, 0.2);
const END = sceneFrames(ID);

// 하준서 행(3반 7번째)이 본문 가운데에 오도록 내린다.
const HELPER_ROW_Y = studentTableRect(`helper_${HELPER_ID}`, CLASS_ROWS_AFTER, W).y;
const ROW_SCROLL = HELPER_ROW_Y - 200;

export const HELPER_END_SCROLL = ROW_SCROLL;

const rowsAt = (frame: number): StudentRow[] => {
  if (frame < filterClick) return ALL_ROWS_BEFORE;
  return frame < helperClick ? CLASS_ROWS_BEFORE : CLASS_ROWS_AFTER;
};

const bodyRect = (r: Rect, scrollY: number): Rect => ({
  ...r,
  x: r.x + GRADE_ADMIN_BODY.x,
  y: r.y + GRADE_ADMIN_BODY.y - scrollY,
});

const scrollAt = (frame: number) => tween(frame, [scrollFrom, scrollTo], [0, ROW_SCROLL], easeInOut);

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <BrowserFrame url={`${APP_HOST}/grade-admin/${GRADE}`} tabTitle={TAB_TITLE}>
      <PcViewport>
        <GradeAdminShellMock tab="students" showHelp scrollY={scrollAt(frame)}>
          <StudentTableMock
            width={W}
            rows={rowsAt(frame)}
            classFilter={frame >= filterClick ? HELPER_CLASS : undefined}
            helperPressAt={{ studentId: HELPER_ID, at: helperClick }}
          />
        </GradeAdminShellMock>
      </PcViewport>
    </BrowserFrame>
  );
};

// 배지 글자가 11px 이라 1.25배로도 작다 — 학번·상태·도우미 칸만 잘라 키운다.
const ZOOM_SCALE = 1.9;
// 표 열 폭 비율(StudentTableMock BASE_W)에서 학번 열의 왼쪽 끝 — 목업이 좌표를 내보내지 않아 되계산한다.
const CODE_COLUMN_LEFT = ((96 + 60 + 56 + 64) / 704) * (W - 32) + 16;
const zoomCrop = (): InsetCrop => {
  const helper = studentTableRect(`helper_${HELPER_ID}`, CLASS_ROWS_AFTER, W);
  return {
    rect: bodyRect(
      { x: CODE_COLUMN_LEFT, y: helper.y - 5, w: helper.x + helper.w - CODE_COLUMN_LEFT, h: helper.h + 10 },
      ROW_SCROLL,
    ),
    scale: ZOOM_SCALE,
  };
};

const ZOOM_CROP = zoomCrop();
const ZOOM_SIZE = insetCardSize(ZOOM_CROP);
const ZOOM_CARD = { x: 1740 - ZOOM_SIZE.width - 24, y: 300 };

// 폰 인셋 — PhoneFrame 의 베젤(12px)은 export 가 없어 같은 값을 여기서 다시 적는다.
const PHONE_BEZEL = 12;
const PHONE_SCALE = 0.62;
// 탭 라벨이 폰 위 빈 띠(학년관리 탭 줄 오른쪽)에 들어가도록 폰을 아래로 내린다.
const PHONE_INSET = { x: 1452, y: 300 };
const PHONE_LABEL_GAP = 112;

const phoneBodyAbs = (p: Point): Point => ({
  x: PHONE_INSET.x + (PHONE_BEZEL + p.x) * PHONE_SCALE,
  y: PHONE_INSET.y + (PHONE_BEZEL + PHONE.statusH + PHONE.urlH + p.y) * PHONE_SCALE,
});

const phoneBodyRectAbs = (r: Rect) => ({
  ...phoneBodyAbs(r),
  width: r.w * PHONE_SCALE,
  height: r.h * PHONE_SCALE,
});

// StudentShellMock 은 탭 중심만 내보낸다 — 보이는 상자는 셸의 tabLayout 과 같은 식으로 만든다.
const TAB_H = 44;
const TAB_PAD_X = 16;
const batchTab: Rect = ((center: Point) => {
  const w = TAB_PAD_X * 2 + textWidth("일괄신청", 14, 500);
  return { x: center.x - w / 2, y: center.y - TAB_H / 2, w, h: TAB_H };
})(studentShellPoint("tab_batch"));

const PhoneInset: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < phoneFrom) return null;
  const enter = tween(frame, [phoneFrom, phoneFrom + 12], [0, 1]);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: enter, translate: `0px ${(1 - enter) * 18}px` }}>
      <PhoneFrame x={PHONE_INSET.x} y={PHONE_INSET.y} scale={PHONE_SCALE} url={`${APP_HOST}/student/batch-absence`}>
        <StudentShellMock width={PHONE_BODY.w} height={PHONE_BODY.h} tab="batch" showBatchTab showHelp>
          <BatchAbsenceMock
            width={PHONE_BODY.w}
            height={STUDENT_BODY.h}
            checked={[]}
            sessionPicks={{}}
            reason="academy"
          />
        </StudentShellMock>
      </PhoneFrame>
    </div>
  );
};

export const HelperScene: React.FC<DemoProps> = () => {
  const helperHeader = pcRectAbs(bodyRect({ ...studentTableRect(`helper_${HELPER_ID}`, ALL_ROWS_BEFORE, W), y: 44 + 16, h: 380 }, 0));
  const filter = pcRectAbs(bodyRect(studentTableRect("classFilter", ALL_ROWS_BEFORE, W), 0));
  const helperCell = pcRectAbs(bodyRect(studentTableRect(`helper_${HELPER_ID}`, CLASS_ROWS_AFTER, W), ROW_SCROLL));
  const helperName = pcRectAbs(bodyRect(studentTableRect(`name_${HELPER_ID}`, CLASS_ROWS_AFTER, W), ROW_SCROLL));

  const filterCenter = { x: filter.x + filter.width / 2, y: filter.y + filter.height / 2 };
  const helperCenter = { x: helperCell.x + helperCell.width / 2, y: helperCell.y + helperCell.height / 2 };
  const tabBox = phoneBodyRectAbs(batchTab);

  return (
    <GuideScene id={ID} step={6} label="도우미">
      <Stage />

      <Annotation
        from={lineAt(ID, 0, 0.1)}
        durationInFrames={filterClick + 10 - lineAt(ID, 0, 0.1)}
        {...padRect(helperHeader, 5)}
        label="도우미 칸"
        labelPosition="top"
        labelAlign="end"
        color={colors.purple600}
      />

      <Annotation
        from={helperClick + 5}
        durationInFrames={END - helperClick - 5}
        {...padRect(helperCell, 3)}
        label="보라색 = 학급 도우미"
        labelPosition="left"
        color={colors.purple600}
      />
      <Annotation
        from={zoomFrom + 4}
        durationInFrames={zoomOut - zoomFrom - 4}
        {...padRect(helperName, 3)}
        label={`${GRADE}-${HELPER_CLASS} 7번 하준서`}
        labelPosition="bottom"
        color={colors.blue600}
      />

      <InsetCard card={ZOOM_CARD} crop={ZOOM_CROP} title="도우미 배지 확대" from={zoomFrom} out={zoomOut}>
        <GradeAdminShellMock tab="students" showHelp scrollY={ROW_SCROLL}>
          <StudentTableMock width={W} rows={CLASS_ROWS_AFTER} classFilter={HELPER_CLASS} />
        </GradeAdminShellMock>
      </InsetCard>

      <PhoneInset />
      <Annotation
        from={tabBoxFrom}
        durationInFrames={END - tabBoxFrom}
        {...padRect(tabBox, 4)}
        label="일괄신청 탭"
        labelPosition="top"
        labelGap={PHONE_LABEL_GAP}
        labelAlign="end"
        color={colors.blue600}
      />

      <Cursor
        path={[
          { frame: lineStart(ID, 0) + 4, x: 980, y: 720 },
          { frame: filterClick - 10, x: filterCenter.x, y: filterCenter.y },
          { frame: filterClick + 12, x: filterCenter.x, y: filterCenter.y },
          { frame: helperClick - 10, x: helperCenter.x, y: helperCenter.y },
          { frame: cursorHide, x: helperCenter.x, y: helperCenter.y },
        ]}
        clicks={[filterClick, helperClick]}
        hideAfter={cursorHide}
      />
    </GuideScene>
  );
};
