"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { SESSION_TYPES, SESSION_META, type SessionType } from "@/lib/sessions";
import { chrome } from "@/components/ui/chrome";
import { formatMonthDay, formatYearMonth } from "@/lib/format-date";

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

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"] as const;

const AFTER_SCHOOL_KEYS = ["afterSchoolMon", "afterSchoolTue", "afterSchoolWed", "afterSchoolThu", "afterSchoolFri"] as const;

function getDayKey(dateStr: string): typeof DAY_KEYS[number] {
  const day = new Date(dateStr + "T00:00:00").getDay(); // 1=Mon ... 5=Fri
  return DAY_KEYS[day - 1];
}

export default function MonthlyAttendancePage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [legendOpen, setLegendOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const { data, error, isLoading } = useSWR<ResponseData>(
    `/api/homeroom/monthly-attendance?month=${monthStr}`,
    fetcher
  );

  const students = data?.students ?? [];
  const dates = data?.dates ?? [];
  const classAssignments = data?.assignments ?? [];
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

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
      const res = await fetch(`/api/homeroom/export-attendance?month=${monthStr}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Excel 파일을 만들지 못했습니다. (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${year}년 ${month + 1}월_출결.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : "Excel 파일을 만들지 못했습니다. 다시 시도하세요.");
    } finally {
      setExporting(false);
    }
  };

  // 학급별 그룹화
  const classesSorted = [...classAssignments].sort(
    (a, b) => a.grade - b.grade || a.classNumber - b.classNumber
  );

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={prevMonth} aria-label="이전 달" className={chrome.iconButton}>
            <span aria-hidden="true">&larr;</span>
          </button>
          <span className="text-lg font-semibold text-ink tabular-nums">
            {formatYearMonth(year, month + 1)}
          </span>
          <button type="button" onClick={nextMonth} aria-label="다음 달" className={chrome.iconButton}>
            <span aria-hidden="true">&rarr;</span>
          </button>
          {!isCurrentMonth && (
            <button type="button" onClick={goToday} className={`${chrome.secondaryButton} px-3 text-xs`}>
              이번 달
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={students.length === 0 || exporting}
          aria-busy={exporting}
          className={chrome.primaryButton}
        >
          {exporting ? "내려받는 중…" : "Excel 내려받기"}
        </button>
      </div>

      <div aria-live="polite" role="status">
        {exportError && <div className={`${chrome.notice("error")} mb-3`}>{exportError}</div>}
      </div>

      {/* 범례 토글 */}
      <div className="mb-3">
        <button
          type="button"
          onClick={() => setLegendOpen((v) => !v)}
          aria-expanded={legendOpen}
          aria-controls="attendance-legend"
          aria-label={legendOpen ? "범례 닫기" : "범례 열기"}
          className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg text-xs text-ink-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="flex-1 border-t border-line" aria-hidden="true" />
          <span className="select-none" aria-hidden="true">범례 {legendOpen ? "▲" : "▼"}</span>
          <span className="flex-1 border-t border-line" aria-hidden="true" />
        </button>
        {legendOpen && (
          <div id="attendance-legend" className="mt-2 flex flex-col gap-1 text-xs text-ink-muted">
            <div className="flex flex-wrap gap-3">
              <span className="whitespace-nowrap"><span className="text-sm font-extrabold text-green-700">O</span> 출석</span>
              <span className="whitespace-nowrap"><span className="text-sm font-extrabold text-red-700">X</span> 무단결석</span>
              <span className="whitespace-nowrap"><span className="text-sm font-extrabold text-orange-500">△</span> 사유결석</span>
              <span className="whitespace-nowrap"><span className="text-sm font-extrabold text-yellow-600">방</span> 방과후</span>
              <span className="whitespace-nowrap"><span className="font-bold text-gray-400">-</span> 미확인</span>
              <span className="whitespace-nowrap"><span className="inline-block h-3 w-4 rounded-sm border border-gray-300 bg-gray-100 align-middle" /> 미참가</span>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-ink-muted">불러오는 중…</div>
      ) : error ? (
        <div role="alert" className={chrome.notice("error")}>{error.message}</div>
      ) : students.length === 0 ? (
        <div className="py-8 text-center text-sm text-ink-muted">학생이 없습니다.</div>
      ) : (
        classesSorted.map((cls) => {
          const classStudents = students.filter(
            (s) => s.grade === cls.grade && s.classNumber === cls.classNumber
          );
          if (classStudents.length === 0) return null;

          return (
            <div key={`${cls.grade}-${cls.classNumber}`} className="mb-6">
              <h2 className="mb-2 text-base font-bold text-ink">
                {cls.grade}학년 {cls.classNumber}반
              </h2>

              <div className={`${chrome.card} overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="whitespace-nowrap text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className={`${chrome.tableHead} border-b border-line`}>
                        <th className="sticky left-0 z-10 min-w-[60px] bg-butter px-3 py-2 text-left font-medium">
                          이름
                        </th>
                        <th className="sticky left-[60px] z-10 min-w-[36px] bg-butter px-2 py-2 text-center font-medium">
                          번호
                        </th>
                        {dates.map((date) => (
                          <th
                            key={date}
                            colSpan={3}
                            className="whitespace-nowrap border-l border-line px-1 py-2 text-center font-medium tabular-nums"
                          >
                            {formatMonthDay(date)}
                          </th>
                        ))}
                        <th className="min-w-[48px] border-l border-line px-2 py-2 text-center font-medium">시간</th>
                      </tr>
                      <tr className={`${chrome.tableHead} border-b border-line`}>
                        <th className="sticky left-0 z-10 bg-butter" />
                        <th className="sticky left-[60px] z-10 bg-butter" />
                        {dates.map((date) => (
                          <React.Fragment key={date}>
                            {SESSION_TYPES.map((t, i) => (
                              <th key={t} className={`whitespace-nowrap px-1 py-1 text-center text-ink-muted/70 ${i === 0 ? "border-l border-line" : ""}`}>
                                {SESSION_META[t].shortLabel}
                              </th>
                            ))}
                          </React.Fragment>
                        ))}
                        <th className="border-l border-line" />
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents.map((student) => {
                        const partByType = new Map(student.participationDays.map((p) => [p.sessionType, p]));
                        const isEntireRowGray = SESSION_TYPES.every((t) => {
                          const part = partByType.get(t);
                          return part ? !part.isParticipating : false;
                        });
                        const rowBg = isEntireRowGray ? "bg-gray-100" : chrome.tableRowHover;
                        const stickyBg = isEntireRowGray ? "bg-gray-100" : "bg-white";

                        return (
                          <tr key={student.id} className={`border-b border-line ${rowBg}`}>
                            <td className={`sticky left-0 z-10 whitespace-nowrap px-3 py-1.5 font-medium ${stickyBg} ${isEntireRowGray ? "text-gray-400" : "text-ink"}`}>
                              {student.name}
                            </td>
                            <td className={`sticky left-[60px] z-10 px-2 py-1.5 text-center tabular-nums ${stickyBg} ${isEntireRowGray ? "text-gray-400" : "text-ink-muted"}`}>
                              {student.studentNumber}
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
                                        title={cell?.reason || undefined}
                                        className={`px-1 py-1.5 text-center text-sm font-extrabold ${i === 0 ? "border-l border-line" : ""} ${gray ? "bg-gray-100" : ""} ${colorClass}`}
                                      >
                                        {symbol}
                                      </td>
                                    );
                                  })}
                                </React.Fragment>
                              );
                            })}
                            <td className="border-l border-line px-2 py-1.5 text-center text-sm font-bold text-primary-deep tabular-nums">
                              {student.studyHours > 0 ? student.studyHours.toFixed(1) : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-line bg-butter">
                      <tr>
                        <td className="sticky left-0 z-10 bg-butter px-3 py-2 text-right text-[10px] font-semibold text-ink-muted">합계</td>
                        <td className="sticky left-[60px] z-10 bg-butter px-2 py-2" />
                        {dates.map((date) => {
                          const dayKey = getDayKey(date);
                          return (
                            <React.Fragment key={`total-${date}`}>
                              {SESSION_TYPES.map((t, i) => {
                                const present = classStudents.filter((s) => s.dates[date]?.[t]?.status === "present").length;
                                const absent = classStudents.filter((s) => s.dates[date]?.[t]?.status === "absent").length;
                                const participating = classStudents.filter((s) => {
                                  const p = s.participationDays.find((pd) => pd.sessionType === t);
                                  return p ? p.isParticipating && p[dayKey] : true;
                                }).length;
                                return (
                                  <td key={t} className={`whitespace-nowrap px-0.5 py-2 text-center text-[9px] tabular-nums ${i === 0 ? "border-l border-line" : ""}`}>
                                    <span className="font-bold text-green-700">{present}</span>
                                    <span className="text-gray-400">/</span>
                                    <span className="font-bold text-red-700">{absent}</span>
                                    <span className="text-gray-400">/</span>
                                    <span className="text-ink-muted">{participating}</span>
                                  </td>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                        <td className="border-l border-line px-2 py-2 text-center text-[10px] font-bold text-primary-deep tabular-nums">
                          {(() => {
                            const avg = classStudents.reduce((s, st) => s + st.studyHours, 0) / classStudents.length;
                            return avg > 0 ? avg.toFixed(1) : "-";
                          })()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="border-t border-line bg-canvas px-4 py-2 text-xs text-ink-muted">
                  총 {classStudents.length}명 <span className="ml-2 text-[10px] text-ink-muted/80">(합계: 출석/결석/참여)</span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
