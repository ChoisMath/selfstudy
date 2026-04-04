"use client";

import { Fragment } from "react";
import useSWR from "swr";

type AttendanceData = {
  date: string;
  sessionType: "afternoon" | "night";
  status: "unchecked" | "present" | "absent";
};

type ParticipationData = {
  sessionType: "afternoon" | "night";
  isParticipating: boolean;
  mon: boolean;
  tue: boolean;
  wed: boolean;
  thu: boolean;
  fri: boolean;
};

type StudentData = {
  id: number;
  name: string;
  grade: number;
  classNumber: number;
  studentNumber: number;
  attendances: AttendanceData[];
  participationDays: ParticipationData[];
};

type ResponseData = {
  students: StudentData[];
  weekStart: string;
  weekEnd: string;
  assignments: { grade: number; classNumber: number }[];
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const DAY_LABELS = ["월", "화", "수", "목", "금"];

function getWeekDates(weekStart: string): string[] {
  const start = new Date(weekStart + "T00:00:00");
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function getStatusBadge(status: string | undefined, isParticipating: boolean) {
  if (!isParticipating) {
    return <span className="text-xs text-gray-300">-</span>;
  }
  if (!status || status === "unchecked") {
    return <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />;
  }
  if (status === "present") {
    return <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />;
  }
  if (status === "absent") {
    return <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />;
  }
  return null;
}

export default function HomeroomPage() {
  const { data, isLoading } = useSWR<ResponseData>(
    "/api/homeroom/students",
    fetcher
  );

  const students = data?.students ?? [];
  const weekDates = data?.weekStart ? getWeekDates(data.weekStart) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">학생관리 / 주간출석</h1>
        {data?.weekStart && data?.weekEnd && (
          <span className="text-sm text-gray-500">
            {data.weekStart} ~ {data.weekEnd}
          </span>
        )}
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

                        return (
                          <Fragment key={`${student.id}-${date}`}>
                            <td
                              className="px-1 py-2 text-center border-l border-gray-100"
                            >
                              {getStatusBadge(afternoonAtt?.status, isAfternoonParticipating)}
                            </td>
                            <td
                              className="px-1 py-2 text-center"
                            >
                              {getStatusBadge(nightAtt?.status, isNightParticipating)}
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
