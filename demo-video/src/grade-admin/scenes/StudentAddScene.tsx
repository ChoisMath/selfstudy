import React from "react";
import { useCurrentFrame } from "remotion";
import { easeInOut, tween } from "../../anim";
import { APP_HOST } from "../../app-mocks/data";
import { PC_VIEWPORT, PcViewport, pcAbs, pcRectAbs, type Rect } from "../../app-mocks/layout";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";
import { colors } from "../../theme";
import { InsetCard, padRect, type InsetCrop } from "../../teacher/scenes/pc-helpers";
import { GRADE, NEW_STUDENT, NEW_STUDENT_CODE, STUDENT_ROWS, type StudentRow } from "../data";
import { GRADE_ADMIN_BODY, GradeAdminShellMock } from "../mocks/GradeAdminShellMock";
import { StudentModalMock, studentModalPoint, studentModalRect } from "../mocks/StudentModalMock";
import { StudentTableMock, studentTableRect } from "../mocks/StudentTableMock";
import { lineAt, lineEnd, lineStart } from "../timing";

const ID = "StudentAdd";
const TAB_TITLE = "포산고 자율학습";
const W = GRADE_ADMIN_BODY.w;

// 학생 id 는 app-mocks/data.ts 관례대로 반*100 + 번호 — 2반 13번은 아직 비어 있다.
const NEW_ROW: StudentRow = {
  student: {
    id: NEW_STUDENT.classNumber * 100 + NEW_STUDENT.number,
    grade: GRADE,
    classNumber: NEW_STUDENT.classNumber,
    number: NEW_STUDENT.number,
    name: NEW_STUDENT.name,
  },
  code: NEW_STUDENT_CODE,
  status: "active",
  isHelper: false,
};

// 앱 API 와 같은 정렬(반 → 번호). 뒤 장면(StudentExcel)이 이 명단을 그대로 이어받는다.
export const STUDENT_ROWS_AFTER_ADD: StudentRow[] = [...STUDENT_ROWS, NEW_ROW].sort(
  (a, b) => a.student.classNumber - b.student.classNumber || a.student.number - b.student.number,
);

const addClick = lineAt(ID, 0, 0.62);
const modalOpenAt = addClick + 6;

const classClick = lineAt(ID, 1, 0.05);
const classType = classClick + 4;
const numberClick = classType + 12;
const numberType = numberClick + 4;
const nameClick = numberType + 12;
const nameType = nameClick + 4;
// 클릭 물결은 그 프레임의 커서 자리에 찍힌다 — 누르는 동안 커서가 멈춰 있어야 칸 가운데에 온다.
const CLICK_HOLD = 5;
const typeCursorHide = nameType + 16;
const previewFrom = nameType + 20;
const previewOut = lineEnd(ID, 1) + 8;

const submitCursorFrom = lineStart(ID, 2) - 5;
const submitClick = lineAt(ID, 2, 0.1);
const submittingFrom = submitClick + 2;
const modalCloseAt = submitClick + 16;
const MODAL_FADE_OUT = 6;
const rowsSwapAt = modalCloseAt + 2;
const scrollFrom = rowsSwapAt + 8;
const scrollTo = scrollFrom + 30;
const newRowFrom = scrollTo + 4;

const NEW_ROW_Y = studentTableRect(`name_${NEW_ROW.student.id}`, STUDENT_ROWS_AFTER_ADD, W).y;
const SCROLL_Y = NEW_ROW_Y - 200;

const bodyRect = (r: Rect, scrollY: number): Rect => ({
  ...r,
  x: r.x + GRADE_ADMIN_BODY.x,
  y: r.y + GRADE_ADMIN_BODY.y - scrollY,
});

const modalRect = (key: Parameters<typeof studentModalRect>[0], showPreview: boolean) =>
  studentModalRect(key, PC_VIEWPORT.w, PC_VIEWPORT.h, showPreview);

// 학번 미리보기 줄은 목업이 rect 를 내보내지 않는다 — 이름 칸 아래 space-y-4(16) 자리에 같은 크기로 되짚는다.
const FIELD_GAP = 16;
const PREVIEW_H = 20;
const previewRect = (): Rect => {
  const name = modalRect("nameInput", true);
  return { x: name.x, y: name.y + name.h + FIELD_GAP, w: 168, h: PREVIEW_H };
};

const PREVIEW_ZOOM = 2.2;
const PREVIEW_CROP: InsetCrop = (() => {
  const r = previewRect();
  return { rect: { x: r.x - 10, y: r.y - 10, w: r.w + 20, h: r.h + 20 }, scale: PREVIEW_ZOOM };
})();
const PREVIEW_CARD = { x: 190, y: 546 };

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const rows = frame >= rowsSwapAt ? STUDENT_ROWS_AFTER_ADD : STUDENT_ROWS;
  const scrollY = tween(frame, [scrollFrom, scrollTo], [0, SCROLL_Y], easeInOut);
  const modalVisible = frame >= modalOpenAt && frame < modalCloseAt + MODAL_FADE_OUT;
  return (
    <BrowserFrame url={`${APP_HOST}/grade-admin/1`} tabTitle={TAB_TITLE}>
      <PcViewport>
        <GradeAdminShellMock tab="students" showHelp scrollY={scrollY}>
          <StudentTableMock width={W} rows={rows} addPressAt={addClick} />
        </GradeAdminShellMock>
        {modalVisible ? (
          <div style={{ position: "absolute", inset: 0, opacity: tween(frame, [modalCloseAt, modalCloseAt + MODAL_FADE_OUT], [1, 0]) }}>
            <StudentModalMock
              width={PC_VIEWPORT.w}
              height={PC_VIEWPORT.h}
              grade={GRADE}
              mode="add"
              classNumber={{ text: String(NEW_STUDENT.classNumber), typeFrom: classType }}
              studentNumber={{ text: String(NEW_STUDENT.number), typeFrom: numberType }}
              name={{ text: NEW_STUDENT.name, typeFrom: nameType }}
              submitting={frame >= submittingFrom}
              openAt={modalOpenAt}
              submitPressAt={submitClick}
            />
          </div>
        ) : null}
      </PcViewport>
    </BrowserFrame>
  );
};

