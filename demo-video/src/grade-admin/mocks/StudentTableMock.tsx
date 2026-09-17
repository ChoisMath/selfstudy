// src/components/students/StudentManagement.tsx 이식 — 학생 관리 툴바 + 표(315-492행). 셸에 의존하지 않고
// `width` 만 받아 독립적으로 그린다. GradeAdminLayout main(app/grade-admin/[grade]/layout.tsx:7)의
// lg:px-4(16px) 가로 여백은 이 목업이 스스로 그린다 — 6탭이 같은 main 안에서 위쪽 여백(py-3)을 이미 소비하므로
// 세로 패딩은 추가하지 않는다(Homeroom 편 HomeroomWeeklyMock과 같은 컨트롤러 컨벤션이되, 탭이 main 안에 있다는
// 구조 차이만 반영 — 컨트롤러 재확인 전까지의 근사 경계, task-3-report 참고).
import React from "react";
import { useCurrentFrame } from "remotion";
import type { Rect } from "../../app-mocks/layout";
import { tw } from "../../app-mocks/tw";
import { pressScale } from "../../app-mocks/primitives";
import { FONT, MONO } from "../../fonts";
import type { StudentRow } from "../data";

const PAD_X = 16; // main lg:px-4

const TOOLBAR_H = 44; // min-h-11 (select·버튼 공통, 319-342행)
const TOOLBAR_MB = 16; // mb-4 (317행)
const SELECT_W = 112; // px-3 py-2 select(319-330행) 근사
const EXCEL_BTN_W = 84; // px-4 py-2 "Excel"(331-336행) 근사
const ADD_BTN_W = 112; // px-4 py-2 "+ 학생 추가"(337-342행) 근사
const TOOLBAR_GAP = 12; // gap-3(318행)

const HEADER_H = 44; // th px-4 py-3(367-393행)
const ROW_H = 44; // td px-4 py-3(409-481행)
const FOOTER_H = 44; // px-4 py-3(486-491행)

const NAME_W = 96;
const GRADE_W = 60;
const CLASS_W = 56;
const NUMBER_W = 64;
const CODE_W = 88;
const STATUS_W = 84;
const HELPER_W = 88;
const MANAGE_W = 168;
const TABLE_W = NAME_W + GRADE_W + CLASS_W + NUMBER_W + CODE_W + STATUS_W + HELPER_W + MANAGE_W;

const colX = {
  name: 0,
  grade: NAME_W,
  classNumber: NAME_W + GRADE_W,
  number: NAME_W + GRADE_W + CLASS_W,
  code: NAME_W + GRADE_W + CLASS_W + NUMBER_W,
  status: NAME_W + GRADE_W + CLASS_W + NUMBER_W + CODE_W,
  helper: NAME_W + GRADE_W + CLASS_W + NUMBER_W + CODE_W + STATUS_W,
  manage: NAME_W + GRADE_W + CLASS_W + NUMBER_W + CODE_W + STATUS_W + HELPER_W,
} as const;

const MANAGE_RIGHT_PAD = 16; // px-4(455행)
const MANAGE_BTN_W = 56; // px-2.5 "수정"/"삭제"/"복원"(457-476행) 근사
const MANAGE_BTN_GAP = 8; // gap-2(456행)
const manageContentX = colX.manage + (MANAGE_W - MANAGE_RIGHT_PAD - (MANAGE_BTN_W * 2 + MANAGE_BTN_GAP));
const MANAGE_BTN_H = 24; // px-2.5 py-1 text-xs — min-h-11 미적용(앱 원본 그대로, 457-476행)

const TABLE_TOP = TOOLBAR_H + TOOLBAR_MB;
const rowY = (index: number) => TABLE_TOP + HEADER_H + index * ROW_H;

export const studentTableRect = (
  key:
    | "classFilter"
    | "excelButton"
    | "addButton"
    | "table"
    | "footer"
    | `name_${number}`
    | `helper_${number}`
    | `edit_${number}`
    | `deleteRestore_${number}`,
  rows: StudentRow[],
): Rect => {
  if (key === "classFilter") return { x: PAD_X, y: 0, w: SELECT_W, h: TOOLBAR_H };
  if (key === "excelButton") {
    return { x: PAD_X + SELECT_W + TOOLBAR_GAP, y: 0, w: EXCEL_BTN_W, h: TOOLBAR_H };
  }
  if (key === "addButton") {
    return { x: PAD_X + SELECT_W + TOOLBAR_GAP + EXCEL_BTN_W + TOOLBAR_GAP, y: 0, w: ADD_BTN_W, h: TOOLBAR_H };
  }
  if (key === "table") return { x: PAD_X, y: TABLE_TOP, w: TABLE_W, h: HEADER_H + rows.length * ROW_H };
  if (key === "footer") {
    return { x: PAD_X, y: TABLE_TOP + HEADER_H + rows.length * ROW_H, w: TABLE_W, h: FOOTER_H };
  }
  const sepIndex = key.indexOf("_");
  const prefix = key.slice(0, sepIndex);
  const id = Number(key.slice(sepIndex + 1));
  const index = rows.findIndex((r) => r.student.id === id);
  const y = rowY(index);
  if (prefix === "name") return { x: PAD_X + colX.name, y, w: NAME_W, h: ROW_H };
  if (prefix === "helper") return { x: PAD_X + colX.helper, y, w: HELPER_W, h: ROW_H };
  const btnY = y + (ROW_H - MANAGE_BTN_H) / 2;
  if (prefix === "edit") return { x: PAD_X + manageContentX, y: btnY, w: MANAGE_BTN_W, h: MANAGE_BTN_H };
  return { x: PAD_X + manageContentX + MANAGE_BTN_W + MANAGE_BTN_GAP, y: btnY, w: MANAGE_BTN_W, h: MANAGE_BTN_H };
};

