import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import { APP_URL } from "../../app-mocks/data";
import { PC_VIEWPORT, PcViewport, pcRectAbs, type Point, type Rect } from "../../app-mocks/layout";
import { tw } from "../../app-mocks/tw";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";
import { colors } from "../../theme";
import { NativeDialogMock } from "../../teacher/mocks/NativeDialogMock";
import { padRect } from "../../teacher/scenes/pc-helpers";
import { CLASSROOM_CONFIG_EXAMPLE, GRADE, SEAT_EDITOR } from "../data";
import { ClassroomConfigMock, classroomConfigRect, type EditingClassroomConfig } from "../mocks/ClassroomConfigMock";
import { GRADE_ADMIN_BODY, GradeAdminShellMock } from "../mocks/GradeAdminShellMock";
import { SeatEditorMock, afternoonRoomId, seatCellRect, seatEditorRect } from "../mocks/SeatEditorMock";
import { lineAt, lineEnd, lineStart } from "../timing";

const ID = "ClassroomConfig";
const TAB_TITLE = "포산고 자율학습";
const W = GRADE_ADMIN_BODY.w;

// --- 장면이 직접 그리는 "추가된 1-7반 교실" ------------------------------------------
// SeatEditorMock 은 SEAT_EDITOR(1·2·3반)만 그린다. 저장으로 생긴 7반 교실은 목업이 만들 수 없어
// 같은 레이아웃 상수로 이 장면에서 한 칸 더 그린다(목업은 수정 금지). 상수는 SeatEditorMock 과 동일.
const PAD_X = 16;
const MAIN_W = 912;
const SIDE_W = 20;
const SIDE_GAP = 4;
const DIV_GAP = 12;
const DIV_W = (MAIN_W - (SIDE_W + SIDE_GAP) * 2 - DIV_GAP * 2) / 3;
const ROOM_PAD = 8;
const CELL_GAP = 4;
const CELL_W = (DIV_W - ROOM_PAD * 2 - CELL_GAP) / 2;
const CELL_H = 56;
const DIV_HEADER_H = 32;
const TITLE_H = 32;
const DESK_H = 34;
const CLASS_GAP = 24;
const NEW_ROWS = CLASSROOM_CONFIG_EXAMPLE.rowsPerDivision[0];
const DIV_BOX_H = ROOM_PAD * 2 + DIV_HEADER_H + NEW_ROWS * CELL_H + (NEW_ROWS - 1) * CELL_GAP;

// 마지막 학급(3반 분단3 아래 행)의 좌석 밑 → 분단 박스 안쪽 여백 → 교탁 → 학급 간격.
const LAST_SEAT = seatCellRect(afternoonRoomId(3, 3), 2, 2);
const NEW_CLASS_Y = LAST_SEAT.y + LAST_SEAT.h + ROOM_PAD + DESK_H + CLASS_GAP;
const NEW_CLASS: Rect = { x: PAD_X, y: NEW_CLASS_Y, w: MAIN_W, h: TITLE_H + DIV_BOX_H + DESK_H };
const EDITOR_H = NEW_CLASS.y + NEW_CLASS.h + 24;
const SCROLL_BOTTOM = NEW_CLASS.y + NEW_CLASS.h + 12 - GRADE_ADMIN_BODY.h;

