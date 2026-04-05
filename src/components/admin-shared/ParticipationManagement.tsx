"use client";

import { useState, useCallback } from "react";
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

export default function ParticipationManagement({ grade }: { grade: number }) {
  const [classFilter, setClassFilter] = useState<string>("");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const apiUrl = `/api/grade-admin/${grade}/participation-days`;
  const { data, mutate, isLoading } = useSWR<{ students: StudentParticipation[] }>(apiUrl, fetcher);

  const students = data?.students ?? [];
  const filteredStudents = classFilter
    ? students.filter((s) => s.classNumber === parseInt(classFilter, 10))
    : students;
  const classNumbers = Array.from(new Set(students.map((s) => s.classNumber))).sort((a, b) => a - b);

  const handleUpdate = useCallback(
    async (studentId: number, sessionType: "afternoon" | "night", field: string, value: boolean) => {
      const student = students.find((s) => s.id === studentId);
      if (!student) return;
      const current = sessionType === "afternoon" ? student.afternoon : student.night;
      const updated = { ...current, [field]: value };
      const key = `${studentId}-${sessionType}-${field}`;
      setSavingKey(key);
      mutate({ students: students.map((s) => s.id === studentId ? { ...s, [sessionType]: updated } : s) }, false);
      try {
        const res = await fetch(apiUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId, sessionType, ...updated }),
        });
        if (!res.ok) { const data = await res.json(); throw new Error(data.error || "저장 실패"); }
        mutate(undefined, { revalidate: false });
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "저장 실패");
        mutate();
      } finally {
        setSavingKey(null);
      }
    },
    [students, apiUrl, mutate]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 반</option>
          {classNumbers.map((n) => (<option key={n} value={n}>{n}반</option>))}
        </select>
        {savingKey && <span className="text-xs text-gray-400">저장 중...</span>}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th rowSpan={2} className="px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200">이름</th>
                <th rowSpan={2} className="px-3 py-3 text-center font-medium text-gray-600 border-b border-gray-200">반</th>
                <th rowSpan={2} className="px-3 py-3 text-center font-medium text-gray-600 border-b border-gray-200">번호</th>
                <th colSpan={6} className="px-3 py-2 text-center font-medium text-gray-600 border-l border-gray-200">오후자습</th>
                <th colSpan={6} className="px-3 py-2 text-center font-medium text-gray-600 border-l border-gray-200">야간자습</th>
              </tr>
              <tr className="bg-gray-50">
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 border-l border-gray-200">참가</th>
                {DAY_LABELS.map((l) => (<th key={`a-${l}`} className="px-1 py-2 text-center text-xs font-medium text-gray-500">{l}</th>))}
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 border-l border-gray-200">참가</th>
                {DAY_LABELS.map((l) => (<th key={`n-${l}`} className="px-1 py-2 text-center text-xs font-medium text-gray-500">{l}</th>))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={15} className="px-4 py-8 text-center text-gray-400">불러오는 중...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={15} className="px-4 py-8 text-center text-gray-400">학생이 없습니다.</td></tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-900 font-medium whitespace-nowrap">{student.name}</td>
                    <td className="px-3 py-2.5 text-center text-gray-600">{student.classNumber}</td>
                    <td className="px-3 py-2.5 text-center text-gray-600">{student.studentNumber}</td>
                    {(["afternoon", "night"] as const).map((session) => {
                      const settings = student[session];
                      return (
                        <td key={session} colSpan={6} className="p-0">
                          <div className="flex items-center border-l border-gray-100">
                            <div className="px-2 py-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={settings.isParticipating}
                                onChange={(e) => handleUpdate(student.id, session, "isParticipating", e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </div>
                            {DAY_KEYS.map((day) => (
                              <div key={day} className="px-1 py-2.5 text-center">
                                <button
                                  onClick={() => handleUpdate(student.id, session, day, !settings[day])}
                                  disabled={!settings.isParticipating}
                                  className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                                    !settings.isParticipating
                                      ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                                      : settings[day]
                                        ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                                  }`}
                                >
                                  {DAY_LABELS[DAY_KEYS.indexOf(day)]}
                                </button>
                              </div>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && filteredStudents.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
            총 {filteredStudents.length}명{classFilter && ` (${classFilter}반)`}
          </div>
        )}
      </div>
    </div>
  );
}
