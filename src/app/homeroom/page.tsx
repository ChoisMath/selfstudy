"use client";

import { Fragment, useState } from "react";
import useSWR from "swr";

type AttendanceData = {
  date: string;
  sessionType: "afternoon" | "night";
  status: "unchecked" | "present" | "absent";
  reasonType: string | null;
};

type ParticipationData = {
  sessionType: "afternoon" | "night";
  isParticipating: boolean;
  mon: boolean; tue: boolean; wed: boolean; thu: boolean; fri: boolean;
  afterSchoolMon: boolean; afterSchoolTue: boolean; afterSchoolWed: boolean;
  afterSchoolThu: boolean; afterSchoolFri: boolean;
};

type NoteData = {
  date: string;
  sessionType: "afternoon" | "night";
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

function getStatusBadge(status: string | undefined, isAfterSchool: boolean, reasonType?: string | null) {
  if (isAfterSchool && (!status || status === "unchecked")) {
    return (
      <span className="inline-flex items-center">
        <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" />
      </span>
    );
  }
  if (!status || status === "unchecked") {
    return (
      <span className="inline-flex items-center">
        <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" />
      </span>
    );
  }
  if (status === "present") {
    return (
      <span className="inline-flex items-center">
        <span className="w-3 h-3 rounded-full bg-green-600 inline-block" />
      </span>
    );
  }
  if (status === "absent") {
    const reasonLabel = reasonType === "academy" ? "학" : reasonType === "afterschool" ? "방" : reasonType === "illness" ? "질" : reasonType === "custom" ? "기" : "";
    return (
      <span className="inline-flex items-center">
        <span className="w-3 h-3 rounded-full bg-red-600 inline-block" />
        {reasonLabel && <span className="ml-0.5 text-[8px] text-red-500 font-bold">{reasonLabel}</span>}
      </span>
    );
  }
  return null;
}

function getMonday(offset: number): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + offset * 7);
  return formatLocalDate(monday);
}

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
      <div className="flex items-center justify-between mb-6 gap-2">
        <button
          onClick={() => setWeekOffset(weekOffset - 1)}
          className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex-shrink-0"
        >
          &larr;
        </button>
        <div className="flex items-center justify-center gap-2 flex-1">
          {data?.weekStart && data?.weekEnd && (
            <span className="text-sm text-gray-500 whitespace-nowrap">
              {data.weekStart.slice(5).replace("-", ".")} ~ {data.weekEnd.slice(5).replace("-", ".")}
            </span>
          )}
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="px-3 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100 whitespace-nowrap"
            >
              Now
            </button>
          )}
        </div>
        <button
          onClick={() => setWeekOffset(weekOffset + 1)}
          className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex-shrink-0"
        >
          &rarr;
        </button>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" /> 미확인
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-600 inline-block" /> 출석
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-600 inline-block" /> 결석
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" /> 방과후
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-3 bg-gray-100 border border-gray-300 rounded-sm" /> 미참가
        </span>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-300 sticky top-0 z-10">
              <tr>
                <th
                  rowSpan={2}
                  className="px-3 py-3 text-left font-medium text-gray-600 border-b border-gray-300"
                >
                  이름
                </th>
                <th
                  rowSpan={2}
                  className="px-2 py-3 text-center font-medium text-gray-600 border-b border-gray-300"
                >
                  반
                </th>
                <th
                  rowSpan={2}
                  className="px-2 py-3 text-center font-medium text-gray-600 border-b border-gray-300"
                >
                  번호
                </th>
                {DAY_LABELS.map((label) => (
                  <th
                    key={label}
                    colSpan={2}
                    className="px-1 py-2 text-center font-medium text-gray-600 border-l border-gray-300"
                  >
                    {label}
                  </th>
                ))}
              </tr>
              <tr className="bg-gray-50">
                {DAY_LABELS.map((label) => (
                  <Fragment key={label}>
                    <th
                      className="px-1 py-1 text-center text-xs font-medium text-gray-400 border-l border-gray-300"
                    >
                      오후
                    </th>
                    <th
                      className="px-1 py-1 text-center text-xs font-medium text-gray-400"
                    >
                      야간
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-gray-400">
                    불러오는 중...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-red-500">
                    {error.message}
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-gray-400">
                    학생이 없습니다.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const afternoonPart = student.participationDays.find(
                    (p) => p.sessionType === "afternoon"
                  );
                  const nightPart = student.participationDays.find(
                    (p) => p.sessionType === "night"
                  );

                  const dayKeys = ["mon", "tue", "wed", "thu", "fri"] as const;
                  const afterSchoolKeys = ["afterSchoolMon", "afterSchoolTue", "afterSchoolWed", "afterSchoolThu", "afterSchoolFri"] as const;

                  const isAfternoonAllOff = afternoonPart ? !afternoonPart.isParticipating : false;
                  const isNightAllOff = nightPart ? !nightPart.isParticipating : false;
                  const isEntireRowGray = isAfternoonAllOff && isNightAllOff;

                  // 비고 수집
                  const weekNotes = student.attendanceNotes.filter(
                    (n) => weekDates.includes(n.date)
                  );

                  return (
                    <Fragment key={student.id}>
                      <tr className={`border-b border-gray-300 ${isEntireRowGray ? "bg-gray-100" : "hover:bg-gray-50"}`}>
                        <td className={`px-3 py-2 font-medium whitespace-nowrap ${isEntireRowGray ? "text-gray-400" : "text-gray-900"}`}>
                          {student.name}
                        </td>
                        <td className={`px-2 py-2 text-center ${isEntireRowGray ? "text-gray-400" : "text-gray-600"}`}>
                          {student.classNumber}
                        </td>
                        <td className={`px-2 py-2 text-center ${isEntireRowGray ? "text-gray-400" : "text-gray-600"}`}>
                          {student.studentNumber}
                        </td>
                        {weekDates.map((date, idx) => {
                          const dayKey = dayKeys[idx];
                          const afternoonAtt = student.attendances.find(
                            (a) => a.date === date && a.sessionType === "afternoon"
                          );
                          const nightAtt = student.attendances.find(
                            (a) => a.date === date && a.sessionType === "night"
                          );

                          const isAfternoonParticipating =
                            afternoonPart
                              ? afternoonPart.isParticipating && afternoonPart[dayKey]
                              : true;
                          const isNightParticipating =
                            nightPart
                              ? nightPart.isParticipating && nightPart[dayKey]
                              : true;

                          const isAfternoonAfterSchool = afternoonPart
                            ? afternoonPart.isParticipating && afternoonPart[dayKey] && afternoonPart[afterSchoolKeys[idx]]
                            : false;
                          const isNightAfterSchool = nightPart
                            ? nightPart.isParticipating && nightPart[dayKey] && nightPart[afterSchoolKeys[idx]]
                            : false;

                          const afternoonGray = !isAfternoonParticipating;
                          const nightGray = !isNightParticipating;

                          return (
                            <Fragment key={`${student.id}-${date}`}>
                              <td className={`px-1 py-2 text-center border-l border-gray-300 ${afternoonGray ? "bg-gray-100" : ""}`}>
                                {afternoonAtt?.status && afternoonAtt.status !== "unchecked"
                                  ? getStatusBadge(afternoonAtt.status, isAfternoonAfterSchool, afternoonAtt.reasonType)
                                  : afternoonGray
                                    ? <span className="text-xs text-gray-300">-</span>
                                    : getStatusBadge(afternoonAtt?.status, isAfternoonAfterSchool, afternoonAtt?.reasonType)}
                              </td>
                              <td className={`px-1 py-2 text-center ${nightGray ? "bg-gray-100" : ""}`}>
                                {nightAtt?.status && nightAtt.status !== "unchecked"
                                  ? getStatusBadge(nightAtt.status, isNightAfterSchool, nightAtt.reasonType)
                                  : nightGray
                                    ? <span className="text-xs text-gray-300">-</span>
                                    : getStatusBadge(nightAtt?.status, isNightAfterSchool, nightAtt?.reasonType)}
                              </td>
                            </Fragment>
                          );
                        })}
                      </tr>
                      {weekNotes.length > 0 && (
                        <tr className={isEntireRowGray ? "bg-gray-100" : ""}>
                          <td colSpan={13} className="px-3 py-1 text-xs text-orange-600 bg-orange-50/50">
                            {weekNotes.map((n, i) => {
                              const dayIdx = weekDates.indexOf(n.date);
                              const dayLabel = dayIdx >= 0 ? DAY_LABELS[dayIdx] : "";
                              const sessionLabel = n.sessionType === "afternoon" ? "오후" : "야간";
                              return (
                                <span key={i} className="mr-3">
                                  <span className="font-medium">[{dayLabel} {sessionLabel}]</span> {n.note}
                                </span>
                              );
                            })}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
            {!isLoading && students.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={3} className="px-2 py-2.5 text-right font-semibold text-gray-600 text-xs">합계</td>
                  {weekDates.map((date, idx) => {
                    const dayKeys = ["mon", "tue", "wed", "thu", "fri"] as const;
                    const dayKey = dayKeys[idx];
                    const afternoonPresent = students.filter((s) => {
                      const att = s.attendances.find((a) => a.date === date && a.sessionType === "afternoon");
                      return att?.status === "present";
                    }).length;
                    const afternoonAbsent = students.filter((s) => {
                      const att = s.attendances.find((a) => a.date === date && a.sessionType === "afternoon");
                      return att?.status === "absent";
                    }).length;
                    const afternoonParticipating = students.filter((s) => {
                      const part = s.participationDays.find((p) => p.sessionType === "afternoon");
                      return part ? part.isParticipating && part[dayKey] : true;
                    }).length;
                    const nightPresent = students.filter((s) => {
                      const att = s.attendances.find((a) => a.date === date && a.sessionType === "night");
                      return att?.status === "present";
                    }).length;
                    const nightAbsent = students.filter((s) => {
                      const att = s.attendances.find((a) => a.date === date && a.sessionType === "night");
                      return att?.status === "absent";
                    }).length;
                    const nightParticipating = students.filter((s) => {
                      const part = s.participationDays.find((p) => p.sessionType === "night");
                      return part ? part.isParticipating && part[dayKey] : true;
                    }).length;
                    return (
                      <Fragment key={`total-${date}`}>
                        <td className="px-1 py-2.5 text-center text-[10px] border-l border-gray-300">
                          <span className="text-green-700 font-bold">{afternoonPresent}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-red-700 font-bold">{afternoonAbsent}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-gray-500">{afternoonParticipating}</span>
                        </td>
                        <td className="px-1 py-2.5 text-center text-[10px]">
                          <span className="text-green-700 font-bold">{nightPresent}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-red-700 font-bold">{nightAbsent}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-gray-500">{nightParticipating}</span>
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {!isLoading && students.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-300 text-sm text-gray-500">
            총 {students.length}명 <span className="ml-2 text-xs text-gray-400">(합계: 출석/결석/참여)</span>
          </div>
        )}
      </div>
    </div>
  );
}
