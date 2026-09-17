import React from "react";
import { useCurrentFrame } from "remotion";
import { easeInOut, tween } from "../../anim";
import { APP_HOST } from "../../app-mocks/data";
import { PC_VIEWPORT, PcViewport, pcAbs, pcRectAbs, type Rect } from "../../app-mocks/layout";
import { tw } from "../../app-mocks/tw";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { FlashNotice } from "../../components/FlashNotice";
import { GuideScene } from "../../guide/GuideScene";
import { FONT, MONO } from "../../fonts";
import type { DemoProps } from "../../props";
import { colors } from "../../theme";
import { padRect } from "../../teacher/scenes/pc-helpers";
import { EXCEL_RESULT, GRADE, STUDENT_ROWS } from "../data";
import { ExcelUploadMock, excelRect, type ExcelUploadStep } from "../mocks/ExcelUploadMock";
import { GRADE_ADMIN_BODY, GradeAdminShellMock } from "../mocks/GradeAdminShellMock";
import { StudentTableMock, studentTableRect } from "../mocks/StudentTableMock";
import { lineAt, lineEnd, lineStart } from "../timing";
import { STUDENT_ROWS_AFTER_ADD } from "./StudentAddScene";

const ID = "StudentExcel";
const TAB_TITLE = "포산고 자율학습";
const W = GRADE_ADMIN_BODY.w;
const FILE_NAME = "1학년_학생명단.xlsx";
const TEMPLATE_FILE = "1학년_학생등록_양식.xlsx";

const excelClick = lineAt(ID, 1, 0.12);
const modalOpenAt = excelClick + 6;
const templateClick = lineAt(ID, 1, 0.6);
const templateCursorHide = templateClick + 14;

const templateCardFrom = lineAt(ID, 2, 0.04);
const templateCardOut = lineAt(ID, 2, 0.62);
const dragFrom = lineAt(ID, 2, 0.56);
const dropAt = lineAt(ID, 2, 0.74);
const selectedAt = dropAt + 2;
const dropzoneFrom = selectedAt + 4;

const uploadCursorFrom = lineStart(ID, 3) - 14;
const uploadClick = lineAt(ID, 3, 0.06);
const uploadingAt = uploadClick + 2;
const resultAt = uploadClick + 24;
const uploadCursorHide = uploadClick + 16;
const summaryFrom = resultAt + 8;
const failedFrom = lineAt(ID, 3, 0.55);

const warnFrom = lineAt(ID, 4, 0.04);
const warnOut = lineEnd(ID, 4);

const modalCloseAt = lineStart(ID, 5) + 6;
const MODAL_FADE_OUT = 8;
const adviceFrom = modalCloseAt + 14;
const adviceOut = lineEnd(ID, 5) + 10;

const stepAt = (frame: number): ExcelUploadStep => {
  if (frame >= resultAt) return "result";
  if (frame >= uploadingAt) return "uploading";
  if (frame >= selectedAt) return "selected";
  return "initial";
};

const dialogRect = (
  key: Parameters<typeof excelRect>[0],
  step: ExcelUploadStep,
): Rect => excelRect(key, PC_VIEWPORT.w, PC_VIEWPORT.h, step, EXCEL_RESULT.rows);

const bodyRect = (r: Rect): Rect => ({ ...r, x: r.x + GRADE_ADMIN_BODY.x, y: r.y + GRADE_ADMIN_BODY.y });

const TOOLBAR: Rect = (() => {
  const filter = studentTableRect("classFilter", STUDENT_ROWS_AFTER_ADD, W);
  const add = studentTableRect("addButton", STUDENT_ROWS_AFTER_ADD, W);
  return { x: filter.x, y: filter.y, w: add.x + add.w - filter.x, h: filter.h };
})();