const AddedClassroom: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const frameY = NEW_CLASS.y + TITLE_H;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, opacity: tween(frame, [from, from + 10], [0, 1]) }}>
      <div
        style={{
          position: "absolute",
          left: PAD_X,
          top: NEW_CLASS.y,
          width: MAIN_W,
          height: TITLE_H,
          display: "flex",
          alignItems: "center",
          fontSize: 16,
          fontWeight: 600,
          color: tw.gray[700],
          whiteSpace: "nowrap",
        }}
      >
        {GRADE}-{CLASSROOM_CONFIG_EXAMPLE.classNumber}반
      </div>
      {/* corridorSide: "right" → 왼쪽 라벨이 창문, 오른쪽이 복도(classroom-config.ts corridorLabels) */}
      {(["창문", "복도"] as const).map((text, i) => (
        <div
          key={text}
          style={{
            position: "absolute",
            left: i === 0 ? PAD_X : PAD_X + SIDE_W + SIDE_GAP + (MAIN_W - (SIDE_W + SIDE_GAP) * 2) + SIDE_GAP,
            top: frameY,
            width: SIDE_W,
            height: DIV_BOX_H,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            writingMode: "vertical-rl",
            fontSize: 11,
            color: tw.slate[400],
            whiteSpace: "nowrap",
          }}
        >
          {text}
        </div>
      ))}
      {Array.from({ length: 3 }, (_, di) => (
        <div
          key={di}
          style={{
            position: "absolute",
            left: PAD_X + SIDE_W + SIDE_GAP + di * (DIV_W + DIV_GAP),
            top: frameY,
            width: DIV_W,
            height: DIV_BOX_H,
            background: tw.white,
            borderRadius: 8,
            border: `1px solid ${tw.gray[200]}`,
            boxSizing: "border-box",
          }}
        >
          <div style={{ position: "absolute", left: ROOM_PAD, top: ROOM_PAD, fontSize: 13, fontWeight: 600, color: tw.gray[800], whiteSpace: "nowrap" }}>
            분단{di + 1}
          </div>
          {Array.from({ length: NEW_ROWS }, (_, ri) =>
            Array.from({ length: 2 }, (_, ci) => (
              <div
                key={`${ri}-${ci}`}
                style={{
                  position: "absolute",
                  left: ROOM_PAD + ci * (CELL_W + CELL_GAP),
                  top: ROOM_PAD + DIV_HEADER_H + ri * (CELL_H + CELL_GAP),
                  width: CELL_W,
                  height: CELL_H,
                  borderRadius: 6,
                  border: `1px solid ${tw.gray[200]}`,
                  background: tw.gray[50],
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  color: tw.gray[300],
                  whiteSpace: "nowrap",
                }}
              >
                {ri + 1}-{ci + 1}
              </div>
            )),
          )}
        </div>
      ))}
      <div
        style={{
          position: "absolute",
          left: PAD_X,
          top: frameY + DIV_BOX_H + 8,
          width: MAIN_W,
          textAlign: "center",
          fontSize: 11,
          color: tw.gray[400],
          background: tw.gray[50],
          borderTop: `1px dashed ${tw.gray[300]}`,
          padding: "6px 0",
          whiteSpace: "nowrap",
        }}
      >
        교탁
      </div>
    </div>
  );
};

// --- 타이밍 ---------------------------------------------------------------------------
const sessionFrom = lineAt(ID, 0, 0.06);
const configBoxFrom = lineAt(ID, 0, 0.42);
const configClick = lineAt(ID, 0, 0.66);
const modalAt = configClick + 4;

const addClick = lineAt(ID, 1, 0.24);
const formAt = addClick + 4;
const classNumAt = lineAt(ID, 1, 0.5);
const corridorLeftPress = lineAt(ID, 1, 0.62);
const corridorRightPress = lineAt(ID, 1, 0.84);

const layoutBoxFrom = lineAt(ID, 2, 0.05);
const singlePress = lineAt(ID, 2, 0.44);
const divisionPress = lineAt(ID, 2, 0.76);

const inputsFrom = lineAt(ID, 3, 0.06);
const previewFrom = lineAt(ID, 3, 0.4);
const seatCountFrom = lineAt(ID, 3, 0.5);
const boardFrom = lineAt(ID, 3, 0.6);

const saveClick = lineAt(ID, 4, 0.3);
const modalCloseAt = saveClick + 4;
const scrollFrom = modalCloseAt + 2;
const scrollTo = scrollFrom + 26;
const addedFrom = scrollFrom;
const addedBoxFrom = scrollTo - 6;

const scrollBack = lineStart(ID, 5) + 2;
const scrollBackEnd = scrollBack + 18;
const config2Click = lineAt(ID, 5, 0.17);
const modal2At = config2Click + 4;
const assignedFrom = lineAt(ID, 5, 0.24);
const editRowClick = lineAt(ID, 5, 0.44);
const form2At = editRowClick + 4;
const rowsChangeAt = lineAt(ID, 5, 0.6);
const save2Click = lineAt(ID, 5, 0.76);
const dialogAt = save2Click + 4;

const scrollAt = (frame: number) =>
  frame < scrollBack
    ? tween(frame, [scrollFrom, scrollTo], [0, SCROLL_BOTTOM])
    : tween(frame, [scrollBack, scrollBackEnd], [SCROLL_BOTTOM, 0]);

