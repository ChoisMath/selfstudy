"use client";

import { useState, useEffect, useCallback } from "react";

interface Assignment {
  id: number;
  teacherId: number;
  grade: number;
  classNumber: number;
  teacher: { id: number; name: string; loginId: string };
}

interface Teacher {
  id: number;
  name: string;
  loginId: string;
}

export default function HomeroomAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [assignRes, teacherRes] = await Promise.all([
      fetch("/api/admin/homeroom-assignments"),
      fetch("/api/admin/teachers"),
    ]);
    const assignData = await assignRes.json();
    const teacherData = await teacherRes.json();
    setAssignments(assignData.assignments);
    setTeachers(teacherData.teachers);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleAssign(grade: number, classNumber: number, teacherId: number) {
    await fetch("/api/admin/homeroom-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId, grade, classNumber }),
    });
    fetchData();
  }

  async function handleRemove(id: number) {
    await fetch(`/api/admin/homeroom-assignments?id=${id}`, { method: "DELETE" });
    fetchData();
  }

  if (loading) return <div className="text-gray-500">로딩 중...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">담임교사 배정</h1>

      {[1, 2, 3].map((grade) => (
        <div key={grade} className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{grade}학년</h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">반</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">담임교사</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[1, 2, 3, 4, 5].map((cls) => {
                  const assignment = assignments.find((a) => a.grade === grade && a.classNumber === cls);
                  return (
                    <tr key={cls} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{cls}반</td>
                      <td className="px-4 py-3">
                        <select
                          value={assignment?.teacherId || ""}
                          onChange={(e) => {
                            const tid = parseInt(e.target.value);
                            if (tid) handleAssign(grade, cls, tid);
                          }}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="">미배정</option>
                          {teachers.map((t) => (
                            <option key={t.id} value={t.id}>{t.name} ({t.loginId})</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {assignment && (
                          <button onClick={() => handleRemove(assignment.id)} className="text-red-500 hover:text-red-700 text-xs">해제</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
