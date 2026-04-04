"use client";

import { useState, useEffect, useCallback } from "react";

type Teacher = { id: number; name: string; roles: string[] };
type Assignment = {
  id: number; teacherId: number; date: string; grade: number;
  sessionType: "afternoon" | "night"; teacher: { id: number; name: string };
};

const SESSION_LABELS: Record<string, string> = { afternoon: "오후", night: "야간" };
const DAY_LABELS = ["월", "화", "수", "목", "금"];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
}
function formatDate(d: Date) { return d.toISOString().split("T")[0]; }
function addDays(d: Date, days: number) { const r = new Date(d); r.setDate(r.getDate() + days); return r; }
function formatShortDate(d: Date) { return `${d.getMonth() + 1}/${d.getDate()}`; }

export default function SupervisorManagement({ grade }: { grade: number }) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
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
      const res = await fetch(`/api/grade-admin/${grade}/supervisor-assignments?from=${fromStr}&to=${toStr}`);
      if (res.ok) { const data = await res.json(); setAssignments(data.assignments); }
    } finally { setLoading(false); }
  }, [grade, fromStr, toStr]);

  const fetchTeachers = useCallback(async () => {
    const res = await fetch("/api/teachers");
    if (res.ok) { const data = await res.json(); setTeachers(data.teachers); }
  }, []);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);
  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const getAssignment = (date: Date, sessionType: string) =>
    assignments.find((a) => a.date.startsWith(formatDate(date)) && a.sessionType === sessionType);

  const handleAssign = async (date: Date, sessionType: string, teacherId: number | null) => {
    const dateStr = formatDate(date);
    setSaving(`${dateStr}-${sessionType}`);
    try {
      if (teacherId === null) {
        const existing = getAssignment(date, sessionType);
        if (existing) {
          const res = await fetch(`/api/grade-admin/${grade}/supervisor-assignments/${existing.id}`, { method: "DELETE" });
          if (res.ok) setAssignments((prev) => prev.filter((a) => a.id !== existing.id));
        }
      } else {
        const res = await fetch(`/api/grade-admin/${grade}/supervisor-assignments`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teacherId, date: dateStr, sessionType }),
        });
        if (res.ok) {
          const data = await res.json();
          setAssignments((prev) => [...prev.filter((a) => !(a.date.startsWith(dateStr) && a.sessionType === sessionType)), data.assignment]);
        }
      }
    } finally { setSaving(null); }
  };

  const weekLabel = `${weekStart.getFullYear()}년 ${weekStart.getMonth() + 1}월 ${weekStart.getDate()}일 ~ ${addDays(weekStart, 4).getMonth() + 1}월 ${addDays(weekStart, 4).getDate()}일`;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setWeekStart((p) => addDays(p, -7))} className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">&larr; 이전주</button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">{weekLabel}</span>
          <button onClick={() => setWeekStart(getMonday(new Date()))} className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100">이번주</button>
        </div>
        <button onClick={() => setWeekStart((p) => addDays(p, 7))} className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">다음주 &rarr;</button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full table-fixed">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-20 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">구분</th>
              {weekDates.map((date, i) => (
                <th key={i} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  <div>{DAY_LABELS[i]}</div>
                  <div className="text-gray-400 font-normal mt-0.5">{formatShortDate(date)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(["afternoon", "night"] as const).map((sessionType) => (
              <tr key={sessionType} className="border-b border-gray-100 last:border-b-0">
                <td className="px-3 py-4 text-sm font-medium text-gray-700">{SESSION_LABELS[sessionType]}</td>
                {weekDates.map((date, i) => {
                  const assignment = getAssignment(date, sessionType);
                  const cellKey = `${formatDate(date)}-${sessionType}`;
                  const isSaving = saving === cellKey;
                  return (
                    <td key={i} className="px-2 py-3 text-center">
                      <select
                        value={assignment?.teacherId ?? ""}
                        disabled={loading || isSaving}
                        onChange={(e) => handleAssign(date, sessionType, e.target.value === "" ? null : parseInt(e.target.value, 10))}
                        className={`w-full text-sm border rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isSaving ? "bg-yellow-50 border-yellow-300"
                            : assignment ? "bg-blue-50 border-blue-200 text-blue-800"
                              : "bg-white border-gray-300 text-gray-500"
                        }`}
                      >
                        <option value="">미배정</option>
                        {teachers.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="text-center py-8 text-sm text-gray-400">로딩 중...</div>}
      </div>
    </div>
  );
}
