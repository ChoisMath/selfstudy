"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  CLASSROOM_LIMITS,
  COLS_BY_LAYOUT,
  CORRIDOR_SIDES,
  CORRIDOR_SIDE_LABELS,
  LAYOUT_TYPES,
  LAYOUT_TYPE_LABELS,
  isGeometryChanged,
  parseClassroomConfig,
  seatCountOf,
  type ClassroomConfig,
  type ClassroomLayoutType,
  type CorridorSide,
} from "@/lib/seats/classroom-config";

type ClassroomSummary = {
  id: number;
  classNumber: number;
  corridorSide: CorridorSide;
  layoutType: ClassroomLayoutType;
  sortOrder: number;
  rowsPerDivision: number[];
  seatCount: number;
  assignedCount: number;
};

type FormState = {
  classNumber: string;
  corridorSide: CorridorSide;
  layoutType: ClassroomLayoutType;
  rowsPerDivision: number[];
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const DEFAULT_FORM: FormState = {
  classNumber: "",
  corridorSide: "right",
  layoutType: "division",
  rowsPerDivision: [3, 3, 3],
};

function formFromSummary(summary: ClassroomSummary): FormState {
  return {
    classNumber: String(summary.classNumber),
    corridorSide: summary.corridorSide,
    layoutType: summary.layoutType,
    rowsPerDivision: [...summary.rowsPerDivision],
  };
}

function resizeRows(rows: number[], count: number): number[] {
  const fill = rows[rows.length - 1] ?? CLASSROOM_LIMITS.rows.min;
  return Array.from({ length: count }, (_, i) => rows[i] ?? fill);
}

function LayoutPreview({ config }: { config: ClassroomConfig }) {
  const cols = COLS_BY_LAYOUT[config.layoutType];
  return (
    <div className="flex items-end gap-2 overflow-x-auto py-1">
      {config.rowsPerDivision.map((rows, division) => (
        <div
          key={division}
          className="grid gap-0.5"
          style={{ gridTemplateColumns: `repeat(${cols}, 12px)` }}
        >
          {Array.from({ length: rows * cols }, (_, i) => (
            <div key={i} className="h-2 w-3 rounded-[2px] border border-gray-400 bg-white" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function ClassroomConfigModal({
  grade,
  onClose,
  onChanged,
}: {
  grade: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const listUrl = `/api/grade-admin/${grade}/classrooms`;
  const { data, mutate, isLoading } = useSWR<{ classrooms: ClassroomSummary[] }>(listUrl, fetcher);
  const classrooms = data?.classrooms ?? [];

  const [editing, setEditing] = useState<ClassroomSummary | "new" | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const openNew = () => {
    setForm(DEFAULT_FORM);
    setError(null);
    setEditing("new");
  };

  const openEdit = (summary: ClassroomSummary) => {
    setForm(formFromSummary(summary));
    setError(null);
    setEditing(summary);
  };

  const parsed = parseClassroomConfig(form);
  const previewConfig = parsed.ok ? parsed.config : null;

  const notifyChanged = async () => {
    await mutate();
    onChanged();
  };

  const handleSubmit = async () => {
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const config = parsed.config;

    const target = editing === "new" ? null : editing;
    if (target) {
      const existingRooms = target.rowsPerDivision.map((rows, index) => ({
        cols: COLS_BY_LAYOUT[target.layoutType],
        rows,
        sortOrder: index + 1,
      }));
      if (isGeometryChanged(existingRooms, config) && target.assignedCount > 0) {
        const ok = confirm(
          `${grade}-${target.classNumber}반의 책상 구조가 바뀌어 현재 배정된 ${target.assignedCount}명의 좌석이 초기화됩니다. 계속할까요?`
        );
        if (!ok) return;
      }
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(target ? `${listUrl}/${target.id}` : listUrl, {
        method: target ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "저장에 실패했습니다.");
        return;
      }
      await notifyChanged();
      setEditing(null);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (summary: ClassroomSummary) => {
    const suffix = summary.assignedCount > 0 ? ` 배정된 ${summary.assignedCount}명의 좌석이 초기화됩니다.` : "";
    if (!confirm(`${grade}-${summary.classNumber}반 교실을 삭제할까요?${suffix}`)) return;
    setBusy(true);
    try {
      const res = await fetch(`${listUrl}/${summary.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? "삭제에 실패했습니다.");
        return;
      }
      await notifyChanged();
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const divisionWord = form.layoutType === "division" ? "분단" : "열";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="교실 구조 설정"
        className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h3 className="whitespace-nowrap text-lg font-bold text-gray-900">{grade}학년 교실 구조 설정</h3>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 whitespace-nowrap rounded-md px-3 text-sm text-gray-600 hover:bg-gray-100"
          >
            닫기
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {editing === null ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="whitespace-nowrap text-sm text-gray-500">칠판·교탁은 항상 아래쪽입니다.</p>
                <button
                  type="button"
                  onClick={openNew}
                  className="min-h-11 whitespace-nowrap rounded-md bg-blue-600 px-4 text-sm text-white hover:bg-blue-700"
                >
                  학급 추가
                </button>
              </div>

              {isLoading ? (
                <div className="py-8 text-center text-gray-400">불러오는 중...</div>
              ) : classrooms.length === 0 ? (
                <div className="rounded-lg border py-8 text-center text-gray-400">등록된 학급 교실이 없습니다.</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-[2] bg-gray-50 text-left text-gray-600">
                      <tr>
                        <th className="whitespace-nowrap px-3 py-2">학급</th>
                        <th className="whitespace-nowrap px-3 py-2">유형</th>
                        <th className="whitespace-nowrap px-3 py-2">복도</th>
                        <th className="whitespace-nowrap px-3 py-2">행 수</th>
                        <th className="whitespace-nowrap px-3 py-2">좌석</th>
                        <th className="whitespace-nowrap px-3 py-2">배정</th>
                        <th className="whitespace-nowrap px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {classrooms.map((c) => (
                        <tr key={c.id} className="border-t">
                          <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">{grade}-{c.classNumber}반</td>
                          <td className="whitespace-nowrap px-3 py-2">{LAYOUT_TYPE_LABELS[c.layoutType]}</td>
                          <td className="whitespace-nowrap px-3 py-2">{CORRIDOR_SIDE_LABELS[c.corridorSide]}</td>
                          <td className="whitespace-nowrap px-3 py-2">{c.rowsPerDivision.join(" / ")}</td>
                          <td className="whitespace-nowrap px-3 py-2">{c.seatCount}석</td>
                          <td className="whitespace-nowrap px-3 py-2">{c.assignedCount}명</td>
                          <td className="whitespace-nowrap px-3 py-1">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(c)}
                                className="min-h-11 whitespace-nowrap rounded-md border px-3 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                수정
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleDelete(c)}
                                className="min-h-11 whitespace-nowrap rounded-md border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
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
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-3">
                <span className="w-24 shrink-0 whitespace-nowrap text-sm text-gray-700">반 번호</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={CLASSROOM_LIMITS.classNumber.min}
                  max={CLASSROOM_LIMITS.classNumber.max}
                  value={form.classNumber}
                  onChange={(e) => setForm({ ...form, classNumber: e.target.value })}
                  className="min-h-11 w-24 rounded-md border px-3 text-sm"
                />
              </label>

              <div className="flex items-center gap-3">
                <span className="w-24 shrink-0 whitespace-nowrap text-sm text-gray-700">복도 위치</span>
                <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                  {CORRIDOR_SIDES.map((side) => (
                    <button
                      key={side}
                      type="button"
                      onClick={() => setForm({ ...form, corridorSide: side })}
                      className={`min-h-11 whitespace-nowrap rounded-md px-4 text-sm ${
                        form.corridorSide === side ? "bg-white font-medium text-blue-700 shadow-sm" : "text-gray-600"
                      }`}
                    >
                      {CORRIDOR_SIDE_LABELS[side]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="w-24 shrink-0 whitespace-nowrap text-sm text-gray-700">배치 유형</span>
                <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                  {LAYOUT_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm({ ...form, layoutType: type })}
                      className={`min-h-11 whitespace-nowrap rounded-md px-4 text-sm ${
                        form.layoutType === type ? "bg-white font-medium text-blue-700 shadow-sm" : "text-gray-600"
                      }`}
                    >
                      {LAYOUT_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3">
                <span className="w-24 shrink-0 whitespace-nowrap text-sm text-gray-700">{divisionWord} 개수</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={CLASSROOM_LIMITS.divisions.min}
                  max={CLASSROOM_LIMITS.divisions.max}
                  value={form.rowsPerDivision.length}
                  onChange={(e) => {
                    const count = Math.min(
                      CLASSROOM_LIMITS.divisions.max,
                      Math.max(CLASSROOM_LIMITS.divisions.min, Number(e.target.value) || CLASSROOM_LIMITS.divisions.min)
                    );
                    setForm({ ...form, rowsPerDivision: resizeRows(form.rowsPerDivision, count) });
                  }}
                  className="min-h-11 w-24 rounded-md border px-3 text-sm"
                />
              </label>

              <div className="flex items-start gap-3">
                <span className="w-24 shrink-0 whitespace-nowrap pt-3 text-sm text-gray-700">{divisionWord}별 행 수</span>
                <div className="flex flex-wrap gap-2">
                  {form.rowsPerDivision.map((rows, index) => (
                    <label key={index} className="flex items-center gap-1 text-sm text-gray-600">
                      <span className="whitespace-nowrap">{divisionWord}{index + 1}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={CLASSROOM_LIMITS.rows.min}
                        max={CLASSROOM_LIMITS.rows.max}
                        value={rows}
                        onChange={(e) => {
                          const next = [...form.rowsPerDivision];
                          next[index] = Number(e.target.value);
                          setForm({ ...form, rowsPerDivision: next });
                        }}
                        className="min-h-11 w-16 rounded-md border px-2 text-sm"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border bg-gray-50 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="whitespace-nowrap text-xs text-gray-500">미리보기 (아래가 칠판)</span>
                  <span className="whitespace-nowrap text-xs font-medium text-gray-700">
                    {previewConfig ? `총 ${seatCountOf(previewConfig)}석` : "입력값을 확인하세요"}
                  </span>
                </div>
                {previewConfig ? <LayoutPreview config={previewConfig} /> : null}
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="min-h-11 whitespace-nowrap rounded-md border px-4 text-sm text-gray-700"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleSubmit}
                  className="min-h-11 whitespace-nowrap rounded-md bg-blue-600 px-4 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
