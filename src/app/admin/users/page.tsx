"use client";

import { useState, useEffect, useCallback } from "react";
import StudentManagement from "@/components/students/StudentManagement";
import ExcelUploadModal from "@/components/admin-shared/ExcelUploadModal";

type Teacher = {
  id: number;
  loginId: string;
  name: string;
  primaryGrade: number | null;
  roles: string[];
  homeroomAssignments: { id: number; grade: number; classNumber: number }[];
  subAdminGrades: number[];
};

type TabConfig =
  | { type: "teachers"; label: string }
  | { type: "students"; label: string; grade: number };

const TABS: TabConfig[] = [
  { type: "teachers", label: "교사" },
  { type: "students", label: "1학년", grade: 1 },
  { type: "students", label: "2학년", grade: 2 },
  { type: "students", label: "3학년", grade: 3 },
];

const CLASS_OPTIONS = [1, 2, 3].flatMap((g) =>
  Array.from({ length: 10 }, (_, i) => ({
    label: `${g}-${i + 1}`,
    grade: g,
    classNumber: i + 1,
  }))
);

export default function AdminUsersPage() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [resetting, setResetting] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const activeTab = TABS[activeIdx];

  const handleResetStudents = async () => {
    const msg = "정말 모든 학생 정보를 초기화하시겠습니까?\n\n" +
      "학생 명단, 출결기록, 참여설정, 좌석배치, 불참신청 등\n" +
      "학생과 관련된 모든 데이터가 영구 삭제됩니다.\n\n" +
      "이 작업은 되돌릴 수 없습니다.";
    if (!confirm(msg)) return;
    if (!confirm("최종 확인: 정말 초기화하시겠습니까?")) return;

    setResetting(true);
    try {
      const res = await fetch("/api/admin/students/reset", { method: "POST" });
      if (res.ok) {
        alert("학생 정보가 초기화되었습니다.");
        setResetKey((k) => k + 1);
      } else {
        const data = await res.json();
        alert(data.error || "초기화에 실패했습니다.");
      }
    } catch {
      alert("초기화에 실패했습니다.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit overflow-x-auto">
          {TABS.map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIdx(idx)}
              className={`px-4 py-2 text-sm rounded-md transition-colors whitespace-nowrap ${
                activeIdx === idx
                  ? "bg-white text-blue-700 shadow-sm font-medium"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleResetStudents}
          disabled={resetting}
          className="px-4 py-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50 whitespace-nowrap"
        >
          {resetting ? "초기화 중..." : "학생 전체 초기화"}
        </button>
      </div>

      {activeTab.type === "teachers" ? (
        <TeacherTab />
      ) : (
        <StudentManagement key={`${activeTab.grade}-${resetKey}`} grade={activeTab.grade} />
      )}
    </div>
  );
}

function TeacherTab() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Teacher | null>(null);
  const [form, setForm] = useState({ loginId: "", name: "", password: "" });

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/teachers");
      if (res.ok) {
        const data = await res.json();
        setTeachers(data.teachers);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleSubmit = async () => {
    const url = editTarget
      ? `/api/admin/teachers/${editTarget.id}`
      : "/api/admin/teachers";
    const method = editTarget ? "PUT" : "POST";
    const body: Record<string, string> = { loginId: form.loginId, name: form.name };
    if (form.password) body.password = form.password;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShowModal(false);
      setEditTarget(null);
      setForm({ loginId: "", name: "", password: "" });
      fetchTeachers();
    } else {
      const data = await res.json();
      alert(data.error || "오류가 발생했습니다.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/admin/teachers/${id}`, { method: "DELETE" });
    if (res.ok) fetchTeachers();
    else alert("삭제에 실패했습니다.");
  };

  const handleHomeroomChange = async (teacherId: number, value: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) return;

    for (const ha of teacher.homeroomAssignments) {
      await fetch(`/api/admin/homeroom-assignments?id=${ha.id}`, {
        method: "DELETE",
      });
    }

    if (value !== "") {
      const [g, c] = value.split("-").map(Number);
      await fetch("/api/admin/homeroom-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, grade: g, classNumber: c }),
      });
    }

    fetchTeachers();
  };

  const handleSubAdminChange = async (teacherId: number, value: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) return;

    for (const grade of teacher.subAdminGrades) {
      await fetch("/api/admin/sub-admins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, grade }),
      });
    }

    if (value !== "") {
      const grade = parseInt(value, 10);
      await fetch("/api/admin/sub-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, grade }),
      });
    }

    fetchTeachers();
  };

  const handlePrimaryGradeChange = async (teacherId: number, value: string) => {
    const primaryGrade = value === "" ? null : value;
    await fetch(`/api/admin/teachers/${teacherId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ primaryGrade }),
    });
    fetchTeachers();
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm({ loginId: "", name: "", password: "" });
    setShowModal(true);
  };

  const openEdit = (t: Teacher) => {
    setEditTarget(t);
    setForm({ loginId: t.loginId, name: t.name, password: "" });
    setShowModal(true);
  };

  return (
    <div>
      <div className="flex justify-end mb-4 gap-2">
        <button
          onClick={() => setShowExcelModal(true)}
          className="px-4 py-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100"
        >
          Excel
        </button>
        <button
          onClick={openCreate}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          교사 추가
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full whitespace-nowrap">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 sticky left-0 bg-gray-50 z-20">이름</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">아이디</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">역할</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">담당학년</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">담임</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">서브관리자</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">작업</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">로딩 중...</td>
              </tr>
            ) : teachers.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">등록된 교사가 없습니다.</td>
              </tr>
            ) : (
              teachers.map((t) => {
                const homeroomValue =
                  t.homeroomAssignments.length > 0
                    ? `${t.homeroomAssignments[0].grade}-${t.homeroomAssignments[0].classNumber}`
                    : "";
                const subAdminValue =
                  t.subAdminGrades.length > 0
                    ? String(t.subAdminGrades[0])
                    : "";

                return (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">{t.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{t.loginId}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {t.roles.map((role) => (
                          <span
                            key={role}
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              role === "admin"
                                ? "bg-red-100 text-red-700"
                                : role === "homeroom"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {role === "admin" ? "관리자" : role === "homeroom" ? "담임" : "감독"}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={t.primaryGrade ?? ""}
                        onChange={(e) => handlePrimaryGradeChange(t.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded-md px-2 py-1 w-24"
                      >
                        <option value="">없음</option>
                        <option value="1">1학년</option>
                        <option value="2">2학년</option>
                        <option value="3">3학년</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={homeroomValue}
                        onChange={(e) => handleHomeroomChange(t.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded-md px-2 py-1 w-24"
                      >
                        <option value="">미배정</option>
                        {CLASS_OPTIONS.map((opt) => (
                          <option key={opt.label} value={opt.label}>{opt.label}반</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={subAdminValue}
                        onChange={(e) => handleSubAdminChange(t.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded-md px-2 py-1 w-24"
                      >
                        <option value="">없음</option>
                        <option value="1">1학년</option>
                        <option value="2">2학년</option>
                        <option value="3">3학년</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openEdit(t)} className="text-sm text-blue-600 hover:text-blue-800 mr-2">수정</button>
                      <button onClick={() => handleDelete(t.id)} className="text-sm text-red-600 hover:text-red-800">삭제</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{editTarget ? "교사 수정" : "교사 추가"}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">이름</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">아이디</label>
                <input
                  value={form.loginId}
                  onChange={(e) => setForm((f) => ({ ...f, loginId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  disabled={!!editTarget}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  비밀번호{editTarget && " (변경 시에만 입력)"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                {editTarget ? "수정" : "추가"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ExcelUploadModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        templateUrl="/api/admin/teachers/template"
        templateFilename="teacher_template.xlsx"
        uploadUrl="/api/admin/teachers/bulk-upload"
        onUploaded={() => fetchTeachers()}
        title="교사 Excel 일괄 업로드"
      />
    </div>
  );
}
