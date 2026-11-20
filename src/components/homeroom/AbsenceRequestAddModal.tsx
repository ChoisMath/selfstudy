"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { getKstTodayString } from "@/lib/calendar";
import { REASON_LABELS, REASON_TYPES, type ReasonType } from "@/lib/absence-reasons";
import { SESSION_META, SESSION_TYPES, type SessionType } from "@/lib/sessions";

type StudentOption = {
  id: number;
  name: string;
  grade: number;
  classNumber: number;
  studentNumber: number;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const FIELD = "w-full min-h-9 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const CHOICE = "flex min-h-9 items-center px-3 rounded-md border cursor-pointer transition-colors text-sm whitespace-nowrap has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500";
const CHOICE_ON = "border-blue-500 bg-blue-50 text-blue-700 font-medium";
const CHOICE_OFF = "border-gray-300 text-gray-600 hover:bg-gray-50";

// 담임이 학생 대신 불참 신청을 승인 상태로 추가하는 창. 추가되면 onAdded 로 결과 문구를 넘기고 닫힌다.
export default function AbsenceRequestAddModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (message: string) => void;
}) {
  const { data, isLoading } = useSWR<{ students: StudentOption[] }>("/api/homeroom/students", fetcher);
  const students = data?.students ?? [];

  const [studentId, setStudentId] = useState<number | "">("");
  const [date, setDate] = useState(getKstTodayString);
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [reasonType, setReasonType] = useState<ReasonType>("academy");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleSession = (t: SessionType) =>
    setSessionTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (studentId === "") {
      setError("학생을 선택하세요.");
      return;
    }
    if (sessionTypes.length === 0) {
      setError("자습 시간을 하나 이상 선택하세요.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/homeroom/absence-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, date, sessionTypes, reasonType, detail }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "추가하지 못했습니다.");
        return;
      }
      const added = (body.created ?? 0) + (body.updated ?? 0);
      const skipped = body.skipped ?? 0;
      onAdded(
        added === 0
          ? "이미 승인된 신청이라 바뀐 것이 없습니다."
          : `불참신청 ${added}건을 승인 상태로 추가했습니다.${skipped > 0 ? ` 이미 승인된 ${skipped}건은 그대로 두었습니다.` : ""}`
      );
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center bg-black/40 p-2 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="absence-add-title"
        className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-2">
          <h2 id="absence-add-title" className="text-base font-bold text-gray-900 whitespace-nowrap">
            불참신청 추가
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-9 px-3 text-sm text-gray-600 rounded-md hover:bg-gray-100 whitespace-nowrap"
          >
            닫기
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-3 overflow-y-auto p-4">
          <p className="break-keep text-xs text-gray-500">
            담임이 추가한 신청은 바로 승인되어 출석부에 사유결석으로 표시됩니다.
          </p>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">학생</span>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value ? parseInt(e.target.value, 10) : "")}
              className={FIELD}
              autoFocus
            >
              <option value="">{isLoading ? "불러오는 중..." : "학생을 선택하세요"}</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.grade}-{s.classNumber} {s.studentNumber}번 {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">날짜</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={FIELD} required />
          </label>

          <fieldset>
            <legend className="mb-1 text-sm font-medium text-gray-700">자습 시간 (여러 개 선택 가능)</legend>
            <div className="flex flex-wrap gap-2">
              {SESSION_TYPES.map((t) => (
                <label key={t} className={`${CHOICE} ${sessionTypes.includes(t) ? CHOICE_ON : CHOICE_OFF}`}>
                  <input
                    type="checkbox"
                    checked={sessionTypes.includes(t)}
                    onChange={() => toggleSession(t)}
                    className="sr-only"
                  />
                  {SESSION_META[t].label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-1 text-sm font-medium text-gray-700">사유 유형</legend>
            <div className="flex flex-wrap gap-2">
              {REASON_TYPES.map((rt) => (
                <label key={rt} className={`${CHOICE} ${reasonType === rt ? CHOICE_ON : CHOICE_OFF}`}>
                  <input
                    type="radio"
                    name="reasonType"
                    value={rt}
                    checked={reasonType === rt}
                    onChange={() => setReasonType(rt)}
                    className="sr-only"
                  />
                  {REASON_LABELS[rt]}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">상세 사유 (선택)</span>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={2}
              maxLength={500}
              className={`${FIELD} resize-none`}
              placeholder="필요하면 상세 사유를 적으세요"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-9 px-4 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-9 px-4 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
            >
              {submitting ? "추가 중..." : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
