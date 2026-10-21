"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { SESSION_META, type SessionType } from "@/lib/sessions";
import { reasonLabel } from "@/lib/absence-reasons";
import { chrome } from "@/components/ui/chrome";
import { formatMonthDay } from "@/lib/format-date";

type AbsenceRequestData = {
  id: number;
  student: {
    id: number;
    name: string;
    grade: number;
    classNumber: number;
    studentNumber: number;
  };
  sessionType: SessionType;
  date: string;
  reasonType: string;
  detail: string | null;
  status: "pending" | "approved" | "rejected";
  reviewer: { id: number; name: string } | null;
  reviewedAt: string | null;
  createdAt: string;
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `${res.status} 오류가 발생했습니다.`);
  }
  return res.json();
};

const STATUS_LABELS: Record<string, string> = {
  pending: "대기중",
  approved: "승인",
  rejected: "반려",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const FILTERS = ["", "pending", "approved", "rejected"] as const;

export default function AbsenceRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const apiUrl = statusFilter
    ? `/api/homeroom/absence-requests?status=${statusFilter}`
    : "/api/homeroom/absence-requests";

  const { data, error, mutate, isLoading } = useSWR<{
    requests: AbsenceRequestData[];
  }>(apiUrl, fetcher);

  const requests = data?.requests ?? [];

  const handleAction = useCallback(
    async (id: number, action: "approved" | "rejected") => {
      const actionLabel = action === "approved" ? "승인" : "반려";
      if (!confirm(`이 신청을 ${actionLabel}하시겠습니까?`)) return;

      setProcessingId(id);
      setActionError(null);

      try {
        const res = await fetch(`/api/homeroom/absence-requests/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `${actionLabel}에 실패했습니다.`);
        }

        mutate();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : `${actionLabel}에 실패했습니다.`;
        setActionError(`${msg} 다시 시도하세요.`);
      } finally {
        setProcessingId(null);
      }
    },
    [mutate]
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-ink text-balance">불참신청 관리</h1>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="상태 필터">
          {FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              aria-pressed={statusFilter === status}
              className={chrome.chip(statusFilter === status)}
            >
              {status === "" ? "전체" : STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>

      <div role="status" aria-live="polite">
        {actionError && <div className={`${chrome.notice("error")} mb-3`}>{actionError}</div>}
      </div>

      <div className={`${chrome.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={`${chrome.tableHead} sticky top-0 z-10 border-b border-line`}>
              <tr>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium">학생</th>
                <th className="whitespace-nowrap px-3 py-3 text-center font-medium">날짜</th>
                <th className="whitespace-nowrap px-3 py-3 text-center font-medium">시간</th>
                <th className="whitespace-nowrap px-3 py-3 text-center font-medium">사유</th>
                <th className="whitespace-nowrap px-3 py-3 text-left font-medium">상세</th>
                <th className="whitespace-nowrap px-3 py-3 text-center font-medium">상태</th>
                <th className="whitespace-nowrap px-3 py-3 text-center font-medium">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-ink-muted">
                    불러오는 중…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6">
                    <div role="alert" className={chrome.notice("error")}>{error.message}</div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-ink-muted">
                    신청이 없습니다.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className={chrome.tableRowHover}>
                    <td className="whitespace-nowrap px-4 py-3 text-ink">
                      <div className="font-medium">{req.student.name}</div>
                      <div className="text-xs text-ink-muted tabular-nums">
                        {req.student.grade}-{req.student.classNumber} {req.student.studentNumber}번
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-center text-ink-muted tabular-nums">
                      {formatMonthDay(req.date)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-center text-ink-muted">
                      {SESSION_META[req.sessionType].shortLabel}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-center text-ink-muted">
                      {reasonLabel(req.reasonType)}
                    </td>
                    <td className="max-w-[240px] min-w-[8rem] px-3 py-3 text-ink-muted">
                      {req.detail ? (
                        <span title={req.detail} className="line-clamp-2 break-words">{req.detail}</span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-center">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[req.status]
                        }`}
                      >
                        {STATUS_LABELS[req.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-center">
                      {req.status === "pending" ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAction(req.id, "approved")}
                            disabled={processingId === req.id}
                            aria-label={`${req.student.name} ${formatMonthDay(req.date)} 신청 승인`}
                            className={`${chrome.primaryButton} px-3`}
                          >
                            승인
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAction(req.id, "rejected")}
                            disabled={processingId === req.id}
                            aria-label={`${req.student.name} ${formatMonthDay(req.date)} 신청 반려`}
                            className={`${chrome.secondaryButton} px-3`}
                          >
                            반려
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-muted">
                          {req.reviewer?.name}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && requests.length > 0 && (
          <div className="border-t border-line bg-canvas px-4 py-3 text-sm text-ink-muted">
            총 {requests.length}건
          </div>
        )}
      </div>
    </div>
  );
}