// 드롭 목적지는 파일이 놓이기 전 단계(initial)의 드롭존 가운데다.
const DROPZONE_INITIAL = dialogRect("dropzone", "initial");
const DROP_POINT = pcAbs({ x: DROPZONE_INITIAL.x + DROPZONE_INITIAL.w / 2, y: DROPZONE_INITIAL.y + DROPZONE_INITIAL.h / 2 });
const DRAG_START = { x: 300, y: 812 };

// 끌어다 놓는 파일 — 목업에는 없는 연출이라 장면이 직접 그린다(앱의 드래그 고스트 자리).
const DragFile: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < dragFrom || frame > dropAt + 4) return null;
  const t = tween(frame, [dragFrom, dropAt], [0, 1], easeInOut);
  const x = DRAG_START.x + (DROP_POINT.x - DRAG_START.x) * t;
  const y = DRAG_START.y + (DROP_POINT.y - DRAG_START.y) * t;
  const opacity = tween(frame, [dragFrom, dragFrom + 8], [0, 1]) * tween(frame, [dropAt, dropAt + 4], [1, 0]);
  return (
    <div
      style={{
        position: "absolute",
        left: x - 150,
        top: y - 28,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 22px",
        background: "#fff",
        border: `2px solid ${colors.green600}`,
        borderRadius: 12,
        boxShadow: "0 16px 36px rgba(15,23,42,0.22)",
        fontFamily: FONT,
        fontSize: 22,
        fontWeight: 700,
        color: colors.gray700,
        whiteSpace: "nowrap",
        opacity,
        rotate: `${(1 - t) * -4}deg`,
      }}
    >
      <span style={{ fontSize: 26 }}>📄</span>
      <span>{FILE_NAME}</span>
    </div>
  );
};

const CARD_ENTER = 10;
const CARD_EXIT = 6;

const cardOpacity = (frame: number, from: number, out: number) =>
  tween(frame, [from, from + CARD_ENTER], [0, 1]) * tween(frame, [out, out + CARD_EXIT], [1, 0]);

// 양식 4열 예시 — 실제 템플릿 파일 대신 장면이 그리는 설명 카드.
const TEMPLATE_COLUMNS = ["학년", "반", "번호", "이름"];
const TEMPLATE_SAMPLE = STUDENT_ROWS.slice(0, 2).map((row) => [
  String(row.student.grade),
  String(row.student.classNumber),
  String(row.student.number),
  row.student.name,
]);
const TEMPLATE_CARD = { x: 196, y: 330 };
const TEMPLATE_COL_W = 96;
const TEMPLATE_ROW_H = 44;

