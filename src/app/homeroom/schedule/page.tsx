"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";

type AssignmentData = {
  id: number;
  date: string;
  grade: number;
  sessionType: "afternoon" | "night";
};

type TeacherData = {
  id: number;
  name: string;
  grades: number[];
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const SESSION_LABELS: Record<string, string> = {
  afternoon: "오후",
  night: "야간",
};

export default function SchedulePage() {
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );

  const { data, mutate, isLoading } = useSWR<{
    assignments: AssignmentData[];
    teachers: TeacherData[];
  }>(`/api/homeroom/schedule?month=${month}`, fetcher);

  const assignments = data?.assignments ?? [];
  const teachers = data?.teachers ?? [];

  // 교체 모달 상태
  const [swapTarget, setSwapTarget] = useState<AssignmentData | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<number | "">("");
  const [reason, setReason] = useState("");
  const [showCrossGradeConfirm, setShowCrossGradeConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleSwapClick = useCallback((assignment: AssignmentData) => {
    setSwapTarget(assignment);
    setSelectedTeacher("");
    setReason("");
    setShowCrossGradeConfirm(false);
  }, []);

  const handleSwapSubmit = useCallback(async () => {
    if (!swapTarget || !selectedTeacher) return;

    // 다른 학년 교체인지 확인
    const teacher = teachers.find((t) => t.id === selectedTeacher);
    const isCrossGrade = teacher && !teacher.grades.includes(swapTarget.grade);

    if (isCrossGrade && !showCrossGradeConfirm) {
      setShowCrossGradeConfirm(true);
      return;
    }

    setProcessing(true);

    try {
      const res = await fetch(`/api/supervisor-assignments/${swapTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replacementTeacherId: selectedTeacher,
          reason: reason || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "교체에 실패했습니다.");
      }

      setSwapTarget(null);
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "교체에 실패했습니다.";
      alert(msg);
    } finally {
      setProcessing(false);
    }
  }, [swapTarget, selectedTeacher, reason, teachers, showCrossGradeConfirm, mutate]);

  const handleMonthChange = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">감독일정</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleMonthChange(-1)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            이전
          </button>
          <span className="text-sm font-medium text-gray-700 w-24 text-center">
            {month}
          </span>
          <button
            onClick={() => handleMonthChange(1)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            다음
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">날짜</th>
                <th className="px-3 py-3 text-center font-medium text-gray-600">학년</th>
                <th className="px-3 py-3 text-center font-medium text-gray-600">시간</th>
                <th className="px-3 py-3 text-center font-medium text-gray-600">교체</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    불러오는 중...
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    이번 달 감독 일정이 없습니다.
                  </td>
                </tr>
              ) : (
                assignments.map((a) => {
                  const dateObj = new Date(a.date + "T00:00:00");
                  const dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][
                    dateObj.getDay()
                  ];
                  const isPast = dateObj < new Date(new Date().toDateString());

                  return (
                    <tr key={a.id} className={`hover:bg-gray-50 ${isPast ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                        {a.date} ({dayOfWeek})
                      </td>
                      <td className="px-3 py-3 text-center text-gray-600">
                        {a.grade}학년
                      </td>
                      <td className="px-3 py-3 text-center text-gray-600">
                        {SESSION_LABELS[a.sessionType]}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {!isPast && (
                          <button
                            onClick={() => handleSwapClick(a)}
                            className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                          >
                            교체
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && assignments.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
            총 {assignments.length}건
          </div>
        )}
      </div>

      {/* 교체 모달 */}
      {swapTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">감독 교체</h2>
            <div className="text-sm text-gray-600 mb-4">
              {swapTarget.date} {swapTarget.grade}학년{" "}
              {SESSION_LABELS[swapTarget.sessionType]} 감독을 교체합니다.
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  교체 대상 교사
                </label>
                <select
                  value={selectedTeacher}
                  onChange={(e) => {
                    setSelectedTeacher(
                      e.target.value ? parseInt(e.target.value, 10) : ""
                    );
                    setShowCrossGradeConfirm(false);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">교사를 선택하세요</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.grades.length > 0 ? ` (${t.grades.join(",")}학년)` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  교체 사유 (선택)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="교체 사유를 입력하세요"
                />
              </div>

              {showCrossGradeConfirm && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2 text-sm text-yellow-800">
                  선택한 교사는 다른 학년 소속입니다. 정말 교체하시겠습니까?
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setSwapTarget(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSwapSubmit}
                disabled={!selectedTeacher || processing}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processing
                  ? "처리 중..."
                  : showCrossGradeConfirm
                    ? "확인 후 교체"
                    : "교체"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
