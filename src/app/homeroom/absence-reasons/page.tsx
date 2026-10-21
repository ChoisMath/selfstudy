"use client";

import { useId, useRef, useState } from "react";
import useSWR from "swr";
import { SESSION_TYPES, SESSION_META, type SessionType } from "@/lib/sessions";
import { chrome } from "@/components/ui/chrome";

type StudentData = {
  id: number;
  name: string;
  grade: number;
  classNumber: number;
  studentNumber: number;
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `${res.status} 오류가 발생했습니다.`);
  }
  return res.json();
};

const REASON_TYPES = [
  { value: "academy", label: "학원" },
  { value: "afterschool", label: "방과후" },
  { value: "illness", label: "질병" },
  { value: "custom", label: "기타" },
] as const;

/** 라디오를 감싼 칩 라벨 — 라디오는 sr-only, 라벨 전체(44px)가 히트 영역·포커스 링 대상 */
const radioChip = (active: boolean) =>
  `inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1 ${
    active ? "border-primary bg-primary text-white" : "border-line bg-butter text-ink-muted hover:bg-peach hover:text-ink"
  }`;

export default function AbsenceReasonsPage() {
  const { data, error: loadError } = useSWR<{ students: StudentData[] }>(
    "/api/homeroom/students",
    fetcher
  );

  const students = data?.students ?? [];
  const ids = useId();
  const studentId = `${ids}-student`;
  const dateId = `${ids}-date`;
  const detailId = `${ids}-detail`;
  const studentRef = useRef<HTMLSelectElement>(null);

  const [selectedStudent, setSelectedStudent] = useState<number | "">("");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  });
  const [sessionType, setSessionType] = useState<SessionType>("afternoon1");
  const [reasonType, setReasonType] = useState<string>("academy");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setMessage({ type: "error", text: "학생을 선택하세요." });
      studentRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/homeroom/absence-reasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent,
          date,
          sessionType,
          reasonType,
          detail: detail || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "등록에 실패했습니다.");
      }

      setMessage({ type: "success", text: "불참사유가 등록되었습니다." });
      setSelectedStudent("");
      setDetail("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "등록에 실패했습니다.";
      setMessage({ type: "error", text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink text-balance">불참사유 등록</h1>

      <div className={`${chrome.card} max-w-lg p-4 sm:p-6`}>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 학생 선택 */}
          <div>
            <label htmlFor={studentId} className={chrome.label}>
              학생
            </label>
            <select
              id={studentId}
              name="studentId"
              ref={studentRef}
              value={selectedStudent}
              onChange={(e) =>
                setSelectedStudent(e.target.value ? parseInt(e.target.value, 10) : "")
              }
              className={`${chrome.select} w-full`}
              required
            >
              <option value="">학생을 선택하세요</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.grade}-{s.classNumber} {s.studentNumber}번 {s.name}
                </option>
              ))}
            </select>
            {loadError && (
              <p role="alert" className="mt-1 text-xs text-red-700">학생 목록을 불러오지 못했습니다. 새로고침 후 다시 시도하세요.</p>
            )}
          </div>

          {/* 날짜 */}
          <div>
            <label htmlFor={dateId} className={chrome.label}>
              날짜
            </label>
            <input
              id={dateId}
              name="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={chrome.input}
              required
            />
          </div>

          {/* 세션 */}
          <fieldset>
            <legend className={chrome.label}>자습 시간</legend>
            <div className="flex gap-2 overflow-x-auto py-0.5">
              {SESSION_TYPES.map((t) => (
                <label key={t} className={radioChip(sessionType === t)}>
                  <input
                    type="radio"
                    name="sessionType"
                    value={t}
                    checked={sessionType === t}
                    onChange={() => setSessionType(t)}
                    className="sr-only"
                  />
                  <span>{SESSION_META[t].label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* 사유 타입 */}
          <fieldset>
            <legend className={chrome.label}>사유 유형</legend>
            <div className="flex flex-wrap gap-2 py-0.5">
              {REASON_TYPES.map((rt) => (
                <label key={rt.value} className={radioChip(reasonType === rt.value)}>
                  <input
                    type="radio"
                    name="reasonType"
                    value={rt.value}
                    checked={reasonType === rt.value}
                    onChange={(e) => setReasonType(e.target.value)}
                    className="sr-only"
                  />
                  <span>{rt.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* 상세 사유 */}
          <div>
            <label htmlFor={detailId} className={chrome.label}>
              상세 사유 (선택)
            </label>
            <textarea
              id={detailId}
              name="detail"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              autoComplete="off"
              className={`${chrome.input} resize-none py-2`}
              placeholder="예: 수학 학원 보강…"
            />
          </div>

          {/* 메시지 */}
          <div role="status" aria-live="polite">
            {message && (
              <div className={chrome.notice(message.type === "success" ? "ok" : "error")}>
                {message.text}
              </div>
            )}
          </div>

          {/* 제출 */}
          <button type="submit" disabled={submitting} aria-busy={submitting} className={`${chrome.primaryButton} w-full`}>
            {submitting ? "등록 중…" : "불참사유 등록"}
          </button>
        </form>
      </div>
    </div>
  );
}
