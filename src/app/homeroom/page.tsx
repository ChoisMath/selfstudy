"use client";

import { Fragment, useState } from "react";
import useSWR from "swr";
import { SESSION_TYPES, SESSION_META, type SessionType } from "@/lib/sessions";
import { reasonLabel } from "@/lib/absence-reasons";
import { chrome } from "@/components/ui/chrome";
import { formatMonthDayDots } from "@/lib/format-date";

type AttendanceData = {
  date: string;
  sessionType: SessionType;
  status: "unchecked" | "present" | "absent";
  reasonType: string | null;
  reasonDetail: string | null;
};

type ParticipationData = {
  sessionType: SessionType;
  isParticipating: boolean;
  mon: boolean; tue: boolean; wed: boolean; thu: boolean; fri: boolean;
  afterSchoolMon: boolean; afterSchoolTue: boolean; afterSchoolWed: boolean;
  afterSchoolThu: boolean; afterSchoolFri: boolean;
};

type NoteData = {
  date: string;
  sessionType: SessionType;
  note: string;
};

type StudentData = {
  id: number;
  name: string;
  grade: number;
  classNumber: number;
  studentNumber: number;
  attendances: AttendanceData[];
  participationDays: ParticipationData[];
  attendanceNotes: NoteData[];
};

type ResponseData = {
  students: StudentData[];
  weekStart: string;
  weekEnd: string;
  assignments: { grade: number; classNumber: number }[];
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `${res.status} 오류가 발생했습니다.`);
  }
  return res.json();
};

const DAY_LABELS = ["월", "화", "수", "목", "금"];

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekDates(weekStart: string): string[] {
  const start = new Date(weekStart + "T00:00:00");
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return formatLocalDate(d);
  });
}

/** 출결 기호(색은 교사가 의존하는 상태색 — 유지) */
function StatusCell({ status, isAfterSchool, hasReason }: { status?: string; isAfterSchool: boolean; hasReason: boolean }) {
  if (isAfterSchool && (!status || status === "unchecked")) {
    return <span className="text-sm font-extrabold text-yellow-600">방</span>;
  }
  if (!status || status === "unchecked") {
    return <span className="text-sm font-extrabold text-gray-400">-</span>;
  }
  if (status === "present") {
    return <span className="text-sm font-extrabold text-green-700">O</span>;
  }
  if (status === "absent") {
    return <span className={`text-sm font-extrabold ${hasReason ? "text-orange-500" : "text-red-700"}`}>{hasReason ? "△" : "X"}</span>;
  }
  return null;
}

/** 사유·비고가 있는 셀: 셀 전체가 44px 버튼이며 호버·포커스·탭으로 말풍선을 연다 */
function TooltipCell({ label, tooltip, children }: { label: string; tooltip: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      aria-label={`${label}: ${tooltip}`}
      aria-expanded={open}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
      className="relative inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-0.5 rounded-lg px-1 hover:bg-butter focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 max-w-[16rem] -translate-x-1/2 whitespace-normal break-words rounded bg-ink px-2 py-1 text-left text-[11px] font-normal text-white"
        >
          {tooltip}
        </span>
      )}
    </button>
  );
}

function getMonday(offset: number): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + offset * 7);
  return formatLocalDate(monday);
}

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"] as const;
const AFTER_SCHOOL_KEYS = ["afterSchoolMon", "afterSchoolTue", "afterSchoolWed", "afterSchoolThu", "afterSchoolFri"] as const;

