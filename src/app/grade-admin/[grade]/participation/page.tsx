"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";

type DaySettings = {
  isParticipating: boolean;
  mon: boolean;
  tue: boolean;
  wed: boolean;
  thu: boolean;
  fri: boolean;
};

type StudentParticipation = {
  id: number;
  name: string;
  classNumber: number;
  studentNumber: number;
  afternoon: DaySettings;
  night: DaySettings;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"] as const;
const DAY_LABELS = ["월", "화", "수", "목", "금"] as const;

export default function ParticipationPage() {
  const params = useParams();
  const grade = parseInt(params.grade as string, 10);
  const [classFilter, setClassFilter] = useState<string>("");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const apiUrl = `/api/grade-admin/${grade}/participation-days`;
  const { data, mutate, isLoading } = useSWR<{
    students: StudentParticipation[];
  }>(apiUrl, fetcher);

  const students = data?.students ?? [];

  const filteredStudents = classFilter
    ? students.filter((s) => s.classNumber === parseInt(classFilter, 10))
    : students;

  const classNumbers = Array.from(
    new Set(students.map((s) => s.classNumber))
  ).sort((a, b) => a - b);

  const handleUpdate = useCallback(
    async (
      studentId: number,
      sessionType: "afternoon" | "night",
      field: string,
      value: boolean
    ) => {
      const student = students.find((s) => s.id === studentId);
      if (!student) return;

      const current = sessionType === "afternoon" ? student.afternoon : student.night;
      const updated = { ...current, [field]: value };

      // 낙관적 업데이트
      const key = `${studentId}-${sessionType}-${field}`;
      setSavingKey(key);

      mutate(
        {
          students: students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  [sessionType]: updated,
                }
              : s
          ),
        },
        false
      );

      try {
        const res = await fetch(apiUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            sessionType,
            ...updated,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "저장에 실패했습니다.");
        }

        mutate();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "저장에 실패했습니다.";
        alert(message);
        mutate();
      } finally {
        setSavingKey(null);
      }
    },
    [students, apiUrl, mutate]
  );

  if (isNaN(grade) || grade < 1 || grade > 3) {
    return (
      <div className="text-center py-12 text-gray-500">
        잘못된 학년입니다.
      </div>
    );
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {grade}학년 참여설정
        </h1>
        <div className="flex items-center gap-3">
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체 반</option>
            {classNumbers.map((n) => (
              <option key={n} value={n}>
                {n}반
              </option>
            ))}
          </select>
          {savingKey && (
            <span className="text-xs text-gray-400">저장 중...</span>
          )}
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  rowSpan={2}
                  className="px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200"
                >
                  이름
                </th>
                <th
                  rowSpan={2}
                  className="px-3 py-3 text-center font-medium text-gray-600 border-b border-gray-200"
                >
                  반
                </th>
                <th
                  rowSpan={2}
                  className="px-3 py-3 text-center font-medium text-gray-600 border-b border-gray-200"
                >
                  번호
                </th>
                <th
                  colSpan={6}
                  className="px-3 py-2 text-center font-medium text-gray-600 border-l border-gray-200"
                >
                  오후자습
                </th>
                <th
                  colSpan={6}
                  className="px-3 py-2 text-center font-medium text-gray-600 border-l border-gray-200"
                >
                  야간자습
                </th>
              </tr>
              <tr className="bg-gray-50">
                {/* 오후 */}
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 border-l border-gray-200">
                  참가
                </th>
                {DAY_LABELS.map((label) => (
                  <th
                    key={`afternoon-${label}`}
                    className="px-1 py-2 text-center text-xs font-medium text-gray-500"
                  >
                    {label}
                  </th>
                ))}
                {/* 야간 */}
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 border-l border-gray-200">
                  참가
                </th>
                {DAY_LABELS.map((label) => (
                  <th
                    key={`night-${label}`}
                    className="px-1 py-2 text-center text-xs font-medium text-gray-500"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={15}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    불러오는 중...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={15}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    학생이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-900 font-medium whitespace-nowrap">
                      {student.name}
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-600">
                      {student.classNumber}
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-600">
                      {student.studentNumber}
                    </td>

                    {/* 오후자습 */}
                    <td className="px-2 py-2.5 text-center border-l border-gray-100">
                      <input
                        type="checkbox"
                        checked={student.afternoon.isParticipating}
                        onChange={(e) =>
                          handleUpdate(
                            student.id,
                            "afternoon",
                            "isParticipating",
                            e.target.checked
                          )
                        }
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    {DAY_KEYS.map((day) => (
                      <td
                        key={`${student.id}-afternoon-${day}`}
                        className="px-1 py-2.5 text-center"
                      >
                        <button
                          onClick={() =>
                            handleUpdate(
                              student.id,
                              "afternoon",
                              day,
                              !student.afternoon[day]
                            )
                          }
                          disabled={!student.afternoon.isParticipating}
                          className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                            !student.afternoon.isParticipating
                              ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                              : student.afternoon[day]
                                ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                          }`}
                        >
                          {DAY_LABELS[DAY_KEYS.indexOf(day)]}
                        </button>
                      </td>
                    ))}

                    {/* 야간자습 */}
                    <td className="px-2 py-2.5 text-center border-l border-gray-100">
                      <input
                        type="checkbox"
                        checked={student.night.isParticipating}
                        onChange={(e) =>
                          handleUpdate(
                            student.id,
                            "night",
                            "isParticipating",
                            e.target.checked
                          )
                        }
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    {DAY_KEYS.map((day) => (
                      <td
                        key={`${student.id}-night-${day}`}
                        className="px-1 py-2.5 text-center"
                      >
                        <button
                          onClick={() =>
                            handleUpdate(
                              student.id,
                              "night",
                              day,
                              !student.night[day]
                            )
                          }
                          disabled={!student.night.isParticipating}
                          className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                            !student.night.isParticipating
                              ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                              : student.night[day]
                                ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                          }`}
                        >
                          {DAY_LABELS[DAY_KEYS.indexOf(day)]}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && filteredStudents.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
            총 {filteredStudents.length}명
            {classFilter && ` (${classFilter}반)`}
          </div>
        )}
      </div>
    </div>
  );
}
