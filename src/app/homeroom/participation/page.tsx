"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";

type DaySettings = {
  isParticipating: boolean;
  mon: boolean; tue: boolean; wed: boolean; thu: boolean; fri: boolean;
  afterSchoolMon: boolean; afterSchoolTue: boolean; afterSchoolWed: boolean;
  afterSchoolThu: boolean; afterSchoolFri: boolean;
};

type StudentParticipation = {
  id: number;
  name: string;
  grade: number;
  classNumber: number;
  studentNumber: number;
  afternoon: DaySettings;
  night: DaySettings;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"] as const;
const DAY_LABELS = ["월", "화", "수", "목", "금"] as const;
const AFTER_SCHOOL_KEYS = ["afterSchoolMon", "afterSchoolTue", "afterSchoolWed", "afterSchoolThu", "afterSchoolFri"] as const;

export default function HomeroomParticipationPage() {
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const apiUrl = "/api/homeroom/participation-days";
  const { data, mutate, isLoading } = useSWR<{
    students: StudentParticipation[];
  }>(apiUrl, fetcher);

  const students = data?.students ?? [];

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

      const key = `${studentId}-${sessionType}-${field}`;
      setSavingKey(key);

      mutate(
        {
          students: students.map((s) =>
            s.id === studentId ? { ...s, [sessionType]: updated } : s
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

  return (
    <div>
      {savingKey && (
        <div className="mb-4">
          <span className="text-xs text-gray-400">저장 중...</span>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th rowSpan={3} className="px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap">
                  이름
                </th>
                <th rowSpan={3} className="px-3 py-3 text-center font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap">
                  반
                </th>
                <th rowSpan={3} className="px-3 py-3 text-center font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap">
                  번호
                </th>
                <th colSpan={6} className="px-3 py-2 text-center font-medium text-gray-600 border-l border-gray-200 whitespace-nowrap">
                  오후자습
                </th>
                <th colSpan={6} className="px-3 py-2 text-center font-medium text-gray-600 border-l border-gray-200 whitespace-nowrap">
                  야간자습
                </th>
              </tr>
              <tr className="bg-gray-50">
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 border-l border-gray-200 whitespace-nowrap">참가</th>
                {DAY_LABELS.map((label) => (
                  <th key={`afternoon-${label}`} className="px-1 py-2 text-center text-xs font-medium text-gray-500 whitespace-nowrap">
                    {label}
                  </th>
                ))}
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 border-l border-gray-200 whitespace-nowrap">참가</th>
                {DAY_LABELS.map((label) => (
                  <th key={`night-${label}`} className="px-1 py-2 text-center text-xs font-medium text-gray-500 whitespace-nowrap">
                    {label}
                  </th>
                ))}
              </tr>
              <tr className="bg-orange-50">
                {(["afternoon", "night"] as const).map((session) => [
                  <th key={`${session}-as-empty`} className="py-1 border-l border-gray-200 whitespace-nowrap" />,
                  ...DAY_LABELS.map((l, i) => (
                    <th key={`${session}-as-${l}`} className="py-1 text-center text-[10px] font-medium text-orange-600 whitespace-nowrap">
                      방과후
                    </th>
                  )),
                ])}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={15} className="px-4 py-8 text-center text-gray-400">
                    불러오는 중...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-4 py-8 text-center text-gray-400">
                    학생이 없습니다.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
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
                          handleUpdate(student.id, "afternoon", "isParticipating", e.target.checked)
                        }
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    {DAY_KEYS.map((day, dayIdx) => (
                      <td key={`${student.id}-afternoon-${day}`} className="px-1 py-2.5 text-center">
                        <button
                          onClick={() =>
                            handleUpdate(student.id, "afternoon", day, !student.afternoon[day])
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
                          {DAY_LABELS[dayIdx]}
                        </button>
                        <div className="mt-1">
                          <input
                            type="checkbox"
                            checked={student.afternoon[AFTER_SCHOOL_KEYS[dayIdx]]}
                            onChange={(e) => handleUpdate(student.id, "afternoon", AFTER_SCHOOL_KEYS[dayIdx], e.target.checked)}
                            disabled={!student.afternoon.isParticipating || !student.afternoon[day]}
                            className="w-3.5 h-3.5 rounded border-gray-300 disabled:opacity-30"
                            style={{ accentColor: '#ea580c' }}
                          />
                        </div>
                      </td>
                    ))}

                    {/* 야간자습 */}
                    <td className="px-2 py-2.5 text-center border-l border-gray-100">
                      <input
                        type="checkbox"
                        checked={student.night.isParticipating}
                        onChange={(e) =>
                          handleUpdate(student.id, "night", "isParticipating", e.target.checked)
                        }
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    {DAY_KEYS.map((day, dayIdx) => (
                      <td key={`${student.id}-night-${day}`} className="px-1 py-2.5 text-center">
                        <button
                          onClick={() =>
                            handleUpdate(student.id, "night", day, !student.night[day])
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
                          {DAY_LABELS[dayIdx]}
                        </button>
                        <div className="mt-1">
                          <input
                            type="checkbox"
                            checked={student.night[AFTER_SCHOOL_KEYS[dayIdx]]}
                            onChange={(e) => handleUpdate(student.id, "night", AFTER_SCHOOL_KEYS[dayIdx], e.target.checked)}
                            disabled={!student.night.isParticipating || !student.night[day]}
                            className="w-3.5 h-3.5 rounded border-gray-300 disabled:opacity-30"
                            style={{ accentColor: '#ea580c' }}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
            {!isLoading && students.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={3} className="px-2 py-2.5 text-right font-semibold text-gray-600 text-xs">합계</td>
                  {(["afternoon", "night"] as const).map((session) => {
                    const participating = students.filter((s) => s[session].isParticipating).length;
                    return [
                      <td key={`${session}-total`} className="py-2.5 text-center font-bold text-blue-700 text-xs border-l border-gray-200">
                        {participating}
                      </td>,
                      ...DAY_KEYS.map((day) => {
                        const count = students.filter((s) => s[session].isParticipating && s[session][day]).length;
                        return (
                          <td key={`${session}-${day}-total`} className="py-2.5 text-center font-medium text-gray-600 text-xs">
                            {count}
                          </td>
                        );
                      }),
                    ];
                  })}
                </tr>
              </tfoot>
            )}
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