// 새 학급 폼은 DEFAULT_FORM(ClassroomConfigModal.tsx 39-44행)에서 시작한다 — 오른쪽 복도, 분단형, 3분단 x 3행.
const newForm = (frame: number): EditingClassroomConfig => ({
  classNumberText: frame >= classNumAt ? String(CLASSROOM_CONFIG_EXAMPLE.classNumber) : "",
  corridorSide: frame >= corridorLeftPress && frame < corridorRightPress ? "left" : "right",
  layoutType: frame >= singlePress && frame < divisionPress ? "single" : "division",
  rowsPerDivision: [...CLASSROOM_CONFIG_EXAMPLE.rowsPerDivision],
});

// 1-1반 수정 — 지금 구조는 3분단 x 2행(12석)이고, 3행으로 바꾸면 배정된 9명이 초기화된다.
const EXISTING = SEAT_EDITOR.afternoon.classes[0];
const existingRows = Array.from({ length: EXISTING.config.divisions }, () => EXISTING.config.rowsPerDivision);
const existingForm = (frame: number): EditingClassroomConfig => ({
  classNumberText: String(EXISTING.classNumber),
  corridorSide: EXISTING.config.corridorSide,
  layoutType: "division",
  rowsPerDivision: frame >= rowsChangeAt ? existingRows.map(() => NEW_ROWS) : existingRows,
});

const RESET_WARNING = `${GRADE}-${EXISTING.classNumber}반의 책상 구조가 바뀌어 현재 배정된 ${EXISTING.assignments.length}명의 좌석이 초기화됩니다. 계속할까요?`;

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const listOpen = (frame >= modalAt && frame < formAt) || (frame >= modal2At && frame < form2At);
  const formOpen = (frame >= formAt && frame < modalCloseAt) || frame >= form2At;
  const modalOpen = listOpen || formOpen;
  const second = frame >= modal2At;
  return (
    <BrowserFrame url={`${APP_URL}/grade-admin/${GRADE}`} tabTitle={TAB_TITLE}>
      <PcViewport>
        <GradeAdminShellMock tab="seats" showHelp scrollY={scrollAt(frame)}>
          <SeatEditorMock
            width={W}
            height={EDITOR_H}
            session="afternoon"
            configPressAt={frame < modalAt ? configClick : config2Click}
          />
          {frame >= addedFrom ? <AddedClassroom from={addedFrom} /> : null}
        </GradeAdminShellMock>
        {modalOpen ? (
          <div style={{ position: "absolute", inset: 0, opacity: tween(frame, [second ? modal2At : modalAt, (second ? modal2At : modalAt) + 6], [0, 1]) }}>
            <ClassroomConfigMock
              width={PC_VIEWPORT.w}
              height={PC_VIEWPORT.h}
              mode={formOpen ? "edit" : "list"}
              editing={second ? existingForm(frame) : newForm(frame)}
              addPressAt={addClick}
              editPressAt={{ classNumber: EXISTING.classNumber, at: editRowClick }}
              corridorPressAt={frame < corridorRightPress ? { side: "left", at: corridorLeftPress } : { side: "right", at: corridorRightPress }}
              layoutPressAt={frame < divisionPress ? { type: "single", at: singlePress } : { type: "division", at: divisionPress }}
              savePressAt={second ? save2Click : saveClick}
            />
          </div>
        ) : null}
        {frame >= dialogAt ? (
          <NativeDialogMock width={PC_VIEWPORT.w} height={PC_VIEWPORT.h} kind="confirm" message={RESET_WARNING} openAt={dialogAt} />
        ) : null}
      </PcViewport>
    </BrowserFrame>
  );
};

const union = (a: Rect, b: Rect): Rect => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};
const centerOf = (r: { x: number; y: number; width: number; height: number }): Point => ({
  x: r.x + r.width / 2,
  y: r.y + r.height / 2,
});
const bodyAbs = (r: Rect, scrollY = 0) => pcRectAbs({ x: r.x, y: GRADE_ADMIN_BODY.y + r.y - scrollY, w: r.w, h: r.h });

