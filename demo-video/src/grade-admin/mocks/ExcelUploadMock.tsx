// src/components/admin-shared/ExcelUploadModal.tsx 이식 — 템플릿 다운로드·드롭존·업로드·결과표 4단계.
// `fixed inset-0 bg-black/40 flex items-center justify-center`(136행) 배경 위에 max-w-lg(512px, 137행) 다이얼로그.
// 단계는 프레임이 아니라 `step` prop(순수 표시)으로 전환한다 — initial(148-205행 빈 드롭존)
// → selected(179-195행 파일명) → uploading(213행 disabled+"업로드 중...") → result(224-264행 결과표).
import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import type { Rect } from "../../app-mocks/layout";
import { pressScale } from "../../app-mocks/primitives";
import { tw } from "../../app-mocks/tw";
import { FONT } from "../../fonts";
import type { ExcelFailedRow } from "../data";

export type ExcelUploadStep = "initial" | "selected" | "uploading" | "result";

const DIALOG_W = 512; // max-w-lg(137행)
const HEADER_H = 60; // px-6 py-4(139행) + text-lg(140행) 근사
const CLOSE_SIZE = 44; // 141-146행 히트 영역(컨트롤러 근사, 원본은 텍스트 버튼)
const BODY_PAD_X = 24; // px-6(149행)
const BODY_PAD_Y = 20; // py-5(149행)
const GAP_Y = 16; // space-y-4(149행)

const TEMPLATE_BTN_H = 40; // px-4 py-2.5(151-156행) 근사
const DROPZONE_EMPTY_H = 140; // p-8(159-205행) + 아이콘·문구 2줄 근사
const DROPZONE_FILE_H = 96; // 파일 선택 시 한 줄(179-195행) 근사
const UPLOAD_BTN_H = 40; // px-4 py-2.5(208-214행) 근사

const RESULT_GAP_Y = 8; // space-y-2(225행)
const RESULT_SUMMARY_H = 20; // text-sm(226-234행) 근사
const RESULT_THEAD_H = 26; // sticky top-0(240행) 근사
const RESULT_ROW_H = 24; // px-3 py-1.5(251-258행) 근사
const RESULT_ROW_COL = 64; // w-16(242행)

const dropzoneH = (step: ExcelUploadStep) => (step === "initial" ? DROPZONE_EMPTY_H : DROPZONE_FILE_H);

const resultTableH = (rows: ExcelFailedRow[]) => RESULT_THEAD_H + rows.length * RESULT_ROW_H;

const dialogHeight = (step: ExcelUploadStep, rows: ExcelFailedRow[]) => {
  let bodyH = BODY_PAD_Y * 2 + TEMPLATE_BTN_H + GAP_Y + dropzoneH(step) + GAP_Y + UPLOAD_BTN_H;
  if (step === "result") {
    bodyH += GAP_Y + RESULT_SUMMARY_H + RESULT_GAP_Y + resultTableH(rows);
  }
  return HEADER_H + bodyH;
};

export const excelRect = (
  key: "close" | "downloadTemplate" | "dropzone" | "uploadButton" | "resultTable" | `failedRow_${number}`,
  width: number,
  height: number,
  step: ExcelUploadStep,
  rows: ExcelFailedRow[],
): Rect => {
  const dialogX = (width - DIALOG_W) / 2;
  const dialogH = dialogHeight(step, rows);
  const dialogY = Math.max(0, (height - dialogH) / 2);
  const x0 = dialogX + BODY_PAD_X;
  const contentW = DIALOG_W - BODY_PAD_X * 2;
  if (key === "close") {
    return { x: dialogX + DIALOG_W - 24 - CLOSE_SIZE / 2, y: dialogY + HEADER_H / 2 - CLOSE_SIZE / 2, w: CLOSE_SIZE, h: CLOSE_SIZE };
  }
  let y = dialogY + HEADER_H + BODY_PAD_Y;
  if (key === "downloadTemplate") return { x: x0, y, w: contentW, h: TEMPLATE_BTN_H };
  y += TEMPLATE_BTN_H + GAP_Y;
  if (key === "dropzone") return { x: x0, y, w: contentW, h: dropzoneH(step) };
  y += dropzoneH(step) + GAP_Y;
  if (key === "uploadButton") return { x: x0, y, w: contentW, h: UPLOAD_BTN_H };
  y += UPLOAD_BTN_H + GAP_Y;
  y += RESULT_SUMMARY_H + RESULT_GAP_Y;
  if (key === "resultTable") return { x: x0, y, w: contentW, h: resultTableH(rows) };
  const index = Number(key.slice("failedRow_".length));
  return { x: x0, y: y + RESULT_THEAD_H + index * RESULT_ROW_H, w: contentW, h: RESULT_ROW_H };
};