const Th: React.FC<{ x: number; w: number; align?: "left" | "center" | "right"; children: React.ReactNode }> = ({
  x,
  w,
  align = "left",
  children,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: 0,
      width: w,
      height: HEADER_H,
      display: "flex",
      alignItems: "center",
      justifyContent: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
      padding: align === "right" ? "0 16px 0 0" : "0 0 0 16px",
      fontSize: 13,
      fontWeight: 500,
      color: tw.gray[600],
      whiteSpace: "nowrap",
      boxSizing: "border-box",
    }}
  >
    {children}
  </div>
);

export const StudentTableMock: React.FC<{
  width: number;
  height: number;
  rows: StudentRow[];
  classFilter?: number;
  excelPressAt?: number;
  addPressAt?: number;
  helperPressAt?: { studentId: number; at: number };
  actionPressAt?: { studentId: number; action: "edit" | "delete" | "restore"; at: number };
}> = ({ width, height, rows, classFilter, excelPressAt, addPressAt, helperPressAt, actionPressAt }) => {
  const frame = useCurrentFrame();
  const tableH = HEADER_H + rows.length * ROW_H;

  return (
    <div style={{ position: "absolute", width, height, background: tw.gray[50], fontFamily: FONT, overflow: "hidden" }}>
      {/* 툴바(317-344행) */}
      <div
        style={{
          position: "absolute",
          left: PAD_X,
          top: 0,
          width: SELECT_W,
          height: TOOLBAR_H,
          border: `1px solid ${tw.gray[300]}`,
          borderRadius: 6,
          background: tw.white,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          boxSizing: "border-box",
          fontSize: 13,
          color: tw.gray[700],
          whiteSpace: "nowrap",
        }}
      >
        <span>{classFilter ? `${classFilter}반` : "전체 반"}</span>
        <span style={{ color: tw.gray[400], fontSize: 10 }}>▾</span>
      </div>
      <div
        style={{
          position: "absolute",
          left: PAD_X + SELECT_W + TOOLBAR_GAP,
          top: 0,
          width: EXCEL_BTN_W,
          height: TOOLBAR_H,
          border: `1px solid ${tw.green[200]}`,
          borderRadius: 6,
          background: tw.green[50],
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          color: tw.green[700],
          whiteSpace: "nowrap",
          boxSizing: "border-box",
          scale: String(pressScale(frame, excelPressAt)),
        }}
      >
        Excel
      </div>
      <div
        style={{
          position: "absolute",
          left: PAD_X + SELECT_W + TOOLBAR_GAP + EXCEL_BTN_W + TOOLBAR_GAP,
          top: 0,
          width: ADD_BTN_W,
          height: TOOLBAR_H,
          borderRadius: 6,
          background: tw.blue[600],
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          color: tw.white,
          whiteSpace: "nowrap",
          boxSizing: "border-box",
          scale: String(pressScale(frame, addPressAt)),
        }}
      >
        + 학생 추가
      </div>

      {/* 표(363-492행) */}
      <div
        style={{
          position: "absolute",
          left: PAD_X,
          top: TABLE_TOP,
          width: TABLE_W,
          background: tw.white,
          border: `1px solid ${tw.gray[200]}`,
          borderRadius: 8,
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <div style={{ position: "relative", height: HEADER_H, background: tw.gray[50], borderBottom: `1px solid ${tw.gray[200]}` }}>
          <Th x={colX.name} w={NAME_W}>이름</Th>
          <Th x={colX.grade} w={GRADE_W}>학년</Th>
          <Th x={colX.classNumber} w={CLASS_W}>반</Th>
          <Th x={colX.number} w={NUMBER_W}>번호</Th>
          <Th x={colX.code} w={CODE_W}>학번</Th>
          <Th x={colX.status} w={STATUS_W}>상태</Th>
          <Th x={colX.helper} w={HELPER_W} align="center">도우미</Th>
          <Th x={colX.manage} w={MANAGE_W} align="right">관리</Th>
        </div>

        <div style={{ position: "relative", height: rows.length * ROW_H }}>
          {rows.map((row, index) => {
            const y = index * ROW_H;
            const active = row.status === "active";
            const helperPressing = helperPressAt?.studentId === row.student.id ? helperPressAt.at : null;
            const editPressing =
              actionPressAt?.studentId === row.student.id && actionPressAt.action === "edit" ? actionPressAt.at : null;
            const secondAction: "delete" | "restore" = active ? "delete" : "restore";
            const secondPressing =
              actionPressAt?.studentId === row.student.id && actionPressAt.action === secondAction ? actionPressAt.at : null;
            const btnY = (ROW_H - MANAGE_BTN_H) / 2;
            return (
              <div
                key={row.student.id}
                style={{
                  position: "absolute",
                  left: 0,
                  top: y,
                  width: TABLE_W,
                  height: ROW_H,
                  borderTop: index > 0 ? `1px solid ${tw.gray[100]}` : undefined,
                  opacity: active ? 1 : 0.5,
                  boxSizing: "border-box",
                }}
              >
                <div style={{ position: "absolute", left: colX.name, top: 0, width: NAME_W, height: ROW_H, display: "flex", alignItems: "center", padding: "0 16px", fontSize: 14, fontWeight: 500, color: tw.gray[900], whiteSpace: "nowrap", boxSizing: "border-box" }}>
                  {row.student.name}
                </div>
                <div style={{ position: "absolute", left: colX.grade, top: 0, width: GRADE_W, height: ROW_H, display: "flex", alignItems: "center", padding: "0 0 0 16px", fontSize: 14, color: tw.gray[900] }}>
                  {row.student.grade}
                </div>
                <div style={{ position: "absolute", left: colX.classNumber, top: 0, width: CLASS_W, height: ROW_H, display: "flex", alignItems: "center", padding: "0 0 0 16px", fontSize: 14, color: tw.gray[900] }}>
                  {row.student.classNumber}
                </div>
                <div style={{ position: "absolute", left: colX.number, top: 0, width: NUMBER_W, height: ROW_H, display: "flex", alignItems: "center", padding: "0 0 0 16px", fontSize: 14, color: tw.gray[900] }}>
                  {row.student.number}
                </div>
                <div style={{ position: "absolute", left: colX.code, top: 0, width: CODE_W, height: ROW_H, display: "flex", alignItems: "center", padding: "0 0 0 16px", fontSize: 11, fontFamily: MONO, color: tw.gray[500], whiteSpace: "nowrap" }}>
                  {row.code}
                </div>
                <div style={{ position: "absolute", left: colX.status, top: 0, width: STATUS_W, height: ROW_H, display: "flex", alignItems: "center", padding: "0 0 0 16px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      background: active ? tw.green[100] : tw.gray[100],
                      color: active ? tw.green[700] : tw.gray[500],
                    }}
                  >
                    {active ? "활성" : "비활성"}
                  </span>
                </div>
                <div style={{ position: "absolute", left: colX.helper, top: 0, width: HELPER_W, height: ROW_H, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 44,
                      minHeight: 44,
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      background: row.isHelper ? tw.purple[100] : tw.gray[100],
                      color: !active ? tw.gray[300] : row.isHelper ? tw.purple[700] : tw.gray[400],
                      opacity: active ? 1 : 0.4,
                      scale: String(pressScale(frame, helperPressing)),
                    }}
                  >
                    {row.isHelper ? "도우미" : "-"}
                  </span>
                </div>
                <div style={{ position: "absolute", left: manageContentX, top: btnY, width: MANAGE_BTN_W, height: MANAGE_BTN_H, borderRadius: 4, background: tw.blue[50], color: tw.blue[600], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, whiteSpace: "nowrap", scale: String(pressScale(frame, editPressing)) }}>
                  수정
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: manageContentX + MANAGE_BTN_W + MANAGE_BTN_GAP,
                    top: btnY,
                    width: MANAGE_BTN_W,
                    height: MANAGE_BTN_H,
                    borderRadius: 4,
                    background: active ? tw.red[50] : tw.green[50],
                    color: active ? tw.red[600] : tw.green[600],
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    whiteSpace: "nowrap",
                    scale: String(pressScale(frame, secondPressing)),
                  }}
                >
                  {active ? "삭제" : "복원"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: PAD_X,
          top: TABLE_TOP + tableH,
          width: TABLE_W,
          height: FOOTER_H,
          background: tw.gray[50],
          borderTop: `1px solid ${tw.gray[200]}`,
          borderLeft: `1px solid ${tw.gray[200]}`,
          borderRight: `1px solid ${tw.gray[200]}`,
          borderBottomLeftRadius: 8,
          borderBottomRightRadius: 8,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          fontSize: 13,
          color: tw.gray[500],
          whiteSpace: "nowrap",
          boxSizing: "border-box",
        }}
      >
        총 {rows.length}명{classFilter ? ` (${classFilter}반)` : ""}
      </div>
    </div>
  );
};