const PREVIEW = classroomConfigRect("preview", "edit");
// 미리보기 안쪽 캡션 줄(p-3): 왼쪽 "미리보기 (아래가 칠판)", 오른쪽 "총 N석" — 목업이 따로 rect 를 주지 않는다.
const BOARD_CAPTION: Rect = { x: PREVIEW.x + 8, y: PREVIEW.y + 9, w: 124, h: 20 };
const SEAT_COUNT: Rect = { x: PREVIEW.x + PREVIEW.w - 8 - 62, y: PREVIEW.y + 9, w: 62, h: 20 };
const ROW_INPUTS = union(classroomConfigRect("rowInput_1", "edit"), classroomConfigRect("rowInput_3", "edit"));
const FORM_INPUTS = union(classroomConfigRect("divisionsInput", "edit"), ROW_INPUTS);
const CORRIDOR = union(classroomConfigRect("corridorLeft", "edit"), classroomConfigRect("corridorRight", "edit"));
const LAYOUT = union(classroomConfigRect("layoutDivision", "edit"), classroomConfigRect("layoutSingle", "edit"));
// 목록 표의 "배정" 열 — 앞선 6개 열 폭(84·64·64·108·64)을 지나야 나온다(ClassroomConfigMock COL_W).
const TABLE = classroomConfigRect("table", "list");
const ASSIGNED_COL: Rect = { x: TABLE.x + 384, y: TABLE.y + 36, w: 64, h: TABLE.h - 36 };

