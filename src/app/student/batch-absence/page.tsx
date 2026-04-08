"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type StudentData = {
  id: number;
  studentNumber: number;
  name: string;
  afternoon: boolean;
  night: boolean;
  existingRequests: {
    afternoon?: string;
    night?: string;
  };
};

type RowState = {
  checked: boolean;
  afternoonSelected: boolean;
  nightSelected: boolean;
  reasonType: string;
  detail: string;
};

const REASON_OPTIONS = [
  { value: "academy", label: "학원" },
  { value: "afterschool", label: "방과후" },
  { value: "illness", label: "질병" },
] as const;

function initRowState(): RowState {
  return {
    checked: false,
    afternoonSelected: false,
    nightSelected: false,
    reasonType: "academy",
    detail: "",
  };
}

function initAllRows(students: StudentData[]): Record<number, RowState> {
  const rows: Record<number, RowState> = {};
  for (const s of students) {
    rows[s.id] = initRowState();
  }
  return rows;
}

/** Whether a student has at least one selectable session (participates and no existing request) */
function hasSelectableSession(s: StudentData): boolean {
  return (
    (s.afternoon && !s.existingRequests.afternoon) ||
    (s.night && !s.existingRequests.night)
  );
}

export default function BatchAbsencePage() {
  const { data, error, isLoading, mutate } = useSWR<{
    students: StudentData[];
    today: string;
  }>("/api/student/batch-absence", fetcher);

  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize rows when data loads
  if (data?.students && !initialized) {
    setRows(initAllRows(data.students));
    setInitialized(true);
  }

  const updateRow = useCallback(
    (studentId: number, patch: Partial<RowState>) => {
      setRows((prev) => ({
        ...prev,
        [studentId]: { ...prev[studentId], ...patch },
      }));
    },
    []
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (!data?.students) return;
      setRows((prev) => {
        const next = { ...prev };
        for (const s of data.students) {
          if (hasSelectableSession(s)) {
            next[s.id] = { ...next[s.id], checked };
          }
        }
        return next;
      });
    },
    [data?.students]
  );

  // Submit handler
  const handleSubmit = async () => {
    if (!data?.students) return;

    const requests: {
      studentId: number;
      sessionType: string;
      reasonType: string;
      detail: string;
    }[] = [];

    for (const s of data.students) {
      const row = rows[s.id];
      if (!row?.checked) continue;

      if (row.afternoonSelected) {
        requests.push({
          studentId: s.id,
          sessionType: "afternoon",
          reasonType: row.reasonType,
          detail: row.detail.trim(),
        });
      }
      if (row.nightSelected) {
        requests.push({
          studentId: s.id,
          sessionType: "night",
          reasonType: row.reasonType,
          detail: row.detail.trim(),
        });
      }
    }

    if (requests.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/student/batch-absence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests }),
      });

      if (!res.ok) {
        const body = await res.json();
        alert(body.error || "신청에 실패했습니다.");
        return;
      }

      const result = await res.json();
      alert(
        `${result.created}건 신청 완료${
          result.skipped > 0 ? ` (${result.skipped}건 중복 건너뜀)` : ""
        }`
      );

      // Refresh data and reset rows
      await mutate();
      setInitialized(false);
    } catch {
      alert("신청 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // Error: not a helper
  if (error || (data && !data.students)) {
    return (
      <div className="text-center py-12 text-gray-500">
        도우미 학생만 이용할 수 있습니다.
      </div>
    );
  }

  // Loading
  if (isLoading || !data) {
    return (
      <div className="text-center py-12 text-gray-400">불러오는 중...</div>
    );
  }

  const { students, today } = data;

  // No participating students
  const anyParticipating = students.some((s) => s.afternoon || s.night);
  if (!anyParticipating) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">일괄 불참신청</h2>
          <span className="text-sm text-gray-500">{today}</span>
        </div>
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
          오늘 자습 참여 대상 학생이 없습니다.
        </div>
      </div>
    );
  }

  // Check if submit should be disabled
  const hasValidSelection = students.some((s) => {
    const row = rows[s.id];
    return (
      row?.checked && (row.afternoonSelected || row.nightSelected)
    );
  });

  const allSelectableChecked =
    students.filter(hasSelectableSession).length > 0 &&
    students
      .filter(hasSelectableSession)
      .every((s) => rows[s.id]?.checked);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">일괄 불참신청</h2>
        <span className="text-sm text-gray-500">{today}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-3 py-2.5 text-center w-10">
                <input
                  type="checkbox"
                  checked={allSelectableChecked}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 uppercase w-12">
                번호
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase w-16">
                이름
              </th>
              <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">
                자습유형
              </th>
              <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">
                사유
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const row = rows[s.id] ?? initRowState();
              const isChecked = row.checked;
              const canSelect = hasSelectableSession(s);

              return (
                <tr
                  key={s.id}
                  className={`border-b border-gray-100 ${
                    !isChecked ? "opacity-50" : ""
                  }`}
                >
                  {/* Checkbox */}
                  <td className="px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={!canSelect}
                      onChange={(e) =>
                        updateRow(s.id, { checked: e.target.checked })
                      }
                      className="rounded border-gray-300 disabled:opacity-30"
                    />
                  </td>

                  {/* Student number */}
                  <td className="px-3 py-2.5 text-center text-gray-700 font-medium">
                    {s.studentNumber}
                  </td>

                  {/* Name */}
                  <td className="px-3 py-2.5 text-gray-900 font-medium whitespace-nowrap">
                    {s.name}
                  </td>

                  {/* Session type buttons */}
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1.5 justify-center">
                      <SessionButton
                        label="오후"
                        participates={s.afternoon}
                        existingRequest={s.existingRequests.afternoon}
                        selected={row.afternoonSelected}
                        enabled={isChecked}
                        onClick={() =>
                          updateRow(s.id, {
                            afternoonSelected: !row.afternoonSelected,
                          })
                        }
                      />
                      <SessionButton
                        label="야간"
                        participates={s.night}
                        existingRequest={s.existingRequests.night}
                        selected={row.nightSelected}
                        enabled={isChecked}
                        onClick={() =>
                          updateRow(s.id, {
                            nightSelected: !row.nightSelected,
                          })
                        }
                      />
                    </div>
                  </td>

                  {/* Reason */}
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex gap-1 justify-center">
                        {REASON_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={!isChecked}
                            onClick={() =>
                              updateRow(s.id, { reasonType: opt.value })
                            }
                            className={`px-2 py-1 text-xs rounded border transition-colors ${
                              row.reasonType === opt.value
                                ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                                : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={row.detail}
                        disabled={!isChecked}
                        onChange={(e) =>
                          updateRow(s.id, { detail: e.target.value })
                        }
                        placeholder="상세사유"
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Submit button */}
      <div className="flex justify-center mt-6">
        <button
          type="button"
          disabled={!hasValidSelection || submitting}
          onClick={handleSubmit}
          className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-2.5 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "신청 중..." : "일괄신청"}
        </button>
      </div>
    </div>
  );
}

/** Individual session button (오후 / 야간) */
function SessionButton({
  label,
  participates,
  existingRequest,
  selected,
  enabled,
  onClick,
}: {
  label: string;
  participates: boolean;
  existingRequest?: string;
  selected: boolean;
  enabled: boolean;
  onClick: () => void;
}) {
  // Does not participate today
  if (!participates) {
    return (
      <button
        type="button"
        disabled
        className="px-3 py-1 text-xs rounded border bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
      >
        {label}
      </button>
    );
  }

  // Already has existing request
  if (existingRequest) {
    return (
      <button
        type="button"
        disabled
        className="px-3 py-1 text-xs rounded border bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
      >
        신청됨
      </button>
    );
  }

  // Selectable: sky-blue default, red when selected for absence
  if (selected && enabled) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="px-3 py-1 text-xs rounded border bg-red-100 text-red-700 border-red-300 font-medium transition-colors"
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      className={`px-3 py-1 text-xs rounded border transition-colors ${
        enabled
          ? "bg-sky-100 text-sky-700 border-sky-300 hover:bg-sky-200"
          : "bg-sky-100 text-sky-700 border-sky-300 opacity-60 cursor-not-allowed"
      }`}
    >
      {label}
    </button>
  );
}