export const StudentAddScene: React.FC<DemoProps> = () => {
  const addButton = pcRectAbs(bodyRect(studentTableRect("addButton", STUDENT_ROWS, W), 0));
  const addCenter = { x: addButton.x + addButton.width / 2, y: addButton.y + addButton.height / 2 };

  // 반·번호를 칠 때는 아직 학번 미리보기가 없어 다이얼로그가 짧다 — 클릭 좌표도 그 배치로 잡는다.
  const classPoint = pcAbs(studentModalPoint("classNumberInput", PC_VIEWPORT.w, PC_VIEWPORT.h, false));
  const numberPoint = pcAbs(studentModalPoint("studentNumberInput", PC_VIEWPORT.w, PC_VIEWPORT.h, false));
  const namePoint = pcAbs(studentModalPoint("nameInput", PC_VIEWPORT.w, PC_VIEWPORT.h, true));
  const submitPoint = pcAbs(studentModalPoint("submit", PC_VIEWPORT.w, PC_VIEWPORT.h, true));
  const submit = pcRectAbs(modalRect("submit", true));
  const preview = pcRectAbs(previewRect());

  const newRow = studentTableRect(`name_${NEW_ROW.student.id}`, STUDENT_ROWS_AFTER_ADD, W);
  const table = studentTableRect("table", STUDENT_ROWS_AFTER_ADD, W);
  const newRowBox = pcRectAbs(bodyRect({ x: table.x, y: newRow.y, w: table.w, h: newRow.h }, SCROLL_Y));

  return (
    <GuideScene id={ID} step={4} label="학생 추가">
      <Stage />

      <Annotation
        from={lineAt(ID, 0, 0.12)}
        durationInFrames={modalOpenAt - lineAt(ID, 0, 0.12)}
        {...padRect(addButton, 6)}
        label="한 명씩 등록"
        labelPosition="right"
        color={colors.blue600}
      />

      <Annotation
        from={previewFrom}
        durationInFrames={previewOut - previewFrom}
        {...padRect(preview, 6)}
        label="학번 자동 생성"
        labelPosition="right"
        color={colors.indigo600}
      />
      <InsetCard card={PREVIEW_CARD} crop={PREVIEW_CROP} title="학번 확대" from={previewFrom + 4} out={previewOut}>
        <StudentModalMock
          width={PC_VIEWPORT.w}
          height={PC_VIEWPORT.h}
          grade={GRADE}
          mode="add"
          classNumber={{ text: String(NEW_STUDENT.classNumber) }}
          studentNumber={{ text: String(NEW_STUDENT.number) }}
          name={{ text: NEW_STUDENT.name }}
        />
      </InsetCard>

      <Annotation
        from={submitCursorFrom + 6}
        durationInFrames={modalCloseAt - submitCursorFrom - 6}
        {...padRect(submit, 6)}
        label="추가"
        // 왼쪽에 두면 취소 버튼을 덮는다 — 학번 줄 오른쪽 빈 자리로 올린다.
        labelPosition="top"
        labelAlign="end"
        color={colors.green600}
      />

      <Annotation
        from={newRowFrom}
        durationInFrames={lineEnd(ID, 2) + 12 - newRowFrom}
        {...padRect(newRowBox, 4)}
        label={`${NEW_STUDENT.name} · 학번 ${NEW_STUDENT_CODE}`}
        labelPosition="top"
        color={colors.green600}
      />

      <Cursor
        path={[
          { frame: lineStart(ID, 0) + 4, x: 700, y: 760 },
          { frame: addClick - 10, x: addCenter.x, y: addCenter.y },
          { frame: modalOpenAt + 4, x: addCenter.x, y: addCenter.y },
          { frame: classClick - 6, x: classPoint.x, y: classPoint.y },
          { frame: classClick + CLICK_HOLD, x: classPoint.x, y: classPoint.y },
          { frame: numberClick - 4, x: numberPoint.x, y: numberPoint.y },
          { frame: numberClick + CLICK_HOLD, x: numberPoint.x, y: numberPoint.y },
          { frame: nameClick - 4, x: namePoint.x, y: namePoint.y },
          { frame: typeCursorHide, x: namePoint.x, y: namePoint.y },
        ]}
        clicks={[addClick, classClick, numberClick, nameClick]}
        hideAfter={typeCursorHide}
      />
      <Cursor
        path={[
          { frame: submitCursorFrom, x: submitPoint.x + 130, y: submitPoint.y + 110 },
          { frame: submitClick - 6, x: submitPoint.x, y: submitPoint.y },
          { frame: modalCloseAt, x: submitPoint.x, y: submitPoint.y },
        ]}
        clicks={[submitClick]}
        hideAfter={modalCloseAt}
      />
    </GuideScene>
  );
};
