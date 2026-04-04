"use client";

import { useState } from "react";

type SeatingPeriod = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  grade: number;
  isActive: boolean;
  createdAt: string;
};

type PeriodFormData = {
  name: string;
  startDate: string;
  endDate: string;
};

function PeriodModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PeriodFormData) => void;
  initialData?: PeriodFormData;
  isLoading: boolean;
}) {
  const [form, setForm] = useState<PeriodFormData>(
    initialData ?? { name: "", startDate: "", endDate: "" }
  );

  // Reset form when modal opens
  useState(() => {
    if (isOpen) {
      setForm(initialData ?? { name: "", startDate: "", endDate: "" });
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {initialData ? "배치 기간 수정" : "배치 기간 추가"}
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
              기간 이름
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="예: 4월 1주차"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                시작일
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                종료일
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function SeatingPeriodList({
  grade,
  periods,
  isLoading,
  error,
  onSelect,
  onMutate,
}: {
  grade: number;
  periods: {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    grade: number;
    isActive: boolean;
    createdAt: string;
  }[];
  isLoading: boolean;
  error: unknown;
  onSelect: (period: SeatingPeriod) => void;
  onMutate: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SeatingPeriod | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (data: PeriodFormData) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/grade-admin/${grade}/seating-periods`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "생성 실패");
        return;
      }
      setModalOpen(false);
      onMutate();
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (data: PeriodFormData) => {
    if (!editTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/grade-admin/${grade}/seating-periods/${editTarget.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "수정 실패");
        return;
      }
      setEditTarget(null);
      onMutate();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("이 배치 기간과 관련된 모든 좌석 배치가 삭제됩니다. 계속하시겠습니까?")) {
      return;
    }
    const res = await fetch(`/api/grade-admin/${grade}/seating-periods/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "삭제 실패");
      return;
    }
    onMutate();
  };

  const handleToggleActive = async (period: SeatingPeriod) => {
    const res = await fetch(
      `/api/grade-admin/${grade}/seating-periods/${period.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !period.isActive }),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "변경 실패");
      return;
    }
    onMutate();
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-500">불러오는 중...</div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        데이터를 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          {grade}학년 좌석 배치 기간
        </h2>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          + 기간 추가
        </button>
      </div>

      {periods.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-lg border">
          등록된 배치 기간이 없습니다.
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  이름
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  시작일
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  종료일
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">
                  상태
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {periods.map((period) => (
                <tr key={period.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onSelect(period)}
                      className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                    >
                      {period.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(period.startDate)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(period.endDate)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(period)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                        period.isActive
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {period.isActive ? "활성" : "비활성"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onSelect(period)}
                        className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        좌석 편집
                      </button>
                      <button
                        onClick={() =>
                          setEditTarget({
                            ...period,
                          })
                        }
                        className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(period.id)}
                        className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 생성 모달 */}
      <PeriodModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        isLoading={submitting}
      />

      {/* 수정 모달 */}
      {editTarget && (
        <PeriodModal
          isOpen={true}
          onClose={() => setEditTarget(null)}
          onSubmit={handleEdit}
          initialData={{
            name: editTarget.name,
            startDate: editTarget.startDate.slice(0, 10),
            endDate: editTarget.endDate.slice(0, 10),
          }}
          isLoading={submitting}
        />
      )}
    </div>
  );
}
