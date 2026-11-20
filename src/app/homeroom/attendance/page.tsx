"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { SESSION_TYPES, SESSION_META, type SessionType } from "@/lib/sessions";

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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const { data, isLoading } = useSWR<ResponseData>(
    `/api/homeroom/monthly-attendance?month=${monthStr}`,
    fetcher
  );

  const students = data?.students ?? [];
  const dates = data?.dates ?? [];
  const classAssignments = data?.assignments ?? [];

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
    const res = await fetch(`/api/homeroom/export-attendance?month=${monthStr}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${year}년 ${month + 1}월_출결.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 학급별 그룹화
  const classesSorted = [...classAssignments].sort(
    (a, b) => a.grade - b.grade || a.classNumber - b.classNumber
  );

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            &larr;
          </button>
          <span className="text-lg font-semibold text-gray-800">
            {year}.{String(month + 1).padStart(2, "0")}
          </span>
          <button onClick={goToday} className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100">
            Now
          </button>
          <button onClick={nextMonth} className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            &rarr;
          </button>
        </div>
        <button
          onClick={handleExport}
          disabled={students.length === 0}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          Excel
        </button>
      </div>

      {/* 범례 토글 */}
      <div className="mb-3">
        <button
          onClick={() => setLegendOpen((v) => !v)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 w-full"
        >
          <span className="flex-1 border-t border-gray-200" />
          <span className="text-[10px] select-none">{legendOpen ? "▲" : "▼"}</span>
          <span className="flex-1 border-t border-gray-200" />
        </button>
        {legendOpen && (
          <div className="mt-2 text-xs text-gray-500 flex flex-col gap-1">
            <div className="flex flex-wrap gap-3">
              <span className="whitespace-nowrap"><span className="text-green-700 font-extrabold text-sm">O</span> 출석</span>
              <span className="whitespace-nowrap"><span className="text-red-700 font-extrabold text-sm">X</span> 무단결석</span>
              <span className="whitespace-nowrap"><span className="text-orange-500 font-extrabold text-sm">△</span> 사유결석</span>
              <span className="whitespace-nowrap"><span className="text-yellow-600 font-extrabold text-sm">방</span> 방과후</span>
              <span className="whitespace-nowrap"><span className="text-gray-400 font-bold">-</span> 미확인</span>
              <span className="whitespace-nowrap"><span className="inline-block w-4 h-3 bg-gray-100 border border-gray-300 rounded-sm align-middle" /> 미참가</span>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-sm text-gray-400">불러오는 중...</div>
      ) : students.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-400">학생이 없습니다.</div>
      ) : (
        classesSorted.map((cls) => {
          const classStudents = students.filter(
            (s) => s.grade === cls.grade && s.classNumber === cls.classNumber
          );
          if (classStudents.length === 0) return null;

          return (
            <div key={`${cls.grade}-${cls.classNumber}`} className="mb-6">
              <h2 className="text-base font-bold text-gray-800 mb-2">
                {cls.grade}학년 {cls.classNumber}반
              </h2>

              <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="text-xs whitespace-nowrap">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gray-50 border-b border-gray-300">
                        <th className="px-3 py-2 text-left font-medium text-gray-600 sticky left-0 bg-gray-50 z-10 min-w-[60px]">
                          이름
                        </th>
                        <th className="px-2 py-2 text-center font-medium text-gray-600 sticky left-[60px] bg-gray-50 z-10 min-w-[36px]">
                          번호
                        </th>
                        {dates.map((date) => {
                          const d = new Date(date);
                          const dayName = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
                          return (
                            <th
                              key={date}
                              colSpan={3}
                              className="px-1 py-2 text-center font-medium text-gray-600 border-l border-gray-300 whitespace-nowrap"
                            >
                              {date.slice(8)}/{dayName}
                            </th>
                          );
                        })}
                        <th className="px-2 py-2 text-center font-medium text-gray-600 border-l border-gray-300 min-w-[48px]">시간</th>
                      </tr>
                      <tr className="bg-gray-50 border-b border-gray-300">
                        <th className="sticky left-0 bg-gray-50 z-10" />
                        <th className="sticky left-[60px] bg-gray-50 z-10" />
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
                      {classStudents.map((student) => {
                        const partByType = new Map(student.participationDays.map((p) => [p.sessionType, p]));
                        const isEntireRowGray = SESSION_TYPES.every((t) => {
                          const part = partByType.get(t);
                          return part ? !part.isParticipating : false;
                        });
                        const rowBg = isEntireRowGray ? "bg-gray-100" : "hover:bg-gray-50";
                        const stickyBg = isEntireRowGray ? "bg-gray-100" : "bg-white";

                        return (
                          <tr key={student.id} className={`border-b border-gray-300 ${rowBg}`}>
                            <td className={`px-3 py-1.5 font-medium sticky left-0 z-10 whitespace-nowrap ${stickyBg} ${isEntireRowGray ? "text-gray-400" : "text-gray-900"}`}>
                              {student.name}
                            </td>
                            <td className={`px-2 py-1.5 text-center sticky left-[60px] z-10 ${stickyBg} ${isEntireRowGray ? "text-gray-400" : "text-gray-600"}`}>
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
                                        className={`px-1 py-1.5 text-center text-sm font-extrabold ${i === 0 ? "border-l border-gray-300" : ""} ${gray ? "bg-gray-100" : ""} ${colorClass}`}
                                      >
                                        {symbol}
                                      </td>
                                    );
                                  })}
                                </React.Fragment>
                              );
                            })}
                            <td className="px-2 py-1.5 text-center text-sm font-bold text-blue-600 border-l border-gray-300">
                              {student.studyHours > 0 ? student.studyHours.toFixed(1) : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                      <tr>
                        <td className="px-3 py-2 text-right font-semibold text-gray-600 text-[10px] sticky left-0 bg-gray-50 z-10">합계</td>
                        <td className="px-2 py-2 sticky left-[60px] bg-gray-50 z-10" />
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
                                  <td key={t} className={`px-0.5 py-2 text-center text-[9px] whitespace-nowrap ${i === 0 ? "border-l border-gray-300" : ""}`}>
                                    <span className="text-green-700 font-bold">{present}</span>
                                    <span className="text-gray-400">/</span>
                                    <span className="text-red-700 font-bold">{absent}</span>
                                    <span className="text-gray-400">/</span>
                                    <span className="text-gray-500">{participating}</span>
                                  </td>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                          <td className="px-2 py-2 text-center text-[10px] font-bold text-blue-600 border-l border-gray-300">
                            {(() => {
                              const avg = classStudents.reduce((s, st) => s + st.studyHours, 0) / classStudents.length;
                              return avg > 0 ? avg.toFixed(1) : "-";
                            })()}
                          </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-300 text-xs text-gray-500">
                  총 {classStudents.length}명 <span className="ml-2 text-[10px] text-gray-400">(합계: 출석/결석/참여)</span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
