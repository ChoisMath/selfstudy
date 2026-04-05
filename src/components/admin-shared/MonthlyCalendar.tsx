"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

type Teacher = { id: number; name: string };
type Assignment = {
  id: number;
  teacherId: number;
  date: string;
  grade: number;
  sessionType: "afternoon" | "night";
  teacher: { id: number; name: string };
};

type SlotConfig = {
  grade: number;
  sessionType: "afternoon" | "night";
  label: string;
};

const SESSION_LABELS: Record<string, string> = {
  afternoon: "오",
  night: "야",
};
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: (Date | null)[] = [];

  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push(null);
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

export default function MonthlyCalendar({
  grade,
  showAllGrades = false,
  apiBasePath,
}: {
  grade?: number;
  showAllGrades?: boolean;
  apiBasePath: string;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const slots: SlotConfig[] = useMemo(() => {
    if (showAllGrades) {
      return [1, 2, 3].flatMap((g) => [
        { grade: g, sessionType: "afternoon" as const, label: `${g}학년 ${SESSION_LABELS.afternoon}` },
        { grade: g, sessionType: "night" as const, label: `${g}학년 ${SESSION_LABELS.night}` },
      ]);
    }
    return [
      { grade: grade!, sessionType: "afternoon" as const, label: "오후자습" },
      { grade: grade!, sessionType: "night" as const, label: "야간자습" },
    ];
  }, [grade, showAllGrades]);

  const monthDays = useMemo(() => getMonthDays(year, month), [year, month]);

  const fromStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDate = new Date(year, month + 1, 0);
  const toStr = formatDate(lastDate);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      if (showAllGrades) {
        const results = await Promise.all(
          [1, 2, 3].map(async (g) => {
            const res = await fetch(
              `/api/grade-admin/${g}/supervisor-assignments?from=${fromStr}&to=${toStr}`
            );
            if (res.ok) {
              const data = await res.json();
              return data.assignments as Assignment[];
            }
            return [];
          })
        );
        setAssignments(results.flat());
      } else {
        const res = await fetch(`${apiBasePath}?from=${fromStr}&to=${toStr}`);
        if (res.ok) {
          const data = await res.json();
          setAssignments(data.assignments);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [apiBasePath, fromStr, toStr, showAllGrades]);

  const fetchTeachers = useCallback(async () => {
    const res = await fetch("/api/teachers");
    if (res.ok) {
      const data = await res.json();
      setTeachers(data.teachers);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);
  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const getAssignment = (date: Date, g: number, sessionType: string) =>
    assignments.find(
      (a) =>
        a.date.startsWith(formatDate(date)) &&
        a.grade === g &&
        a.sessionType === sessionType
    );

  const handleAssign = async (
    date: Date,
    g: number,
    sessionType: string,
    teacherId: number | null
  ) => {
    const dateStr = formatDate(date);
    const cellKey = `${dateStr}-${g}-${sessionType}`;
    setSaving(cellKey);
    try {
      if (teacherId === null) {
        const existing = getAssignment(date, g, sessionType);
        if (existing) {
          const res = await fetch(
            `/api/grade-admin/${g}/supervisor-assignments/${existing.id}`,
            { method: "DELETE" }
          );
          if (res.ok)
            setAssignments((prev) => prev.filter((a) => a.id !== existing.id));
        }
      } else {
        const res = await fetch(
          `/api/grade-admin/${g}/supervisor-assignments`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teacherId, date: dateStr, sessionType }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          setAssignments((prev) => [
            ...prev.filter(
              (a) =>
                !(
                  a.date.startsWith(dateStr) &&
                  a.grade === g &&
                  a.sessionType === sessionType
                )
            ),
            data.assignment,
          ]);
        }
      }
    } finally {
      setSaving(null);
    }
  };

  const prevMonth = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          &larr; 이전달
        </button>
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-gray-800">
            {year}년 {month + 1}월
          </span>
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100"
          >
            이번달
          </button>
        </div>
        <button
          onClick={nextMonth}
          className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          다음달 &rarr;
        </button>
      </div>

      {loading && (
        <div className="text-center py-4 text-sm text-gray-400">로딩 중...</div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className={`px-2 py-2 text-center text-xs font-medium ${
                i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-500"
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {monthDays.map((date, idx) => (
            <div
              key={idx}
              className={`min-h-[100px] border-b border-r border-gray-100 p-1 ${
                !date
                  ? "bg-gray-50"
                  : isWeekend(date)
                    ? "bg-gray-50"
                    : ""
              }`}
            >
              {date && (
                <>
                  <div
                    className={`text-xs font-medium mb-1 ${
                      date.getDay() === 0
                        ? "text-red-400"
                        : date.getDay() === 6
                          ? "text-blue-400"
                          : "text-gray-700"
                    }`}
                  >
                    {date.getDate()}
                  </div>
                  {!isWeekend(date) && (
                    <div className="space-y-0.5">
                      {slots.map((slot) => {
                        const assignment = getAssignment(
                          date,
                          slot.grade,
                          slot.sessionType
                        );
                        const cellKey = `${formatDate(date)}-${slot.grade}-${slot.sessionType}`;
                        const isSaving = saving === cellKey;
                        return (
                          <div key={cellKey} className="flex items-center gap-0.5">
                            <span className="text-[10px] text-gray-400 w-12 shrink-0 truncate">
                              {slot.label}
                            </span>
                            <select
                              value={assignment?.teacherId ?? ""}
                              disabled={loading || isSaving}
                              onChange={(e) =>
                                handleAssign(
                                  date,
                                  slot.grade,
                                  slot.sessionType,
                                  e.target.value === ""
                                    ? null
                                    : parseInt(e.target.value, 10)
                                )
                              }
                              className={`flex-1 text-[11px] border rounded px-1 py-0.5 min-w-0 ${
                                isSaving
                                  ? "bg-yellow-50 border-yellow-300"
                                  : assignment
                                    ? "bg-blue-50 border-blue-200 text-blue-800"
                                    : "bg-white border-gray-200 text-gray-400"
                              }`}
                            >
                              <option value="">미배정</option>
                              {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
