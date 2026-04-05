"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import ExcelUploadModal from "@/components/admin-shared/ExcelUploadModal";

type Student = {
  id: number;
  grade: number;
  classNumber: number;
  studentNumber: number;
  name: string;
  isActive: boolean;
  createdAt: string;
};

type StudentFormData = {
  name: string;
  classNumber: string;
  studentNumber: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function computeStudentId(grade: number, classNumber: number, studentNumber: number) {
  return grade * 10000 + classNumber * 100 + studentNumber;
}

// --- 모달 컴포넌트 ---
function StudentModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  grade,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StudentFormData) => void;
  initialData?: StudentFormData;
  grade: number;
  isLoading: boolean;
}) {
  const [form, setForm] = useState<StudentFormData>(
    initialData ?? { name: "", classNumber: "", studentNumber: "" }
  );

  useEffect(() => {
    if (isOpen) {
      setForm(initialData ?? { name: "", classNumber: "", studentNumber: "" });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const previewId =
    form.classNumber && form.studentNumber
      ? computeStudentId(
          grade,
          parseInt(form.classNumber, 10),
          parseInt(form.studentNumber, 10)
        )
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {initialData ? "학생 수정" : "학생 추가"}
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              학년
            </label>
            <input
              type="text"
              value={`${grade}학년`}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                반
              </label>
              <input
                type="number"
                min="1"
                max="20"
                required
                value={form.classNumber}
                onChange={(e) =>
                  setForm({ ...form, classNumber: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="반"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                번호
              </label>
              <input
                type="number"
                min="1"
                max="50"
                required
                value={form.studentNumber}
                onChange={(e) =>
                  setForm({ ...form, studentNumber: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="번호"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이름
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="이름을 입력하세요"
            />
          </div>
          {previewId && !isNaN(previewId) && (
            <div className="text-sm text-gray-500">
              학번 (자동): <span className="font-mono font-semibold">{previewId}</span>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? "처리 중..." : initialData ? "수정" : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- 메인 컴포넌트 ---
export default function StudentManagement({ grade }: { grade: number }) {
  const [classFilter, setClassFilter] = useState<string>("");
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = `/api/grade-admin/${grade}/students${classFilter ? `?class=${classFilter}` : ""}`;
  const { data, mutate, isLoading } = useSWR<{ students: Student[] }>(apiUrl, fetcher);

  const students = data?.students ?? [];

  // 반 목록 추출 (필터용)
  const classNumbers = Array.from(
    new Set(students.map((s) => s.classNumber))
  ).sort((a, b) => a - b);

  const handleAdd = useCallback(() => {
    setEditingStudent(null);
    setModalOpen(true);
    setError(null);
  }, []);

  const handleEdit = useCallback((student: Student) => {
    setEditingStudent(student);
    setModalOpen(true);
    setError(null);
  }, []);

  const handleDelete = useCallback(
    async (student: Student) => {
      if (!confirm(`${student.name} 학생을 비활성화하시겠습니까?`)) return;

      try {
        const res = await fetch(
          `/api/grade-admin/${grade}/students/${student.id}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "삭제에 실패했습니다.");
        }
        mutate();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "삭제에 실패했습니다.";
        alert(message);
      }
    },
    [grade, mutate]
  );

  const handleRestore = useCallback(
    async (student: Student) => {
      try {
        const res = await fetch(
          `/api/grade-admin/${grade}/students/${student.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: true }),
          }
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "복원에 실패했습니다.");
        }
        mutate();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "복원에 실패했습니다.";
        alert(message);
      }
    },
    [grade, mutate]
  );

  const handleSubmit = useCallback(
    async (formData: StudentFormData) => {
      setIsSubmitting(true);
      setError(null);

      try {
        if (editingStudent) {
          // 수정
          const res = await fetch(
            `/api/grade-admin/${grade}/students/${editingStudent.id}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: formData.name,
                classNumber: parseInt(formData.classNumber, 10),
                studentNumber: parseInt(formData.studentNumber, 10),
              }),
            }
          );
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "수정에 실패했습니다.");
          }
        } else {
          // 추가
          const res = await fetch(`/api/grade-admin/${grade}/students`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: formData.name,
              classNumber: parseInt(formData.classNumber, 10),
              studentNumber: parseInt(formData.studentNumber, 10),
            }),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "등록에 실패했습니다.");
          }
        }

        setModalOpen(false);
        setEditingStudent(null);
        mutate();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "처리에 실패했습니다.";
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingStudent, grade, mutate]
  );

  return (
    <div>
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {grade}학년 학생 관리
        </h1>
        <div className="flex items-center gap-3">
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체 반</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n}반
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowExcelModal(true)}
            className="px-4 py-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
          >
            Excel
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            + 학생 추가
          </button>
        </div>
      </div>

      <ExcelUploadModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        templateUrl="/api/admin/students/template"
        templateFilename="student_template.xlsx"
        uploadUrl={`/api/grade-admin/${grade}/students/bulk-upload`}
        onUploaded={() => mutate()}
        title={`${grade}학년 학생 Excel 일괄 업로드`}
      />

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 테이블 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600 sticky left-0 bg-gray-50 z-20">
                  이름
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  학년
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  반
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  번호
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  학번
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  상태
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    불러오는 중...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    등록된 학생이 없습니다.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr
                    key={student.id}
                    className={`hover:bg-gray-50 ${!student.isActive ? "opacity-50" : ""}`}
                  >
                    <td className="px-4 py-3 text-gray-900 font-medium sticky left-0 bg-white z-10">
                      {student.name}
                    </td>
                    <td className="px-4 py-3 text-gray-900">{student.grade}</td>
                    <td className="px-4 py-3 text-gray-900">
                      {student.classNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {student.studentNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                      {computeStudentId(
                        student.grade,
                        student.classNumber,
                        student.studentNumber
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {student.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                          활성
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                          비활성
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(student)}
                          className="px-2.5 py-1 text-xs text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                        >
                          수정
                        </button>
                        {student.isActive ? (
                          <button
                            onClick={() => handleDelete(student)}
                            className="px-2.5 py-1 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                          >
                            삭제
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestore(student)}
                            className="px-2.5 py-1 text-xs text-green-600 bg-green-50 rounded hover:bg-green-100 transition-colors"
                          >
                            복원
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && students.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
            총 {students.length}명
            {classFilter && ` (${classFilter}반)`}
          </div>
        )}
      </div>

      {/* 모달 */}
      <StudentModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingStudent(null);
          setError(null);
        }}
        onSubmit={handleSubmit}
        initialData={
          editingStudent
            ? {
                name: editingStudent.name,
                classNumber: String(editingStudent.classNumber),
                studentNumber: String(editingStudent.studentNumber),
              }
            : undefined
        }
        grade={grade}
        isLoading={isSubmitting}
      />
    </div>
  );
}
