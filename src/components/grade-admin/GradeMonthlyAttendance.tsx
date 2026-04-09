"use client";

import React, { useState } from "react";
import useSWR from "swr";

type ParticipationData = {
  sessionType: "afternoon" | "night";
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
  dates: Record<string, {
    afternoon?: string;
    night?: string;
    afternoonReason?: string;
    nightReason?: string;
  }>;
  participationDays: ParticipationData[];
};

type ResponseData = {
  students: StudentData[];
  dates: string[];
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"] as const;
const AFTER_SCHOOL_KEYS = ["afterSchoolMon", "afterSchoolTue", "afterSchoolWed", "afterSchoolThu", "afterSchoolFri"] as const;

function getDayKey(dateStr: string): typeof DAY_KEYS[number] {
  const day = new Date(dateStr + "T00:00:00").getDay();
  return DAY_KEYS[day - 1];
}

export default function GradeMonthlyAttendance({ grade }: { grade: number }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [legendOpen, setLegendOpen] = useState(false);

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const { data, isLoading } = useSWR<ResponseData>(
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
    const res = await fetch(`/api/grade-admin/${grade}/export-attendance?month=${monthStr}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${grade}학년_월간출결_${monthStr}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  let prevClassNumber = -1;

  return (
    <div>
      {/* Header: month nav + Excel button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">&larr;</button>
          <span className="text-lg font-semibold text-gray-800">{year}.{String(month + 1).padStart(2, "0")}</span>
          <button onClick={goToday} className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100">Now</button>
          <button onClick={nextMonth} className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">&rarr;</button>
        </div>
        <button onClick={handleExport} disabled={students.length === 0} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50">Excel</button>
      </div>

      {/* Legend toggle */}
      <div className="mb-3">
        <button onClick={() => setLegendOpen((v) => !v)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 w-full">
          <span className="flex-1 border-t border-gray-200" />
          <span className="text-[10px] select-none">{legendOpen ? "▲" : "▼"}</span>
          <span className="flex-1 border-t border-gray-200" />
        </button>
        {legendOpen && (
          <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-3">
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
        <div className="text-center py-8 text-sm text-gray-400">불러오는 중...</div>
      ) : students.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-400">학생이 없습니다.</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-xs whitespace-nowrap">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 border-b border-gray-300">
                  <th className="px-2 py-2 text-center font-medium text-gray-600 sticky left-0 bg-gray-50 z-10 min-w-[36px]">반</th>
                  <th className="px-2 py-2 text-center font-medium text-gray-600 sticky left-[36px] bg-gray-50 z-10 min-w-[36px]">번</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 sticky left-[72px] bg-gray-50 z-10 min-w-[56px]">이름</th>
                  {dates.map((date) => {
                    const d = new Date(date);
                    const dayName = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
                    return (
                      <th key={date} colSpan={2} className="px-1 py-2 text-center font-medium text-gray-600 border-l border-gray-300 whitespace-nowrap">
                        {date.slice(8)}/{dayName}
                      </th>
                    );
                  })}
                </tr>
                <tr className="bg-gray-50 border-b border-gray-300">
                  <th className="sticky left-0 bg-gray-50 z-10" />
                  <th className="sticky left-[36px] bg-gray-50 z-10" />
                  <th className="sticky left-[72px] bg-gray-50 z-10" />
                  {dates.map((date) => (
                    <React.Fragment key={date}>
                      <th className="px-1 py-1 text-center text-gray-400 border-l border-gray-300">오</th>
                      <th className="px-1 py-1 text-center text-gray-400">야</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  prevClassNumber = -1;
                  return students.map((student) => {
                    const showClass = student.classNumber !== prevClassNumber;
                    prevClassNumber = student.classNumber;
                    const isEvenClass = student.classNumber % 2 === 0;
                    const rowBg = isEvenClass ? "bg-[#f0f7ff]" : "bg-white";
                    const stickyBg = isEvenClass ? "bg-[#f0f7ff]" : "bg-white";

                    const afternoonPart = student.participationDays.find((p) => p.sessionType === "afternoon");
                    const nightPart = student.participationDays.find((p) => p.sessionType === "night");

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

                          const isAfternoonParticipating = afternoonPart
                            ? afternoonPart.isParticipating && afternoonPart[dayKey]
                            : true;
                          const isNightParticipating = nightPart
                            ? nightPart.isParticipating && nightPart[dayKey]
                            : true;

                          const isAfternoonAfterSchool = afternoonPart
                            ? afternoonPart.isParticipating && afternoonPart[dayKey] && afternoonPart[AFTER_SCHOOL_KEYS[dayIdx]]
                            : false;
                          const isNightAfterSchool = nightPart
                            ? nightPart.isParticipating && nightPart[dayKey] && nightPart[AFTER_SCHOOL_KEYS[dayIdx]]
                            : false;

                          const afternoonGray = !isAfternoonParticipating;
                          const nightGray = !isNightParticipating;
                          const afternoonHasData = att.afternoon && att.afternoon !== "unchecked";
                          const nightHasData = att.night && att.night !== "unchecked";

                          return (
                            <React.Fragment key={date}>
                              <td className={`px-1 py-1.5 text-center text-sm font-extrabold border-l border-gray-300 ${
                                afternoonGray ? "bg-gray-100" : ""
                              } ${
                                afternoonGray && !afternoonHasData ? "text-gray-300"
                                  : isAfternoonAfterSchool && (!att.afternoon || att.afternoon === "unchecked") ? "text-yellow-600 bg-yellow-50"
                                  : att.afternoon === "present" ? "text-green-700"
                                  : att.afternoon === "absent" && att.afternoonReason ? "text-orange-500"
                                  : att.afternoon === "absent" ? "text-red-700"
                                  : "text-gray-400"
                              }`}>
                                {afternoonGray && !afternoonHasData ? "-"
                                  : isAfternoonAfterSchool && (!att.afternoon || att.afternoon === "unchecked") ? "방"
                                  : att.afternoon === "present" ? "O"
                                  : att.afternoon === "absent" ? (att.afternoonReason ? "△" : "X")
                                  : "-"}
                              </td>
                              <td className={`px-1 py-1.5 text-center text-sm font-extrabold ${
                                nightGray ? "bg-gray-100" : ""
                              } ${
                                nightGray && !nightHasData ? "text-gray-300"
                                  : isNightAfterSchool && (!att.night || att.night === "unchecked") ? "text-yellow-600 bg-yellow-50"
                                  : att.night === "present" ? "text-green-700"
                                  : att.night === "absent" && att.nightReason ? "text-orange-500"
                                  : att.night === "absent" ? "text-red-700"
                                  : "text-gray-400"
                              }`}>
                                {nightGray && !nightHasData ? "-"
                                  : isNightAfterSchool && (!att.night || att.night === "unchecked") ? "방"
                                  : att.night === "present" ? "O"
                                  : att.night === "absent" ? (att.nightReason ? "△" : "X")
                                  : "-"}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-300 text-xs text-gray-500">
            총 {students.length}명
          </div>
        </div>
      )}
    </div>
  );
}
