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
  assignments: { grade: number; classNumber: number }[];
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const STATUS_SYMBOL: Record<string, string> = { present: "O", absent: "X", unchecked: "-" };
const STATUS_COLOR: Record<string, string> = {
  present: "text-green-600",
  absent: "text-red-600",
  unchecked: "text-gray-400",
};

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"] as const;

const REASON_LABELS: Record<string, string> = {
  academy: "학", afterschool: "방", illness: "질", custom: "기",
};

const AFTER_SCHOOL_KEYS = ["afterSchoolMon", "afterSchoolTue", "afterSchoolWed", "afterSchoolThu", "afterSchoolFri"] as const;

function getDayKey(dateStr: string): typeof DAY_KEYS[number] {
  const day = new Date(dateStr + "T00:00:00").getDay(); // 1=Mon ... 5=Fri
  return DAY_KEYS[day - 1];
}

export default function MonthlyAttendancePage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

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
            &larr; 이전
          </button>
          <span className="text-lg font-semibold text-gray-800">
            {year}년 {month + 1}월 출결
          </span>
          <button onClick={goToday} className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100">
            이번달
          </button>
          <button onClick={nextMonth} className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            다음 &rarr;
          </button>
        </div>
        <button
          onClick={handleExport}
          disabled={students.length === 0}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          Excel 다운로드
        </button>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
        <span className="text-green-700 font-extrabold text-sm">O</span><span>출석</span>
        <span className="text-red-700 font-extrabold text-sm">X</span><span>결석</span>
        <span className="text-yellow-600 font-extrabold text-sm">방</span><span>방과후</span>
        <span className="text-gray-400 font-bold">-</span><span>미확인</span>
        <span className="inline-block w-4 h-3 bg-gray-100 border border-gray-300 rounded-sm" /><span>미참가</span>
        <span className="text-[10px] text-gray-400">(학:학원 방:방과후 질:질병 기:기타)</span>
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
                  <table className="text-xs">
                    <thead>
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
                              colSpan={2}
                              className="px-1 py-2 text-center font-medium text-gray-600 border-l border-gray-300 whitespace-nowrap"
                            >
                              {date.slice(8)}/{dayName}
                            </th>
                          );
                        })}
                      </tr>
                      <tr className="bg-gray-50 border-b border-gray-300">
                        <th className="sticky left-0 bg-gray-50 z-10" />
                        <th className="sticky left-[60px] bg-gray-50 z-10" />
                        {dates.map((date) => (
                          <React.Fragment key={date}>
                            <th className="px-1 py-1 text-center text-gray-400 border-l border-gray-300">오</th>
                            <th className="px-1 py-1 text-center text-gray-400">야</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents.map((student) => {
                        const afternoonPart = student.participationDays.find(
                          (p) => p.sessionType === "afternoon"
                        );
                        const nightPart = student.participationDays.find(
                          (p) => p.sessionType === "night"
                        );

                        const isAfternoonAllOff = afternoonPart ? !afternoonPart.isParticipating : false;
                        const isNightAllOff = nightPart ? !nightPart.isParticipating : false;
                        const isEntireRowGray = isAfternoonAllOff && isNightAllOff;
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

                              // 비참여이더라도 출결 기록이 있으면 회색 배경 + 출결 표시
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
                                      : att.afternoon === "absent" ? "text-red-700"
                                      : "text-gray-400"
                                  }`}>
                                    {afternoonGray && !afternoonHasData ? "-"
                                      : isAfternoonAfterSchool && (!att.afternoon || att.afternoon === "unchecked") ? "방"
                                      : att.afternoon === "present" ? "O"
                                      : att.afternoon === "absent" ? (att.afternoonReason ? REASON_LABELS[att.afternoonReason] || "X" : "X")
                                      : "-"}
                                  </td>
                                  <td className={`px-1 py-1.5 text-center text-sm font-extrabold ${
                                    nightGray ? "bg-gray-100" : ""
                                  } ${
                                    nightGray && !nightHasData ? "text-gray-300"
                                      : isNightAfterSchool && (!att.night || att.night === "unchecked") ? "text-yellow-600 bg-yellow-50"
                                      : att.night === "present" ? "text-green-700"
                                      : att.night === "absent" ? "text-red-700"
                                      : "text-gray-400"
                                  }`}>
                                    {nightGray && !nightHasData ? "-"
                                      : isNightAfterSchool && (!att.night || att.night === "unchecked") ? "방"
                                      : att.night === "present" ? "O"
                                      : att.night === "absent" ? (att.nightReason ? REASON_LABELS[att.nightReason] || "X" : "X")
                                      : "-"}
                                  </td>
                                </React.Fragment>
                              );
                            })}
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
                          const aPresent = classStudents.filter((s) => s.dates[date]?.afternoon === "present").length;
                          const aAbsent = classStudents.filter((s) => s.dates[date]?.afternoon === "absent").length;
                          const aParticipating = classStudents.filter((s) => {
                            const p = s.participationDays.find((pd) => pd.sessionType === "afternoon");
                            return p ? p.isParticipating && p[dayKey] : true;
                          }).length;
                          const nPresent = classStudents.filter((s) => s.dates[date]?.night === "present").length;
                          const nAbsent = classStudents.filter((s) => s.dates[date]?.night === "absent").length;
                          const nParticipating = classStudents.filter((s) => {
                            const p = s.participationDays.find((pd) => pd.sessionType === "night");
                            return p ? p.isParticipating && p[dayKey] : true;
                          }).length;
                          return (
                            <React.Fragment key={`total-${date}`}>
                              <td className="px-0.5 py-2 text-center text-[9px] border-l border-gray-300">
                                <span className="text-green-700 font-bold">{aPresent}</span>
                                <span className="text-gray-400">/</span>
                                <span className="text-red-700 font-bold">{aAbsent}</span>
                                <span className="text-gray-400">/</span>
                                <span className="text-gray-500">{aParticipating}</span>
                              </td>
                              <td className="px-0.5 py-2 text-center text-[9px]">
                                <span className="text-green-700 font-bold">{nPresent}</span>
                                <span className="text-gray-400">/</span>
                                <span className="text-red-700 font-bold">{nAbsent}</span>
                                <span className="text-gray-400">/</span>
                                <span className="text-gray-500">{nParticipating}</span>
                              </td>
                            </React.Fragment>
                          );
                        })}
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
