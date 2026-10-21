"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { SESSION_TYPES, SESSION_META, type SessionType } from "@/lib/sessions";
import { chrome } from "@/components/ui/chrome";
import { formatMonthDay, formatYearMonth, parseKstDate } from "@/lib/format-date";

type ParticipationData = {
  sessionType: SessionType;
  isParticipating: boolean;
  mon: boolean; tue: boolean; wed: boolean; thu: boolean; fri: boolean;
  afterSchoolMon: boolean; afterSchoolTue: boolean; afterSchoolWed: boolean;
  afterSchoolThu: boolean; afterSchoolFri: boolean;
};

type StudentData = {
  id: number;
  name: string;
  grade: number;
  classNumber: number;
  studentNumber: number;
  dates: Record<string, Partial<Record<SessionType, { status: string; reason?: string }>>>;
  participationDays: ParticipationData[];
  studyHours: number;
};

type ResponseData = {
  students: StudentData[];
  dates: string[];
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("월간 출결을 불러오지 못했습니다. 새로고침 후 다시 시도하세요.");
  return res.json();
};
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"] as const;
const AFTER_SCHOOL_KEYS = ["afterSchoolMon", "afterSchoolTue", "afterSchoolWed", "afterSchoolThu", "afterSchoolFri"] as const;

/** "YYYY-MM-DD"(KST) 의 요일 키. KST 정오 = UTC 03:00 이므로 UTC 요일이 곧 KST 요일 */
function getDayKey(dateStr: string): typeof DAY_KEYS[number] {
  const day = parseKstDate(dateStr).getUTCDay();
  return DAY_KEYS[day - 1];
}

