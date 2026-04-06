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

function getWeekDates(weekStart: string): string[] {
  const start = new Date(weekStart + "T00:00:00");
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function getStatusBadge(status: string | undefined, isParticipating: boolean, isAfterSchool: boolean, reasonType?: string | null, note?: string | null) {
  if (!isParticipating) {
    return <span className="text-xs text-gray-300">-</span>;
  }
  if (isAfterSchool && (!status || status === "unchecked")) {
    return (
      <span title={note || undefined} className="inline-flex items-center">
        <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
        {note && <span className="ml-0.5 text-[8px] text-orange-500">*</span>}
      </span>
    );
  }
  if (!status || status === "unchecked") {
    return (
      <span title={note || undefined} className="inline-flex items-center">
        <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
        {note && <span className="ml-0.5 text-[8px] text-orange-500">*</span>}
      </span>
    );
  }
  if (status === "present") {
    return (
      <span title={note || undefined} className="inline-flex items-center">
        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
        {note && <span className="ml-0.5 text-[8px] text-orange-500">*</span>}
      </span>
    );
  }
  if (status === "absent") {
    const reasonLabel = reasonType === "academy" ? "학" : reasonType === "afterschool" ? "방" : reasonType === "illness" ? "질" : reasonType === "custom" ? "기" : "";
    return (
      <span title={`${reasonLabel ? reasonLabel + " " : ""}${note || ""}`} className="inline-flex items-center">
        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
        {reasonLabel && <span className="ml-0.5 text-[8px] text-red-400">{reasonLabel}</span>}
        {note && <span className="ml-0.5 text-[8px] text-orange-500">*</span>}
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
  return monday.toISOString().split("T")[0];
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">학생관리 / 주간출석</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            &larr; 이전주
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100"
            >
              이번주
            </button>
          )}
          <button
            onClick={() => setWeekOffset(weekOffset + 1)}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            다음주 &rarr;
          </button>
          {data?.weekStart && data?.weekEnd && (
            <span className="text-sm text-gray-500 ml-2">
              {data.weekStart} ~ {data.weekEnd}
            </span>
          )}
        </div>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> 미확인
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> 출석
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> 결석
        </span>
        <span className="flex items-center gap-1">
          <span className="text-gray-300">-</span> 미참가
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> 방과후
        </span>
        <span className="flex items-center gap-1">
          <span className="text-[8px] text-orange-500">*</span> 비고
        </span>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  rowSpan={2}
                  className="px-3 py-3 text-left font-medium text-gray-600 border-b border-gray-200"
                >
                  이름
                </th>
                <th
                  rowSpan={2}
                  className="px-2 py-3 text-center font-medium text-gray-600 border-b border-gray-200"
                >
                  반
                </th>
                <th
                  rowSpan={2}
                  className="px-2 py-3 text-center font-medium text-gray-600 border-b border-gray-200"
                >
                  번호
                </th>
                {DAY_LABELS.map((label) => (
                  <th
                    key={label}
                    colSpan={2}
                    className="px-1 py-2 text-center font-medium text-gray-600 border-l border-gray-200"
                  >
                    {label}
                  </th>
                ))}
              </tr>
              <tr className="bg-gray-50">
                {DAY_LABELS.map((label) => (
                  <Fragment key={label}>
                    <th
                      className="px-1 py-1 text-center text-xs font-medium text-gray-400 border-l border-gray-200"
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
            <tbody className="divide-y divide-gray-100">
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

                  return (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-900 font-medium whitespace-nowrap">
                        {student.name}
                      </td>
                      <td className="px-2 py-2 text-center text-gray-600">
                        {student.classNumber}
                      </td>
                      <td className="px-2 py-2 text-center text-gray-600">
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

                        const afternoonNote = student.attendanceNotes.find(
                          (n) => n.date === date && n.sessionType === "afternoon"
                        );
                        const nightNote = student.attendanceNotes.find(
                          (n) => n.date === date && n.sessionType === "night"
                        );

                        return (
                          <Fragment key={`${student.id}-${date}`}>
                            <td
                              className="px-1 py-2 text-center border-l border-gray-100"
                            >
                              {getStatusBadge(afternoonAtt?.status, isAfternoonParticipating, isAfternoonAfterSchool, afternoonAtt?.reasonType, afternoonNote?.note)}
                            </td>
                            <td
                              className="px-1 py-2 text-center"
                            >
                              {getStatusBadge(nightAtt?.status, isNightParticipating, isNightAfterSchool, nightAtt?.reasonType, nightNote?.note)}
                            </td>
                          </Fragment>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && students.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
            총 {students.length}명
          </div>
        )}
      </div>
    </div>
  );
}