export const ExcelUploadMock: React.FC<{
  width: number;
  height: number;
  grade: number;
  step: ExcelUploadStep;
  fileName?: string;
  result?: { success: number; failed: number; rows: ExcelFailedRow[] };
  openAt?: number;
  downloadPressAt?: number;
  uploadPressAt?: number;
}> = ({ width, height, grade, step, fileName, result, openAt, downloadPressAt, uploadPressAt }) => {
  const frame = useCurrentFrame();
  if (openAt !== undefined && frame < openAt) return null;
  const enter = openAt !== undefined ? tween(frame, [openAt, openAt + 10], [0, 1]) : 1;

  const rows = result?.rows ?? [];
  const dialogX = (width - DIALOG_W) / 2;
  const dialogH = dialogHeight(step, rows);
  const dialogY = Math.max(0, (height - dialogH) / 2);
  const contentW = DIALOG_W - BODY_PAD_X * 2;
  const hasFile = step !== "initial";
  const uploading = step === "uploading";
  const showResult = step === "result" && result;

  let y = HEADER_H + BODY_PAD_Y;
  const templateY = y;
  y += TEMPLATE_BTN_H + GAP_Y;
  const dropzoneY = y;
  const dzH = dropzoneH(step);
  y += dzH + GAP_Y;
  const uploadY = y;
  y += UPLOAD_BTN_H + GAP_Y;
  const summaryY = y;
  const tableY = summaryY + RESULT_SUMMARY_H + RESULT_GAP_Y;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width, height, overflow: "hidden", fontFamily: FONT }}>
      <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${0.4 * enter})` }} />
      <div
        style={{
          position: "absolute",
          left: dialogX,
          top: dialogY,
          width: DIALOG_W,
          height: dialogH,
          background: tw.white,
          borderRadius: 8,
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          boxSizing: "border-box",
          opacity: enter,
          scale: String(0.95 + 0.05 * enter),
        }}
      >
        {/* 헤더(139-147행) */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: DIALOG_W,
            height: HEADER_H,
            borderBottom: `1px solid ${tw.gray[200]}`,
            boxSizing: "border-box",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: tw.gray[900], whiteSpace: "nowrap" }}>
            {grade}학년 학생 Excel 일괄 업로드
          </div>
          <div style={{ color: tw.gray[400], fontSize: 20, lineHeight: 1 }}>&times;</div>
        </div>

        {/* 템플릿 다운로드(151-156행) */}
        <div
          style={{
            position: "absolute",
            left: BODY_PAD_X,
            top: templateY,
            width: contentW,
            height: TEMPLATE_BTN_H,
            border: `1px solid ${tw.blue[200]}`,
            borderRadius: 6,
            background: tw.blue[50],
            color: tw.blue[700],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            whiteSpace: "nowrap",
            boxSizing: "border-box",
            scale: String(pressScale(frame, downloadPressAt)),
          }}
        >
          템플릿 다운로드
        </div>

        {/* 드롭존(159-205행) */}
        <div
          style={{
            position: "absolute",
            left: BODY_PAD_X,
            top: dropzoneY,
            width: contentW,
            height: dzH,
            border: `2px dashed ${hasFile ? tw.green[300] : tw.gray[300]}`,
            borderRadius: 8,
            background: hasFile ? tw.green[50] : tw.white,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {hasFile ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: tw.green[700], whiteSpace: "nowrap" }}>{fileName}</span>
              <span style={{ color: tw.gray[400], fontSize: 16, lineHeight: 1 }}>&times;</span>
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 30, color: tw.gray[300], marginBottom: 8 }}>📄</div>
              <div style={{ fontSize: 13, color: tw.gray[500], whiteSpace: "nowrap" }}>파일을 드래그하거나 클릭하여 선택하세요</div>
              <div style={{ fontSize: 11, color: tw.gray[400], marginTop: 4, whiteSpace: "nowrap" }}>.xlsx, .xls 파일</div>
            </div>
          )}
        </div>

        {/* 업로드 버튼(208-214행) */}
        <div
          style={{
            position: "absolute",
            left: BODY_PAD_X,
            top: uploadY,
            width: contentW,
            height: UPLOAD_BTN_H,
            borderRadius: 6,
            background: tw.green[600], // ExcelUploadModal.tsx:211 bg-green-600(비활성 포함, disabled:opacity-50 만 적용)
            color: tw.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            whiteSpace: "nowrap",
            boxSizing: "border-box",
            opacity: !hasFile || uploading ? 0.5 : 1,
            scale: String(pressScale(frame, uploadPressAt)),
          }}
        >
          {uploading ? "업로드 중..." : "업로드"}
        </div>

        {/* 결과(224-264행) */}
        {showResult ? (
          <>
            <div style={{ position: "absolute", left: BODY_PAD_X, top: summaryY, display: "flex", gap: 12, fontSize: 13 }}>
              <span style={{ color: tw.green[700], fontWeight: 500, whiteSpace: "nowrap" }}>성공: {result.success}건</span>
              {result.failed > 0 ? (
                <span style={{ color: tw.red[700], fontWeight: 500, whiteSpace: "nowrap" }}>실패: {result.failed}건</span>
              ) : null}
            </div>
            {rows.length > 0 ? (
              <div
                style={{
                  position: "absolute",
                  left: BODY_PAD_X,
                  top: tableY,
                  width: contentW,
                  border: `1px solid ${tw.red[200]}`,
                  borderRadius: 8,
                  overflow: "hidden",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ position: "relative", height: RESULT_THEAD_H, background: tw.red[50], borderBottom: `1px solid ${tw.red[200]}` }}>
                  <div style={{ position: "absolute", left: 0, top: 0, width: RESULT_ROW_COL, height: RESULT_THEAD_H, display: "flex", alignItems: "center", padding: "0 0 0 12px", fontSize: 11, fontWeight: 500, color: tw.red[700], whiteSpace: "nowrap", boxSizing: "border-box" }}>
                    행
                  </div>
                  <div style={{ position: "absolute", left: RESULT_ROW_COL, top: 0, width: contentW - RESULT_ROW_COL, height: RESULT_THEAD_H, display: "flex", alignItems: "center", fontSize: 11, fontWeight: 500, color: tw.red[700], whiteSpace: "nowrap" }}>
                    사유
                  </div>
                </div>
                {rows.map((row, i) => (
                  <div key={`${row.row}-${i}`} style={{ position: "relative", height: RESULT_ROW_H, borderTop: i > 0 ? `1px solid ${tw.red[100]}` : undefined, boxSizing: "border-box" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, width: RESULT_ROW_COL, height: RESULT_ROW_H, display: "flex", alignItems: "center", padding: "0 0 0 12px", fontSize: 12, color: tw.gray[700] }}>
                      {row.row}
                    </div>
                    <div style={{ position: "absolute", left: RESULT_ROW_COL, top: 0, width: contentW - RESULT_ROW_COL, height: RESULT_ROW_H, display: "flex", alignItems: "center", fontSize: 12, color: tw.gray[700], whiteSpace: "nowrap" }}>
                      {row.reason}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
};