export default function GradeMonthlyAttendance({ grade }: { grade: number }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [legendOpen, setLegendOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const { data, error, isLoading } = useSWR<ResponseData>(
    `/api/grade-admin/${grade}/monthly-attendance?month=${monthStr}`,
    fetcher
  );

  const students = data?.students ?? [];
  const dates = data?.dates ?? [];

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch(`/api/grade-admin/${grade}/export-attendance?month=${monthStr}`);
      if (!res.ok) throw new Error("Excel 파일을 만들지 못했습니다. 잠시 후 다시 시도하세요.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${grade}학년_월간출결_${monthStr}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Excel 파일을 내려받지 못했습니다. 다시 시도하세요.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      {/* Header: month nav + Excel button */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button onClick={prevMonth} type="button" aria-label="이전 달" className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl border border-line bg-white px-3 text-sm text-ink cursor-pointer transition-colors hover:bg-butter focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">&larr;</button>
          <span className="text-lg font-semibold text-ink tabular-nums">{formatYearMonth(year, month + 1)}</span>
          <button onClick={goToday} type="button" className="min-h-11 inline-flex items-center rounded-xl bg-peach px-3 text-xs font-semibold text-primary-deep cursor-pointer transition-colors hover:bg-primary-soft/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">이번 달</button>
          <button onClick={nextMonth} type="button" aria-label="다음 달" className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl border border-line bg-white px-3 text-sm text-ink cursor-pointer transition-colors hover:bg-butter focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">&rarr;</button>
        </div>
        <button type="button" onClick={handleExport} disabled={exporting || students.length === 0} className={chrome.secondaryButton}>
          {exporting ? "내려받는 중…" : "Excel"}
        </button>
      </div>

      <div aria-live="polite" className={exportError ? "mb-3" : undefined}>
        {exportError && <div className={chrome.notice("error")}>{exportError}</div>}
      </div>

      {/* Legend toggle */}
      <div className="mb-3">
        <button
          type="button"
          onClick={() => setLegendOpen((v) => !v)}
          aria-label="기호 설명"
          aria-expanded={legendOpen}
          aria-controls="monthly-legend"
          className="flex min-h-11 w-full cursor-pointer items-center gap-1 text-xs text-ink-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
        >
          <span className="flex-1 border-t border-line" />
          <span className="text-[10px] select-none" aria-hidden="true">{legendOpen ? "▲" : "▼"}</span>
          <span className="flex-1 border-t border-line" />
        </button>
        {legendOpen && (
          <div id="monthly-legend" className="mt-2 flex flex-wrap gap-3 text-xs text-ink-muted">
            <span className="whitespace-nowrap"><span className="text-green-700 font-extrabold text-sm">O</span> 출석</span>
            <span className="whitespace-nowrap"><span className="text-red-700 font-extrabold text-sm">X</span> 무단결석</span>
            <span className="whitespace-nowrap"><span className="text-orange-500 font-extrabold text-sm">△</span> 사유결석</span>
            <span className="whitespace-nowrap"><span className="text-yellow-600 font-extrabold text-sm">방</span> 방과후</span>
            <span className="whitespace-nowrap"><span className="text-gray-400 font-bold">-</span> 미확인</span>
            <span className="whitespace-nowrap"><span className="inline-block w-4 h-3 bg-gray-100 border border-gray-300 rounded-sm align-middle" /> 미참가</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-ink-muted">불러오는 중…</div>
      ) : error ? (
        <div role="alert" className={chrome.notice("error")}>{error instanceof Error ? error.message : "월간 출결을 불러오지 못했습니다. 새로고침 후 다시 시도하세요."}</div>
      ) : students.length === 0 ? (
        <div className={`${chrome.card} px-4 py-12 text-center`}>
          <p className="font-semibold text-ink">학생이 없습니다</p>
          <p className="mt-1 text-sm text-ink-muted text-pretty">다른 달로 이동하거나 학생 관리에서 명단을 등록하세요.</p>
        </div>
      ) : (
        <div className={`${chrome.card} overflow-hidden`}>
          <div className="overflow-x-auto table-scroll">
            <table className="text-xs whitespace-nowrap tabular-nums">
              <thead className="sticky top-0 z-20">
                <tr className="bg-gray-50 border-b border-gray-300">
                  <th className="px-2 py-2 text-center font-medium text-gray-600 sticky left-0 bg-gray-50 z-30 min-w-[36px]">반</th>
                  <th className="px-2 py-2 text-center font-medium text-gray-600 sticky left-[36px] bg-gray-50 z-30 min-w-[36px]">번</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 sticky left-[72px] bg-gray-50 z-30 min-w-[56px]">이름</th>
                  {dates.map((date) => (
                    <th key={date} colSpan={3} className="px-1 py-2 text-center font-medium text-gray-600 border-l border-gray-300 whitespace-nowrap">
                      {formatMonthDay(date)}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center font-medium text-gray-600 border-l border-gray-300 min-w-[48px]">시간</th>
                </tr>
                <tr className="bg-gray-50 border-b border-gray-300">
                  <th className="sticky left-0 bg-gray-50 z-30" />
                  <th className="sticky left-[36px] bg-gray-50 z-30" />
                  <th className="sticky left-[72px] bg-gray-50 z-30" />
                  {dates.map((date) => (
                    <React.Fragment key={date}>
                      {SESSION_TYPES.map((t, i) => (
                        <th key={t} className={`px-1 py-1 text-center text-gray-400 whitespace-nowrap ${i === 0 ? "border-l border-gray-300" : ""}`}>
                          {SESSION_META[t].shortLabel}
                        </th>
                      ))}
                    </React.Fragment>
                  ))}
                  <th className="border-l border-gray-300" />
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => {
                  const prevClassNumber = index === 0 ? -1 : students[index - 1].classNumber;
                  const showClass = student.classNumber !== prevClassNumber;
                  const isEvenClass = student.classNumber % 2 === 0;
                  const rowBg = isEvenClass ? "bg-sky/40" : "bg-white";
                  const stickyBg = isEvenClass ? "bg-sky/40" : "bg-white";

                  const partByType = new Map(student.participationDays.map((p) => [p.sessionType, p]));

                  return (
                    <tr key={student.id} className={`border-b border-gray-300 ${rowBg}`}>
                      <td className={`px-2 py-1.5 text-center font-semibold sticky left-0 z-10 ${stickyBg}`}>
                        {showClass ? student.classNumber : ""}
                      </td>
                      <td className={`px-2 py-1.5 text-center sticky left-[36px] z-10 ${stickyBg} text-gray-600`}>
                        {student.studentNumber}
                      </td>
                      <td className={`px-3 py-1.5 font-medium sticky left-[72px] z-10 ${stickyBg} text-gray-900`}>
                        {student.name}
                      </td>
                      {dates.map((date) => {
                        const att = student.dates[date] || {};
                        const dayKey = getDayKey(date);
                        const dayIdx = DAY_KEYS.indexOf(dayKey);
                        return (
                          <React.Fragment key={date}>
                            {SESSION_TYPES.map((t, i) => {
                              const part = partByType.get(t);
                              const cell = att[t];
                              const status = cell?.status;
                              const isParticipating = part ? part.isParticipating && part[dayKey] : true;
                              const isAfterSchool = part
                                ? part.isParticipating && part[dayKey] && part[AFTER_SCHOOL_KEYS[dayIdx]]
                                : false;
                              const gray = !isParticipating;
                              const hasData = !!status && status !== "unchecked";
                              const isAfterSchoolIdle = isAfterSchool && (!status || status === "unchecked");
                              const colorClass = gray && !hasData ? "text-gray-300"
                                : isAfterSchoolIdle ? "text-yellow-600 bg-yellow-50"
                                : status === "present" ? "text-green-700"
                                : status === "absent" && cell?.reason ? "text-orange-500"
                                : status === "absent" ? "text-red-700"
                                : "text-gray-400";
                              const symbol = gray && !hasData ? "-"
                                : isAfterSchoolIdle ? "방"
                                : status === "present" ? "O"
                                : status === "absent" ? (cell?.reason ? "△" : "X")
                                : "-";
                              return (
                                <td
                                  key={t}
                                  className={`px-1 py-1.5 text-center text-sm font-extrabold ${i === 0 ? "border-l border-gray-300" : ""} ${gray ? "bg-gray-100" : ""} ${colorClass}`}
                                >
                                  {symbol}
                                </td>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                      <td className="px-2 py-1.5 text-center text-sm font-bold text-primary border-l border-gray-300">
                        {student.studyHours > 0 ? student.studyHours.toFixed(1) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line bg-butter px-4 py-2 text-xs text-ink-muted">
            총 {students.length}명
          </div>
        </div>
      )}
    </div>
  );
}
