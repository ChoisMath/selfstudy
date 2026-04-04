"use client";

import { useState, useEffect, useCallback } from "react";

interface Teacher {
  id: number;
  loginId: string;
  name: string;
  roles: string[];
  homeroomAssignments: { grade: number; classNumber: number }[];
  subAdminGrades: number[];
}

const ROLE_LABELS: Record<string, string> = {
  admin: "관리자",
  supervisor: "감독교사",
  homeroom: "담임교사",
};

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  // 폼 상태
  const [form, setForm] = useState({ loginId: "", name: "", password: "", roles: [] as string[] });

  const fetchTeachers = useCallback(async () => {
    const res = await fetch("/api/admin/teachers");
    const data = await res.json();
    setTeachers(data.teachers);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  function openAdd() {
    setEditingTeacher(null);
    setForm({ loginId: "", name: "", password: "", roles: [] });
    setShowModal(true);
  }

  function openEdit(t: Teacher) {
    setEditingTeacher(t);
    setForm({ loginId: t.loginId, name: t.name, password: "", roles: [...t.roles] });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingTeacher) {
      await fetch(`/api/admin/teachers/${editingTeacher.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, password: form.password || undefined }),
      });
    } else {
      await fetch("/api/admin/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setShowModal(false);
    fetchTeachers();
  }

  async function handleDelete(id: number) {
    if (!confirm("이 교사를 삭제하시겠습니까?")) return;
    await fetch(`/api/admin/teachers/${id}`, { method: "DELETE" });
    fetchTeachers();
  }

  function toggleRole(role: string) {
    setForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  }

  if (loading) return <div className="text-gray-500">로딩 중...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">교사 관리</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          교사 추가
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">이름</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">로그인 ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">역할</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">담임</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {teachers.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{t.id}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                <td className="px-4 py-3 text-gray-600">{t.loginId}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {t.roles.map((r) => (
                      <span key={r} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                        {ROLE_LABELS[r] || r}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {t.homeroomAssignments.map((h) => `${h.grade}-${h.classNumber}`).join(", ") || "-"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(t)} className="text-blue-600 hover:text-blue-800 text-sm mr-3">수정</button>
                  <button onClick={() => handleDelete(t.id)} className="text-red-600 hover:text-red-800 text-sm">삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold mb-4">{editingTeacher ? "교사 수정" : "교사 추가"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">로그인 ID</label>
                <input
                  type="text" value={form.loginId} onChange={(e) => setForm({ ...form, loginId: e.target.value })}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                <input
                  type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호 {editingTeacher && <span className="text-gray-400">(변경 시만 입력)</span>}
                </label>
                <input
                  type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  {...(!editingTeacher && { required: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">역할</label>
                <div className="flex gap-3">
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" checked={form.roles.includes(value)} onChange={() => toggleRole(value)} className="rounded" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">취소</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                  {editingTeacher ? "수정" : "추가"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