const TemplateCard: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < templateCardFrom || frame > templateCardOut + CARD_EXIT) return null;
  const shown = cardOpacity(frame, templateCardFrom, templateCardOut);
  return (
    <div
      style={{
        position: "absolute",
        left: TEMPLATE_CARD.x,
        top: TEMPLATE_CARD.y,
        padding: 24,
        background: "#fff",
        borderRadius: 18,
        border: `3px solid ${colors.blue600}`,
        boxShadow: "0 20px 50px rgba(15,23,42,0.14)",
        fontFamily: FONT,
        opacity: shown,
        translate: `${(shown - 1) * 20}px 0px`,
      }}
    >
      <div style={{ fontSize: 24, fontWeight: 700, color: colors.gray700, marginBottom: 16, whiteSpace: "nowrap" }}>
        양식 4개 열
      </div>
      <div style={{ display: "flex" }}>
        {TEMPLATE_COLUMNS.map((column, columnIndex) => (
          <div key={column} style={{ width: TEMPLATE_COL_W }}>
            <div
              style={{
                height: TEMPLATE_ROW_H,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: tw.blue[50],
                border: `1px solid ${tw.blue[200]}`,
                fontSize: 22,
                fontWeight: 700,
                color: colors.blue700,
                whiteSpace: "nowrap",
              }}
            >
              {column}
            </div>
            {TEMPLATE_SAMPLE.map((row, rowIndex) => (
              <div
                key={`${column}-${rowIndex}`}
                style={{
                  height: TEMPLATE_ROW_H,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#fff",
                  border: `1px solid ${tw.gray[200]}`,
                  fontSize: 22,
                  fontFamily: columnIndex === 3 ? FONT : MONO,
                  color: colors.gray700,
                  whiteSpace: "nowrap",
                }}
              >
                {row[columnIndex]}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

type NoteItem = { text: string; strong: string };

const NoteCard: React.FC<{
  x: number;
  y: number;
  title: string;
  color: string;
  items: NoteItem[];
  from: number;
  out: number;
}> = ({ x, y, title, color, items, from, out }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame > out + CARD_EXIT) return null;
  const shown = cardOpacity(frame, from, out);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: "26px 34px",
        background: "#fff",
        borderRadius: 18,
        border: `3px solid ${color}`,
        boxShadow: "0 20px 50px rgba(15,23,42,0.14)",
        fontFamily: FONT,
        opacity: shown,
        translate: `${(shown - 1) * 20}px 0px`,
      }}
    >
      <span style={{ fontSize: 26, fontWeight: 700, color: colors.gray600, whiteSpace: "nowrap" }}>{title}</span>
      {items.map((item, i) => {
        const at = from + CARD_ENTER + i * 12;
        const enter = tween(frame, [at, at + 12], [0, 1]);
        return (
          <div
            key={item.strong}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 14,
              opacity: enter,
              translate: `0px ${(1 - enter) * 12}px`,
            }}
          >
            <span style={{ fontSize: 25, fontWeight: 500, color: colors.gray700, whiteSpace: "nowrap" }}>{item.text}</span>
            <span style={{ fontSize: 28, fontWeight: 800, color, whiteSpace: "nowrap" }}>{item.strong}</span>
          </div>
        );
      })}
    </div>
  );
};

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const step = stepAt(frame);
  const modalVisible = frame >= modalOpenAt && frame < modalCloseAt + MODAL_FADE_OUT;
  return (
    <BrowserFrame url={`${APP_HOST}/grade-admin/1`} tabTitle={TAB_TITLE}>
      <PcViewport>
        <GradeAdminShellMock tab="students" showHelp>
          <StudentTableMock width={W} rows={STUDENT_ROWS_AFTER_ADD} excelPressAt={excelClick} />
        </GradeAdminShellMock>
        {modalVisible ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: tween(frame, [modalCloseAt, modalCloseAt + MODAL_FADE_OUT], [1, 0]),
            }}
          >
            <ExcelUploadMock
              width={PC_VIEWPORT.w}
              height={PC_VIEWPORT.h}
              grade={GRADE}
              step={step}
              fileName={FILE_NAME}
              result={EXCEL_RESULT}
              openAt={modalOpenAt}
              downloadPressAt={templateClick}
              uploadPressAt={uploadClick}
            />
          </div>
        ) : null}
      </PcViewport>
    </BrowserFrame>
  );
};