export default function HomeroomPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekParam = weekOffset === 0 ? "" : `?week=${getMonday(weekOffset)}`;
  const { data, error, isLoading } = useSWR<ResponseData>(
    `/api/homeroom/students${weekParam}`,
    fetcher
  );

  const students = data?.students ?? [];
  const weekDates = data?.weekStart ? getWeekDates(data.weekStart) : [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-2">
        <button type="button" onClick={() => setWeekOffset(weekOffset - 1)} aria-label="이전 주" className={chrome.iconButton}>
          <span aria-hidden="true">&larr;</span>
        </button>
        <div className="flex flex-1 flex-wrap items-center justify-center gap-2">
          {data?.weekStart && data?.weekEnd && (
            <span className="whitespace-nowrap text-sm text-ink-muted tabular-nums">
              {formatMonthDayDots(data.weekStart)} ~ {formatMonthDayDots(data.weekEnd)}
            </span>
          )}
          {weekOffset !== 0 && (
            <button type="button" onClick={() => setWeekOffset(0)} className={`${chrome.secondaryButton} px-3 text-xs`}>
              이번 주
            </button>
          )}
        </div>
        <button type="button" onClick={() => setWeekOffset(weekOffset + 1)} aria-label="다음 주" className={chrome.iconButton}>
          <span aria-hidden="true">&rarr;</span>
        </button>
      </div>

      {/* 범례 */}
      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
        <span className="flex items-center gap-1">
          <span className="text-sm font-extrabold text-green-700">O</span> 출석
        </span>
        <span className="flex items-center gap-1">
          <span className="text-sm font-extrabold text-red-700">X</span> 무단결석
        </span>
        <span className="flex items-center gap-1">
          <span className="text-sm font-extrabold text-orange-500">△</span> 사유결석
        </span>
        <span className="flex items-center gap-1">
          <span className="text-sm font-extrabold text-yellow-600">방</span> 방과후
        </span>
        <span className="flex items-center gap-1">
          <span className="font-bold text-gray-400">-</span> 미확인
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-4 rounded-sm border border-gray-300 bg-gray-100" /> 미참가
        </span>
      </div>

      <div className={`${chrome.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className={`${chrome.tableHead} sticky top-0 z-10 border-b border-line`}>
              <tr>
                <th rowSpan={2} className="border-b border-line px-3 py-3 text-left font-medium">
                  이름
                </th>
                <th rowSpan={2} className="border-b border-line px-2 py-3 text-center font-medium">
                  반
                </th>
                <th rowSpan={2} className="border-b border-line px-2 py-3 text-center font-medium">
                  번호
                </th>
                {DAY_LABELS.map((label) => (
                  <th key={label} colSpan={3} className="border-l border-line px-1 py-2 text-center font-medium">
                    {label}
                  </th>
                ))}
              </tr>
              <tr>
                {DAY_LABELS.map((label) => (
                  <Fragment key={label}>
                    {SESSION_TYPES.map((t, i) => (
                      <th key={t} className={`whitespace-nowrap px-1 py-1 text-center text-xs font-medium text-ink-muted/70 ${i === 0 ? "border-l border-line" : ""}`}>
                        {SESSION_META[t].shortLabel}
                      </th>
                    ))}
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={18} className="px-4 py-8 text-center text-ink-muted">
                    불러오는 중…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={18} className="px-4 py-6">
                    <div role="alert" className={chrome.notice("error")}>{error.message}</div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={18} className="px-4 py-8 text-center text-ink-muted">
                    학생이 없습니다.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const partByType = new Map(student.participationDays.map((p) => [p.sessionType, p]));

                  const isEntireRowGray = SESSION_TYPES.every((t) => {
                    const part = partByType.get(t);
                    return part ? !part.isParticipating : false;
                  });

                  // 비고 수집
                  const weekNotes = student.attendanceNotes.filter(
                    (n) => weekDates.includes(n.date)
                  );

                  return (
                    <Fragment key={student.id}>
                      <tr className={`border-b border-line ${isEntireRowGray ? "bg-gray-100" : chrome.tableRowHover}`}>
                        <td className={`whitespace-nowrap px-3 py-2 font-medium ${isEntireRowGray ? "text-gray-400" : "text-ink"}`}>
                          {student.name}
                        </td>
                        <td className={`px-2 py-2 text-center tabular-nums ${isEntireRowGray ? "text-gray-400" : "text-ink-muted"}`}>
                          {student.classNumber}
                        </td>
                        <td className={`px-2 py-2 text-center tabular-nums ${isEntireRowGray ? "text-gray-400" : "text-ink-muted"}`}>
                          {student.studentNumber}
                        </td>
                        {weekDates.map((date, idx) => {
                          const dayKey = DAY_KEYS[idx];
                          return (
                            <Fragment key={`${student.id}-${date}`}>
                              {SESSION_TYPES.map((t, i) => {
                                const part = partByType.get(t);
                                const att = student.attendances.find((a) => a.date === date && a.sessionType === t);
                                const isParticipating = part ? part.isParticipating && part[dayKey] : true;
                                const isAfterSchool = part
                                  ? part.isParticipating && part[dayKey] && part[AFTER_SCHOOL_KEYS[idx]]
                                  : false;
                                const gray = !isParticipating;
                                const hasData = att?.status && att.status !== "unchecked";
                                const note = weekNotes.find((n) => n.date === date && n.sessionType === t);
                                const hasReason = att?.status === "absent" && !!att.reasonType;
                                const reasonText = hasReason
                                  ? `${reasonLabel(att!.reasonType!)}${att!.reasonDetail ? `: ${att!.reasonDetail}` : ""}`
                                  : null;
                                const tooltip = [reasonText, note ? `비고: ${note.note}` : null].filter(Boolean).join(" · ");
                                const symbol = gray && !hasData
                                  ? <span className="text-xs text-gray-300">-</span>
                                  : <StatusCell status={att?.status} isAfterSchool={isAfterSchool} hasReason={hasReason} />;
                                return (
                                  <td key={t} className={`p-0 text-center ${i === 0 ? "border-l border-line" : ""} ${gray && !hasData ? "bg-gray-100" : ""}`}>
                                    {tooltip ? (
                                      <TooltipCell label={`${student.name} ${DAY_LABELS[idx]} ${SESSION_META[t].shortLabel}`} tooltip={tooltip}>
                                        {symbol}
                                        {note && <span aria-hidden="true" className="align-top text-xs font-bold text-orange-500">*</span>}
                                      </TooltipCell>
                                    ) : (
                                      <span className="inline-flex min-h-11 items-center justify-center px-1">{symbol}</span>
                                    )}
                                  </td>
                                );
                              })}
                            </Fragment>
                          );
                        })}
                      </tr>
                    </Fragment>
                  );
                })
              )}
            </tbody>
            {!isLoading && students.length > 0 && (
              <tfoot className="border-t-2 border-line bg-butter">
                <tr>
                  <td colSpan={3} className="px-2 py-2.5 text-right text-xs font-semibold text-ink-muted">합계</td>
                  {weekDates.map((date, idx) => {
                    const dayKey = DAY_KEYS[idx];
                    return (
                      <Fragment key={`total-${date}`}>
                        {SESSION_TYPES.map((t, i) => {
                          const present = students.filter((s) => s.attendances.find((a) => a.date === date && a.sessionType === t)?.status === "present").length;
                          const absent = students.filter((s) => s.attendances.find((a) => a.date === date && a.sessionType === t)?.status === "absent").length;
                          const participating = students.filter((s) => {
                            const part = s.participationDays.find((p) => p.sessionType === t);
                            return part ? part.isParticipating && part[dayKey] : true;
                          }).length;
                          return (
                            <td key={t} className={`whitespace-nowrap px-1 py-2.5 text-center text-[10px] tabular-nums ${i === 0 ? "border-l border-line" : ""}`}>
                              <span className="font-bold text-green-700">{present}</span>
                              <span className="text-gray-400">/</span>
                              <span className="font-bold text-red-700">{absent}</span>
                              <span className="text-gray-400">/</span>
                              <span className="text-ink-muted">{participating}</span>
                            </td>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {!isLoading && students.length > 0 && (
          <div className="border-t border-line bg-canvas px-4 py-3 text-sm text-ink-muted">
            총 {students.length}명 <span className="ml-2 text-xs text-ink-muted/80">(합계: 출석/결석/참여)</span>
          </div>
        )}
      </div>
    </div>
  );
}
