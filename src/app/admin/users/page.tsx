"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { chrome } from "@/components/ui/chrome";
import { Dialog } from "@/components/ui/Dialog";

const StudentManagement = dynamic(() => import("@/components/students/StudentManagement"), {
  ssr: false,
  loading: () => <div className="text-center py-12 text-ink-muted">불러오는 중…</div>,
});
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

type Notice = { tone: "ok" | "error"; text: string };

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
  const [notice, setNotice] = useState<Notice | null>(null);
  const activeTab = TABS[activeIdx];

  const handleResetStudents = async () => {
    const msg = "정말 모든 학생 정보를 초기화하시겠습니까?\n\n" +
      "학생 명단, 출결기록, 참여설정, 좌석배치, 불참신청 등\n" +
      "학생과 관련된 모든 데이터가 영구 삭제됩니다.\n\n" +
      "이 작업은 되돌릴 수 없습니다.";
    if (!confirm(msg)) return;
    if (!confirm("최종 확인: 정말 초기화하시겠습니까?")) return;

    setResetting(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/students/reset", { method: "POST" });
      if (res.ok) {
        setNotice({ tone: "ok", text: "학생 정보가 초기화되었습니다." });
        setResetKey((k) => k + 1);
      } else {
        const data = await res.json();
        setNotice({ tone: "error", text: `${data.error || "초기화에 실패했습니다."} 다시 시도하세요.` });
      }
    } catch {
      setNotice({ tone: "error", text: "초기화에 실패했습니다. 네트워크를 확인하고 다시 시도하세요." });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="사용자 구분" className="flex gap-1 overflow-x-auto">
          {TABS.map((tab, idx) => (
            <button
              key={idx}
              type="button"
              role="tab"
              aria-selected={activeIdx === idx}
              onClick={() => setActiveIdx(idx)}
              className={chrome.tab(activeIdx === idx)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleResetStudents}
          disabled={resetting}
          className="inline-flex min-h-11 cursor-pointer items-center whitespace-nowrap rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {resetting ? "초기화 중…" : "학생 전체 초기화"}
        </button>
      </div>

      <div aria-live="polite" className={notice ? "mb-4" : undefined}>
        {notice && <div className={chrome.notice(notice.tone)}>{notice.text}</div>}
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
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // 표 안 담당학년·담임·서브관리자 변경 — 어느 교사가 저장 중인지, 실패했는지
  const [rowSaving, setRowSaving] = useState<number | null>(null);
  const [tableNotice, setTableNotice] = useState<Notice | null>(null);

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

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setFormError(null);
  };

  const handleSubmit = async () => {
    const url = editTarget
      ? `/api/admin/teachers/${editTarget.id}`
      : "/api/admin/teachers";
    const method = editTarget ? "PUT" : "POST";
    const body: Record<string, string> = { loginId: form.loginId, name: form.name };
    if (form.password) body.password = form.password;

    setSaving(true);
    setFormError(null);
    try {
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
        setFormError(`${data.error || "오류가 발생했습니다."} 입력을 확인하고 다시 시도하세요.`);
      }
    } catch {
      setFormError("저장하지 못했습니다. 네트워크를 확인하고 다시 시도하세요.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (teacher: Teacher) => {
    if (!confirm(`${teacher.name} 교사를 정말 삭제하시겠습니까?`)) return;
    setTableNotice(null);
    try {
      const res = await fetch(`/api/admin/teachers/${teacher.id}`, { method: "DELETE" });
      if (res.ok) fetchTeachers();
      else setTableNotice({ tone: "error", text: `${teacher.name} 교사를 삭제하지 못했습니다. 다시 시도하세요.` });
    } catch {
      setTableNotice({ tone: "error", text: `${teacher.name} 교사를 삭제하지 못했습니다. 네트워크를 확인하고 다시 시도하세요.` });
    }
  };

  /** 행 단위 변경 공통: 저장 표시 → 요청 → 실패 시 안내 → 목록 재조회 */
  const runRowUpdate = async (teacher: Teacher, what: string, work: () => Promise<boolean>) => {
    setRowSaving(teacher.id);
    setTableNotice(null);
    let ok = false;
    try {
      ok = await work();
    } catch {
      ok = false;
    }
    if (!ok) {
      setTableNotice({ tone: "error", text: `${teacher.name} ${what}을(를) 저장하지 못했습니다. 다시 시도하세요.` });
    }
    await fetchTeachers();
    setRowSaving(null);
  };

  const handleHomeroomChange = async (teacherId: number, value: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) return;

    await runRowUpdate(teacher, "담임 학급", async () => {
      let ok = true;
      for (const ha of teacher.homeroomAssignments) {
        const res = await fetch(`/api/admin/homeroom-assignments?id=${ha.id}`, {
          method: "DELETE",
        });
        if (!res.ok) ok = false;
      }

      if (value !== "") {
        const [g, c] = value.split("-").map(Number);
        const res = await fetch("/api/admin/homeroom-assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teacherId, grade: g, classNumber: c }),
        });
        if (!res.ok) ok = false;
      }
      return ok;
    });
  };

  const handleSubAdminChange = async (teacherId: number, value: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) return;

    await runRowUpdate(teacher, "서브관리자 학년", async () => {
      let ok = true;
      for (const grade of teacher.subAdminGrades) {
        const res = await fetch("/api/admin/sub-admins", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teacherId, grade }),
        });
        if (!res.ok) ok = false;
      }

      if (value !== "") {
        const grade = parseInt(value, 10);
        const res = await fetch("/api/admin/sub-admins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teacherId, grade }),
        });
        if (!res.ok) ok = false;
      }
      return ok;
    });
  };

  const handlePrimaryGradeChange = async (teacherId: number, value: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) return;
    const primaryGrade = value === "" ? null : value;
    await runRowUpdate(teacher, "담당학년", async () => {
      const res = await fetch(`/api/admin/teachers/${teacherId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryGrade }),
      });
      return res.ok;
    });
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm({ loginId: "", name: "", password: "" });
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (t: Teacher) => {
    setEditTarget(t);
    setForm({ loginId: t.loginId, name: t.name, password: "" });
    setFormError(null);
    setShowModal(true);
  };

  const savingTeacher = rowSaving === null ? null : teachers.find((t) => t.id === rowSaving) ?? null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <span aria-live="polite" className="mr-auto text-xs text-ink-muted">
          {savingTeacher ? `${savingTeacher.name} 저장 중…` : ""}
        </span>
        <button type="button" onClick={() => setShowExcelModal(true)} className={chrome.secondaryButton}>
          Excel
        </button>
        <button type="button" onClick={openCreate} className={chrome.primaryButton}>
          교사 추가
        </button>
      </div>

      <div aria-live="polite" className={tableNotice ? "mb-3" : undefined}>
        {tableNotice && <div className={chrome.notice(tableNotice.tone)}>{tableNotice.text}</div>}
      </div>

      <div className={`${chrome.card} overflow-x-auto`}>
        <table className="w-full whitespace-nowrap">
          <thead className={`${chrome.tableHead} sticky top-0 z-10`}>
            <tr className="border-b border-line">
              <th className="sticky left-0 z-20 bg-butter px-4 py-3 text-left text-xs font-medium">이름</th>
              <th className="px-4 py-3 text-left text-xs font-medium">아이디</th>
              <th className="px-4 py-3 text-left text-xs font-medium">역할</th>
              <th className="px-4 py-3 text-left text-xs font-medium">담당학년</th>
              <th className="px-4 py-3 text-left text-xs font-medium">담임</th>
              <th className="px-4 py-3 text-left text-xs font-medium">서브관리자</th>
              <th className="px-4 py-3 text-center text-xs font-medium">작업</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-ink-muted">불러오는 중…</td>
              </tr>
            ) : teachers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-ink-muted">등록된 교사가 없습니다. 오른쪽 위 「교사 추가」로 시작하세요.</td>
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
                const busy = rowSaving === t.id;

                return (
                  <tr key={t.id} className={`border-b border-line ${chrome.tableRowHover}`}>
                    <td className="sticky left-0 z-10 bg-white px-4 py-2 text-sm font-medium text-ink">{t.name}</td>
                    <td className="px-4 py-2 text-sm text-ink-muted" translate="no">{t.loginId}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        {t.roles.map((role) => (
                          <span
                            key={role}
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              role === "admin"
                                ? "bg-red-100 text-red-700"
                                : role === "homeroom"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-sky text-sky-900"
                            }`}
                          >
                            {role === "admin" ? "관리자" : role === "homeroom" ? "담임" : "감독"}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        aria-label={`${t.name} 담당학년`}
                        value={t.primaryGrade ?? ""}
                        disabled={busy}
                        onChange={(e) => handlePrimaryGradeChange(t.id, e.target.value)}
                        className={`${chrome.select} w-24 disabled:opacity-60`}
                      >
                        <option value="">없음</option>
                        <option value="1">1학년</option>
                        <option value="2">2학년</option>
                        <option value="3">3학년</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        aria-label={`${t.name} 담임 학급`}
                        value={homeroomValue}
                        disabled={busy}
                        onChange={(e) => handleHomeroomChange(t.id, e.target.value)}
                        className={`${chrome.select} w-28 disabled:opacity-60`}
                      >
                        <option value="">미배정</option>
                        {CLASS_OPTIONS.map((opt) => (
                          <option key={opt.label} value={opt.label}>{opt.label}반</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        aria-label={`${t.name} 서브관리자 학년`}
                        value={subAdminValue}
                        disabled={busy}
                        onChange={(e) => handleSubAdminChange(t.id, e.target.value)}
                        className={`${chrome.select} w-24 disabled:opacity-60`}
                      >
                        <option value="">없음</option>
                        <option value="1">1학년</option>
                        <option value="2">2학년</option>
                        <option value="3">3학년</option>
                      </select>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(t)}
                          aria-label={`${t.name} 수정`}
                          className="min-h-11 cursor-pointer rounded-lg px-3 text-sm font-medium text-primary transition-colors hover:bg-peach hover:text-primary-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(t)}
                          aria-label={`${t.name} 삭제`}
                          className="min-h-11 cursor-pointer rounded-lg px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={showModal}
        onClose={closeModal}
        title={editTarget ? "교사 수정" : "교사 추가"}
        description={editTarget ? "아이디는 바꿀 수 없습니다. 비밀번호는 변경할 때만 입력하세요." : undefined}
        closeDisabled={saving}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-3"
        >
          <div>
            <label htmlFor="teacher-name" className={chrome.label}>이름</label>
            <input
              id="teacher-name"
              name="name"
              type="text"
              required
              autoComplete="off"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={chrome.input}
              placeholder="예: 김선생"
            />
          </div>
          <div>
            <label htmlFor="teacher-login-id" className={chrome.label}>아이디</label>
            <input
              id="teacher-login-id"
              name="loginId"
              type="text"
              required
              autoComplete="username"
              spellCheck={false}
              autoCapitalize="none"
              value={form.loginId}
              onChange={(e) => setForm((f) => ({ ...f, loginId: e.target.value }))}
              className={chrome.input}
              disabled={!!editTarget}
              placeholder="예: teacher1-1"
            />
          </div>
          <div>
            <label htmlFor="teacher-password" className={chrome.label}>
              비밀번호{editTarget && " (변경 시에만 입력)"}
            </label>
            <input
              id="teacher-password"
              name="password"
              type="password"
              required={!editTarget}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className={chrome.input}
            />
          </div>

          <div aria-live="polite">
            {formError && <div className={chrome.notice("error")}>{formError}</div>}
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={closeModal} disabled={saving} className={chrome.secondaryButton}>
              취소
            </button>
            <button type="submit" disabled={saving} className={chrome.primaryButton}>
              {saving ? "저장 중…" : editTarget ? "수정" : "추가"}
            </button>
          </div>
        </form>
      </Dialog>

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
