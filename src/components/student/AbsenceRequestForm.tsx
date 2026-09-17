"use client";

import { useState } from "react";
import { REASON_LABELS, REASON_TYPES, type ReasonType } from "@/lib/absence-reasons";
import { activeSessionTypesOn, type ParticipationDaysMap } from "@/lib/participation-days";
import { SESSION_META, SESSION_TYPES, type SessionType } from "@/lib/sessions";

const DISABLED_BUTTON = "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed";
const SELECTED_BUTTON = "border-blue-600 bg-blue-50 text-blue-700";
const IDLE_BUTTON = "border-gray-300 bg-white text-gray-600 hover:bg-gray-50";

export default function AbsenceRequestForm({
  initialDate,
  initialSessionTypes,
  today,
  participationDays,
  onClose,
  onSubmitted,
}: {
  initialDate: string;
  initialSessionTypes: SessionType[];
  today: string;
  participationDays: ParticipationDaysMap;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [date, setDate] = useState(initialDate);
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>(initialSessionTypes);
  const [reasonType, setReasonType] = useState<ReasonType>("academy");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const activeTypes = activeSessionTypesOn(participationDays, date);
  const allActiveSelected = activeTypes.length > 0 && activeTypes.every((t) => sessionTypes.includes(t));

  function handleDateChange(nextDate: string) {
    setDate(nextDate);
    // 날짜가 바뀌면 그 요일에 비활성인 세션은 선택에서 뺀다
    const nextActive = activeSessionTypesOn(participationDays, nextDate);
    setSessionTypes((prev) => prev.filter((t) => nextActive.includes(t)));
  }

  function toggleSessionType(sessionType: SessionType) {
    setSessionTypes((prev) =>
      prev.includes(sessionType) ? prev.filter((t) => t !== sessionType) : [...prev, sessionType]
    );
  }

  function toggleAll() {
    setSessionTypes(allActiveSelected ? [] : activeTypes);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!date) {
      setError("날짜를 선택해주세요.");
      return;
    }
    if (sessionTypes.length === 0) {
      setError("자습 시간을 하나 이상 선택해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/student/absence-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          sessionTypes,
          reasonType,
          detail: reasonType === "custom" && detail.trim() ? detail.trim() : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "신청에 실패했습니다.");
      }
      onSubmitted();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "신청에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-gray-900 whitespace-nowrap">불참 신청하기</h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 px-4 text-sm font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 whitespace-nowrap transition-colors"
        >
          닫기
        </button>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
        <input
          type="date"
          value={date}
          min={today}
          onChange={(e) => handleDateChange(e.target.value)}
          className="w-full min-h-11 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">세션</label>
        <div className="flex gap-2 overflow-x-auto">
          {SESSION_TYPES.map((sessionType) => {
            const disabled = !activeTypes.includes(sessionType);
            const selected = sessionTypes.includes(sessionType);
            return (
              <button
                key={sessionType}
                type="button"
                disabled={disabled}
                onClick={() => toggleSessionType(sessionType)}
                className={`flex-1 min-h-11 px-3 py-2 text-sm font-medium rounded-md border transition-colors whitespace-nowrap ${
                  disabled ? DISABLED_BUTTON : selected ? SELECTED_BUTTON : IDLE_BUTTON
                }`}
              >
                {SESSION_META[sessionType].shortLabel}
              </button>
            );
          })}
          <button
            type="button"
            disabled={activeTypes.length === 0}
            onClick={toggleAll}
            className={`min-h-11 px-3 py-2 text-sm font-medium rounded-md border transition-colors whitespace-nowrap ${
              activeTypes.length === 0
                ? DISABLED_BUTTON
                : allActiveSelected
                  ? "border-blue-600 bg-blue-100 text-blue-800"
                  : "border-dashed border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            전체
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          {activeTypes.length === 0 ? "해당 날짜에는 참여 일정이 없습니다." : "여러 시간을 함께 선택할 수 있습니다."}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">사유</label>
        <div className="grid grid-cols-4 gap-2">
          {REASON_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setReasonType(type)}
              className={`min-h-11 px-2 text-sm font-medium rounded-md border transition-colors whitespace-nowrap ${
                reasonType === type ? SELECTED_BUTTON : IDLE_BUTTON
              }`}
            >
              {REASON_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {reasonType === "custom" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">상세 사유 (선택)</label>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="상세 사유를 입력해주세요"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full min-h-11 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "신청 중..." : "신청하기"}
      </button>
    </form>
  );
}
