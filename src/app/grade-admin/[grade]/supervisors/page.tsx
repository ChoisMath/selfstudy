"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

type Teacher = {
  id: number;
  name: string;
  roles: string[];
};

type Assignment = {
  id: number;
  teacherId: number;
  date: string;
  grade: number;
  sessionType: "afternoon" | "night";
  teacher: { id: number; name: string };
};

const SESSION_LABELS: Record<string, string> = {
  afternoon: "오후",
  night: "야간",
};

const DAY_LABELS = ["월", "화", "수", "목", "금"];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

function formatShortDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function SupervisorsPage() {
  const params = useParams();
  const grade = parseInt(params.grade as string, 10);

  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const weekDates = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  const fromStr = formatDate(weekStart);
  const toStr = formatDate(addDays(weekStart, 4));

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/grade-admin/${grade}/supervisor-assignments?from=${fromStr}&to=${toStr}`
      );
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments);
      }
    } catch (err) {
      console.error("배정 목록 로딩 실패:", err);
    } finally {
      setLoading(false);
    }
  }, [grade, fromStr, toStr]);

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await fetch("/api/teachers");
      if (res.ok) {
        const data = await res.json();
        setTeachers(data.teachers);
      }
    } catch (err) {
      console.error("교사 목록 로딩 실패:", err);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const getAssignment = (date: Date, sessionType: string): Assignment | undefined => {
    const dateStr = formatDate(date);
    return assignments.find(
      (a) => a.date.startsWith(dateStr) && a.sessionType === sessionType
    );
  };

  const handleAssign = async (date: Date, sessionType: string, teacherId: number | null) => {
    const dateStr = formatDate(date);
    const cellKey = `${dateStr}-${sessionType}`;
    setSaving(cellKey);

    try {
      if (teacherId === null) {
        // 배정 해제
        const existing = getAssignment(date, sessionType);
        if (existing) {
          const res = await fetch(
            `/api/grade-admin/${grade}/supervisor-assignments/${existing.id}`,
            { method: "DELETE" }
          );
          if (res.ok) {
            setAssignments((prev) => prev.filter((a) => a.id !== existing.id));
          }
        }
      } else {
        // 배정 또는 변경 (upsert)
        const res = await fetch(
          `/api/grade-admin/${grade}/supervisor-assignments`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teacherId, date: dateStr, sessionType }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          setAssignments((prev) => {
            const filtered = prev.filter(
              (a) => !(a.date.startsWith(dateStr) && a.sessionType === sessionType)
            );
            return [...filtered, data.assignment];
          });
        }
      }
    } catch (err) {
      console.error("배정 저장 실패:", err);
    } finally {
      setSaving(null);
    }
  };

  const goToPrevWeek = () => setWeekStart((prev) => addDays(prev, -7));
  const goToNextWeek = () => setWeekStart((prev) => addDays(prev, 7));
  const goToThisWeek = () => setWeekStart(getMonday(new Date()));

  if (isNaN(grade) || grade < 1 || grade > 3) {
    return (
      <div className="text-center py-12 text-gray-500">잘못된 학년입니다.</div>
    );
  }

  const weekLabel = `${weekStart.getFullYear()}년 ${weekStart.getMonth() + 1}월 ${weekStart.getDate()}일 ~ ${addDays(weekStart, 4).getMonth() + 1}월 ${addDays(weekStart, 4).getDate()}일`;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {grade}학년 감독교사 배정
      </h1>

      {/* 주 네비게이션 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevWeek}
          className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          &larr; 이전주
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">{weekLabel}</span>
          <button
            onClick={goToThisWeek}
            className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100"
          >
            이번주
          </button>
        </div>
        <button
          onClick={goToNextWeek}
          className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          다음주 &rarr;
        </button>
      </div>

      {/* 캘린더 테이블 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full table-fixed">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-20 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                구분
              </th>
              {weekDates.map((date, i) => (
                <th
                  key={i}
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                >
                  <div>{DAY_LABELS[i]}</div>
                  <div className="text-gray-400 font-normal mt-0.5">
                    {formatShortDate(date)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(["afternoon", "night"] as const).map((sessionType) => (
              <tr key={sessionType} className="border-b border-gray-100 last:border-b-0">
                <td className="px-3 py-4 text-sm font-medium text-gray-700">
                  {SESSION_LABELS[sessionType]}
                </td>
                {weekDates.map((date, i) => {
                  const assignment = getAssignment(date, sessionType);
                  const cellKey = `${formatDate(date)}-${sessionType}`;
                  const isSaving = saving === cellKey;

                  return (
                    <td key={i} className="px-2 py-3 text-center">
                      <select
                        value={assignment?.teacherId ?? ""}
                        disabled={loading || isSaving}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleAssign(
                            date,
                            sessionType,
                            val === "" ? null : parseInt(val, 10)
                          );
                        }}
                        className={`w-full text-sm border rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          isSaving
                            ? "bg-yellow-50 border-yellow-300"
                            : assignment
                              ? "bg-blue-50 border-blue-200 text-blue-800"
                              : "bg-white border-gray-300 text-gray-500"
                        }`}
                      >
                        <option value="">미배정</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {loading && (
          <div className="text-center py-8 text-sm text-gray-400">
            로딩 중...
          </div>
        )}
      </div>
    </div>
  );
}
