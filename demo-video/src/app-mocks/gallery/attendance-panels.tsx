import React from "react";
import type { GalleryEntry } from "./types";
import { ABSENCE_REASON_META, ABSENCE_REQUESTS, studentById } from "../data";
import { WeeklyInfoModalMock } from "../../teacher/mocks/WeeklyInfoModalMock";
import { AbsencePanelMock, SESSION_LABEL } from "../../teacher/mocks/AbsencePanelMock";
import { BulkApproveModalMock, type BulkApproveRow } from "../../teacher/mocks/BulkApproveModalMock";
import { NativeDialogMock } from "../../teacher/mocks/NativeDialogMock";

const PANEL_W = 390;
const PANEL_H = 560;
const PHONE_H = 752;

// 오늘(9/17) 날짜의 대기중 불참신청 3건 — 일괄승인 후보와 동일한 조건.
const BULK_IDS = [1, 2, 3];
const bulkRows: BulkApproveRow[] = ABSENCE_REQUESTS.filter((r) => BULK_IDS.includes(r.id)).map((r) => {
  const s = studentById(r.studentId);
  return {
    student: `${s.name} ${s.grade}학년 ${s.classNumber}반 ${s.number}번`,
    date: r.date,
    session: SESSION_LABEL[r.session],
    reason: ABSENCE_REASON_META[r.reason].label,
    detail: r.detail ?? "",
  };
});

const WeeklyInfoGallery: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, background: "#f1f5f9" }}>
    <WeeklyInfoModalMock width={PANEL_W} height={PHONE_H} />
  </div>
);

const AbsencePanelPendingGallery: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, background: "#f1f5f9" }}>
    <AbsencePanelMock width={PANEL_W} filter="pending" requests={ABSENCE_REQUESTS} bulkCount={3} />
  </div>
);

const BulkApproveGallery: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, background: "#f1f5f9" }}>
    <BulkApproveModalMock width={PANEL_W} height={PHONE_H} rows={bulkRows} />
  </div>
);

const DialogConfirmGallery: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, background: "#f1f5f9" }}>
    <NativeDialogMock width={PANEL_W} height={PHONE_H} kind="confirm" message="이 불참신청을 승인하시겠습니까?" />
  </div>
);

export const ENTRIES: GalleryEntry[] = [
  { id: "WeeklyInfo", component: WeeklyInfoGallery, width: PANEL_W, height: PHONE_H },
  { id: "AbsencePanel-Pending", component: AbsencePanelPendingGallery, width: PANEL_W, height: PANEL_H },
  { id: "BulkApprove", component: BulkApproveGallery, width: PANEL_W, height: PHONE_H },
  { id: "Dialog-Confirm", component: DialogConfirmGallery, width: PANEL_W, height: PHONE_H },
];
