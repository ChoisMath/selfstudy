"use client";

import { useState, useEffect, useCallback } from "react";

interface Assignment {
  id: number;
  teacherId: number;
  grade: number;
  teacher: { id: number; name: string; loginId: string };
}

interface Teacher {
  id: number;
  name: string;
  loginId: string;
}

export default function SubAdminsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("1");

  const fetchData = useCallback(async () => {
    const [assignRes, teacherRes] = await Promise.all([
      fetch("/api/admin/sub-admins"),
      fetch("/api/admin/teachers"),
    ]);
    const assignData = await assignRes.json();
    const teacherData = await teacherRes.json();
    setAssignments(assignData.assignments);
    setTeachers(teacherData.teachers);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleAdd() {
    if (!selectedTeacher) return;
    await fetch("/api/admin/sub-admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId: parseInt(selectedTeacher), grade: parseInt(selectedGrade) }),
    });
    setSelectedTeacher("");
    fetchData();
  }

  async function handleRemove(id: number) {
    if (!confirm("서��관리자 지정을 해제하시겠습니까?")) return;
    await fetch(`/api/admin/sub-admins?id=${id}`, { method: "DELETE" });
    fetchData();
  }

  if (loading) return <div className="text-gray-500">로딩 중...</div>;

  const gradeGroups = [1, 2, 3].map((g) => ({
    grade: g,
    admins: assignments.filter((a) => a.grade === g),
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">서브관리자 지정</h1>

      {/* 추가 폼 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-3">서브관리자 추가</h2>
        <div className="flex gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">학년</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="1">1학년</option>
              <option value="2">2학년</option>
              <option value="3">3학년</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">교사</label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">교사 선택</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.loginId})</option>
              ))}
            </select>
          </div>
          <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            지정
          </button>
        </div>
      </div>

      {/* 학년별 서브관리자 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {gradeGroups.map(({ grade, admins }) => (
          <div key={grade} className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{grade}학년</h3>
            {admins.length === 0 ? (
              <p className="text-sm text-gray-400">지정된 서브관리자 없음</p>
            ) : (
              <ul className="space-y-2">
                {admins.map((a) => (
                  <li key={a.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-sm font-medium">{a.teacher.name} <span className="text-gray-400">({a.teacher.loginId})</span></span>
                    <button onClick={() => handleRemove(a.id)} className="text-red-500 hover:text-red-700 text-xs">해제</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