export const ClassroomConfigScene: React.FC<DemoProps> = () => {
  const configPoint = centerOf(bodyAbs(seatEditorRect("configButton")));
  const addPoint = centerOf(pcRectAbs(classroomConfigRect("addButton", "list")));
  const corridorRightPoint = centerOf(pcRectAbs(classroomConfigRect("corridorRight", "edit")));
  const singlePoint = centerOf(pcRectAbs(classroomConfigRect("layoutSingle", "edit")));
  const divisionPoint = centerOf(pcRectAbs(classroomConfigRect("layoutDivision", "edit")));
  const savePoint = centerOf(pcRectAbs(classroomConfigRect("saveButton", "edit")));
  const editRowPoint = centerOf(pcRectAbs(classroomConfigRect(`editButton_${EXISTING.classNumber}`, "list")));

  return (
    <GuideScene id={ID} step={10} label="교실 구조">
      <Stage />

      <Annotation
        from={sessionFrom}
        durationInFrames={configBoxFrom + 20 - sessionFrom}
        {...padRect(bodyAbs(seatEditorRect("sessionAfternoon")), 5)}
        label="오후 자율학습에서만"
        labelPosition="right"
        // 야간 버튼을 덮지 않도록 두 버튼 오른쪽 빈 띠까지 밀어낸다.
        labelGap={200}
        color={colors.blue600}
      />
      <Annotation
        from={configBoxFrom}
        durationInFrames={modalAt + 6 - configBoxFrom}
        {...padRect(bodyAbs(seatEditorRect("configButton")), 5)}
        label="교실 구조 설정"
        labelPosition="top"
        labelAlign="start"
      />

      <Annotation
        from={formAt + 6}
        durationInFrames={corridorLeftPress - formAt - 6}
        {...padRect(pcRectAbs(classroomConfigRect("classNumberInput", "edit")), 5)}
        label="반 번호"
        labelPosition="right"
        color={colors.blue600}
      />
      <Annotation
        from={corridorLeftPress - 8}
        durationInFrames={lineEnd(ID, 1) - corridorLeftPress + 8}
        {...padRect(pcRectAbs(CORRIDOR), 5)}
        label="복도 위치"
        labelPosition="right"
        color={colors.blue600}
      />

      <Annotation
        from={layoutBoxFrom}
        durationInFrames={lineEnd(ID, 2) - layoutBoxFrom}
        {...padRect(pcRectAbs(LAYOUT), 5)}
        label="분단형 = 2명씩 · 단독형 = 1명씩"
        labelPosition="right"
        color={colors.blue600}
      />

      {/* 문장 3 — 도움말 스틸(3, 0.7). 스틸에는 미리보기·총 좌석 수·칠판 라벨 셋만 남긴다. */}
      <Annotation
        from={inputsFrom}
        durationInFrames={previewFrom + 4 - inputsFrom}
        {...padRect(pcRectAbs(FORM_INPUTS), 5)}
        color={colors.blue600}
      />
      <Annotation
        from={previewFrom}
        durationInFrames={lineEnd(ID, 3) - previewFrom}
        {...padRect(pcRectAbs(PREVIEW), 5)}
        color={colors.blue600}
      />
      <Annotation
        from={seatCountFrom}
        durationInFrames={lineEnd(ID, 3) - seatCountFrom}
        {...padRect(pcRectAbs(SEAT_COUNT), 4)}
        label="총 좌석 수"
        labelPosition="right"
        color={colors.green600}
      />
      <Annotation
        from={boardFrom}
        durationInFrames={lineEnd(ID, 3) - boardFrom}
        {...padRect(pcRectAbs(BOARD_CAPTION), 4)}
        label="아래쪽이 칠판"
        labelPosition="left"
      />

      <Annotation
        from={addedBoxFrom}
        durationInFrames={lineEnd(ID, 4) + 6 - addedBoxFrom}
        {...padRect(bodyAbs(NEW_CLASS, SCROLL_BOTTOM), 5)}
        label={`${GRADE}-${CLASSROOM_CONFIG_EXAMPLE.classNumber}반 교실이 생겼습니다`}
        labelPosition="right"
        color={colors.green600}
      />

      <Annotation
        from={assignedFrom}
        durationInFrames={editRowClick + 4 - assignedFrom}
        {...padRect(pcRectAbs(ASSIGNED_COL), 4)}
        label="이미 배정된 학생"
        labelPosition="bottom"
        labelAlign="start"
      />
      <Annotation
        from={rowsChangeAt - 6}
        durationInFrames={dialogAt - rowsChangeAt + 6}
        {...padRect(pcRectAbs(ROW_INPUTS), 5)}
        label="행 수 변경"
        labelPosition="right"
      />

      <Cursor
        path={[
          { frame: lineStart(ID, 0) + 6, x: configPoint.x - 120, y: configPoint.y + 240 },
          { frame: configClick - 8, x: configPoint.x, y: configPoint.y },
          { frame: configClick + 10, x: configPoint.x, y: configPoint.y },
        ]}
        clicks={[configClick]}
        hideAfter={configClick + 12}
      />
      <Cursor
        path={[
          { frame: modalAt + 4, x: addPoint.x + 160, y: addPoint.y + 180 },
          { frame: addClick - 6, x: addPoint.x, y: addPoint.y },
          { frame: addClick + 12, x: addPoint.x, y: addPoint.y },
          { frame: corridorLeftPress - 6, x: corridorRightPoint.x - 110, y: corridorRightPoint.y },
          { frame: corridorRightPress - 6, x: corridorRightPoint.x, y: corridorRightPoint.y },
          { frame: corridorRightPress + 10, x: corridorRightPoint.x, y: corridorRightPoint.y },
        ]}
        clicks={[addClick, corridorLeftPress, corridorRightPress]}
        hideAfter={corridorRightPress + 12}
      />
      <Cursor
        path={[
          { frame: lineStart(ID, 2) + 10, x: singlePoint.x + 60, y: singlePoint.y + 150 },
          { frame: singlePress - 6, x: singlePoint.x, y: singlePoint.y },
          { frame: divisionPress - 8, x: divisionPoint.x, y: divisionPoint.y },
          { frame: divisionPress + 10, x: divisionPoint.x, y: divisionPoint.y },
        ]}
        clicks={[singlePress, divisionPress]}
        hideAfter={divisionPress + 12}
      />
      <Cursor
        path={[
          { frame: lineStart(ID, 4) + 2, x: savePoint.x - 180, y: savePoint.y + 90 },
          { frame: saveClick - 6, x: savePoint.x, y: savePoint.y },
          { frame: saveClick + 8, x: savePoint.x, y: savePoint.y },
        ]}
        clicks={[saveClick]}
        hideAfter={saveClick + 10}
      />
      <Cursor
        path={[
          { frame: scrollBackEnd, x: configPoint.x - 160, y: configPoint.y + 200 },
          { frame: config2Click - 6, x: configPoint.x, y: configPoint.y },
          { frame: config2Click + 12, x: configPoint.x, y: configPoint.y },
          { frame: editRowClick - 6, x: editRowPoint.x, y: editRowPoint.y },
          { frame: editRowClick + 12, x: editRowPoint.x, y: editRowPoint.y },
          { frame: save2Click - 8, x: savePoint.x, y: savePoint.y },
          { frame: save2Click + 8, x: savePoint.x, y: savePoint.y },
        ]}
        clicks={[config2Click, editRowClick, save2Click]}
        hideAfter={save2Click + 10}
      />
    </GuideScene>
  );
};
