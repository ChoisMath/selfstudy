"use client";

import { useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const SESSION_OPTIONS = [
  { value: "afternoon", label: "오후자습" },
  { value: "night", label: "야간자습" },
] as const;

const REASON_OPTIONS = [
  { value: "academy", label: "학원" },
  { value: "afterschool", label: "방과후" },
  { value: "illness", label: "질병" },
  { value: "custom", label: "기타" },
] as const;

const REASON_LABELS: Record<string, string> = {
  academy: "학원",
  afterschool: "방과후",
  illness: "질병",
  custom: "기타",
};

const STATUS_LABELS: Record<string, { text: string; className: string }> = {
  pending: { text: "대기중", className: "bg-yellow-100 text-yellow-700" },
  approved: { text: "승인", className: "bg-green-100 text-green-700" },
  rejected: { text: "반려", className: "bg-red-100 text-red-700" },
};

type AbsenceRequestItem = {
  id: number;
  date: string;
  sessionType: string;
  reasonType: string;
  detail: string | null;
  status: string;
  createdAt: string;
};

export default function AbsenceRequestsPage() {
  const { data, mutate, isLoading } = useSWR<{ requests: AbsenceRequestItem[] }>(
    "/api/student/absence-requests",
    fetcher
  );

  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState("");
  const [sessionType, setSessionType] = useState("afternoon");
  const [reasonType, setReasonType] = useState("academy");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 오늘 날짜 (YYYY-MM-DD)
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })).toISOString().split("T")[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!date) {
      setError("날짜를 선택해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/student/absence-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          sessionType,
          reasonType,
          detail: detail.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "신청에 실패했습니다.");
      }

      // 성공: 폼 초기화 및 목록 갱신
      setDate("");
      setSessionType("afternoon");
      setReasonType("academy");
      setDetail("");
      setShowForm(false);
      mutate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "신청에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const requests = data?.requests ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">불참신청</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            showForm
              ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {showForm ? "닫기" : "불참 신청하기"}
        </button>
      </div>

      {/* 신청 폼 */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg border border-gray-200 p-4 mb-6 space-y-4"
        >
          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              날짜
            </label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              세션
            </label>
            <div className="flex gap-2">
              {SESSION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSessionType(opt.value)}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                    sessionType === opt.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              사유
            </label>
            <div className="grid grid-cols-2 gap-2">
              {REASON_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setReasonType(opt.value)}
                  className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                    reasonType === opt.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              상세 사유 (선택)
            </label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="상세 사유를 입력해주세요"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "신청 중..." : "신청하기"}
          </button>
        </form>
      )}

      {/* 신청 내역 */}
      <div>
        <h3 className="text-sm font-medium text-gray-600 mb-3">신청 내역</h3>

        {isLoading ? (
          <div className="text-center py-8 text-gray-400">불러오는 중...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-white rounded-lg border border-gray-200">
            신청 내역이 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((req) => {
              const statusInfo = STATUS_LABELS[req.status] || {
                text: req.status,
                className: "bg-gray-100 text-gray-600",
              };
              const d = new Date(req.date + "T00:00:00Z");
              const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
              const dayName = dayNames[d.getUTCDay()];

              return (
                <div
                  key={req.id}
                  className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {d.getUTCMonth() + 1}/{d.getUTCDate()}({dayName}){" "}
                      {req.sessionType === "afternoon" ? "오후" : "야간"}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {REASON_LABELS[req.reasonType] || req.reasonType}
                      {req.detail && ` - ${req.detail}`}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusInfo.className}`}
                  >
                    {statusInfo.text}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