export const StudentExcelScene: React.FC<DemoProps> = () => {
  const toolbar = pcRectAbs(bodyRect(TOOLBAR));
  const excelButton = pcRectAbs(bodyRect(studentTableRect("excelButton", STUDENT_ROWS_AFTER_ADD, W)));
  const excelCenter = { x: excelButton.x + excelButton.width / 2, y: excelButton.y + excelButton.height / 2 };

  const template = pcRectAbs(dialogRect("downloadTemplate", "initial"));
  const templateCenter = { x: template.x + template.width / 2, y: template.y + template.height / 2 };
  const dropzone = pcRectAbs(dialogRect("dropzone", "selected"));
  const upload = pcRectAbs(dialogRect("uploadButton", "selected"));
  const uploadCenter = { x: upload.x + upload.width / 2, y: upload.y + upload.height / 2 };

  const resultTable = dialogRect("resultTable", "result");
  const uploadResult = dialogRect("uploadButton", "result");
  // 성공·실패 건수 줄은 rect 키가 없다 — 업로드 버튼과 결과 표 사이의 space-y-4 자리다.
  const summary = pcRectAbs({
    x: resultTable.x,
    y: uploadResult.y + uploadResult.h + 16,
    w: resultTable.w,
    h: resultTable.y - (uploadResult.y + uploadResult.h) - 24,
  });
  const failed = pcRectAbs(resultTable);

  return (
    <GuideScene id={ID} step={5} label="Excel 업로드">
      <Stage />

      <Annotation
        from={lineAt(ID, 0, 0.14)}
        durationInFrames={modalOpenAt - lineAt(ID, 0, 0.14)}
        {...padRect(toolbar, 6)}
        label="학년 전체 명단 한 번에"
        labelPosition="right"
        labelGap={30}
        color={colors.green600}
      />

      <Annotation
        from={modalOpenAt + 10}
        durationInFrames={templateCardFrom - modalOpenAt - 10}
        {...padRect(template, 6)}
        label="양식 받기"
        labelPosition="left"
        color={colors.blue600}
      />
      <FlashNotice from={templateClick + 4} durationInFrames={46} text={TEMPLATE_FILE} hint="다운로드 완료" />

      <TemplateCard />
      <DragFile />

      <Annotation
        from={dropzoneFrom}
        durationInFrames={lineEnd(ID, 2) + 6 - dropzoneFrom}
        {...padRect(dropzone, 6)}
        label="끌어다 놓거나 눌러서 선택"
        labelPosition="left"
        color={colors.green600}
      />

      <Annotation
        from={summaryFrom}
        durationInFrames={warnFrom - summaryFrom}
        {...padRect(summary, 6)}
        label={`성공 ${EXCEL_RESULT.success} · 실패 ${EXCEL_RESULT.failed}`}
        labelPosition="left"
        color={colors.green600}
      />
      <Annotation
        from={failedFrom}
        durationInFrames={warnFrom - failedFrom}
        {...padRect(failed, 6)}
        label="실패한 행과 사유"
        labelPosition="left"
        color={colors.red600}
      />

      <NoteCard
        x={196}
        y={372}
        title="주의"
        color={colors.red600}
        items={[
          { text: "반 · 번호가 같은 행", strong: "새 학생으로 교체" },
          { text: "참여 설정 · 좌석", strong: "처음부터" },
        ]}
        from={warnFrom}
        out={warnOut}
      />

      <NoteCard
        x={560}
        y={420}
        title="언제 쓰나요?"
        color={colors.blue600}
        items={[
          { text: "학기 초 명단 등록", strong: "Excel 업로드" },
          { text: "이후 변경", strong: "한 명씩 수정" },
        ]}
        from={adviceFrom}
        out={adviceOut}
      />

      <Cursor
        path={[
          { frame: lineStart(ID, 0) + 6, x: 760, y: 780 },
          { frame: excelClick - 10, x: excelCenter.x, y: excelCenter.y },
          { frame: modalOpenAt + 6, x: excelCenter.x, y: excelCenter.y },
          { frame: templateClick - 8, x: templateCenter.x, y: templateCenter.y },
          { frame: templateCursorHide, x: templateCenter.x, y: templateCenter.y },
        ]}
        clicks={[excelClick, templateClick]}
        hideAfter={templateCursorHide}
      />

      <Cursor
        path={[
          { frame: dragFrom, x: DRAG_START.x, y: DRAG_START.y },
          { frame: dropAt, x: DROP_POINT.x, y: DROP_POINT.y },
          { frame: dropAt + 10, x: DROP_POINT.x, y: DROP_POINT.y },
        ]}
        clicks={[dropAt]}
        hideAfter={dropAt + 10}
      />

      <Cursor
        path={[
          { frame: uploadCursorFrom, x: uploadCenter.x - 120, y: uploadCenter.y + 90 },
          { frame: uploadClick - 6, x: uploadCenter.x, y: uploadCenter.y },
          { frame: uploadCursorHide, x: uploadCenter.x, y: uploadCenter.y },
        ]}
        clicks={[uploadClick]}
        hideAfter={uploadCursorHide}
      />
    </GuideScene>
  );
};
