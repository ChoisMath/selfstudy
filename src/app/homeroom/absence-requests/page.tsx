"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";

type AbsenceRequestData = {
  id: number;
  student: {
    id: number;
    name: string;
    grade: number;
    classNumber: number;
    studentNumber: number;
  };
  sessionType: "afternoon" | "night";
  date: string;
  reasonType: string;
  detail: string | null;
  status: "pending" | "approved" | "rejected";
  reviewer: { id: number; name: string } | null;
  reviewedAt: string | null;
  createdAt: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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

const REASON_LABELS: Record<string, string> = {
  academy: "학원",
  afterschool: "방과후",
  illness: "질병",
  custom: "기타",
};

const SESSION_LABELS: Record<string, string> = {
  afternoon: "오후",
  night: "야간",
};

export default function AbsenceRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [processingId, setProcessingId] = useState<number | null>(null);

  const apiUrl = statusFilter
    ? `/api/homeroom/absence-requests?status=${statusFilter}`
    : "/api/homeroom/absence-requests";

  const { data, mutate, isLoading } = useSWR<{
    requests: AbsenceRequestData[];
  }>(apiUrl, fetcher);

  const requests = data?.requests ?? [];

  const handleAction = useCallback(
    async (id: number, action: "approved" | "rejected") => {
      const actionLabel = action === "approved" ? "승인" : "반려";
      if (!confirm(`이 신청을 ${actionLabel}하시겠습니까?`)) return;

      setProcessingId(id);

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
        alert(msg);
      } finally {
        setProcessingId(null);
      }
    },
    [mutate]
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">불참신청 관리</h1>
        <div className="flex items-center gap-2">
          {["", "pending", "approved", "rejected"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                statusFilter === status
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {status === "" ? "전체" : STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">학생</th>
                <th className="px-3 py-3 text-center font-medium text-gray-600">날짜</th>
                <th className="px-3 py-3 text-center font-medium text-gray-600">시간</th>
                <th className="px-3 py-3 text-center font-medium text-gray-600">사유</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">상세</th>
                <th className="px-3 py-3 text-center font-medium text-gray-600">상태</th>
                <th className="px-3 py-3 text-center font-medium text-gray-600">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    불러오는 중...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    신청이 없습니다.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                      <div className="font-medium">{req.student.name}</div>
                      <div className="text-xs text-gray-500">
                        {req.student.grade}-{req.student.classNumber} {req.student.studentNumber}번
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-gray-600 whitespace-nowrap">
                      {req.date}
                    </td>
                    <td className="px-3 py-3 text-center text-gray-600">
                      {SESSION_LABELS[req.sessionType]}
                    </td>
                    <td className="px-3 py-3 text-center text-gray-600">
                      {REASON_LABELS[req.reasonType] ?? req.reasonType}
                    </td>
                    <td className="px-3 py-3 text-gray-600 max-w-[200px] truncate">
                      {req.detail || "-"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                          STATUS_COLORS[req.status]
                        }`}
                      >
                        {STATUS_LABELS[req.status]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      {req.status === "pending" ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleAction(req.id, "approved")}
                            disabled={processingId === req.id}
                            className="px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100 disabled:opacity-50 transition-colors"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => handleAction(req.id, "rejected")}
                            disabled={processingId === req.id}
                            className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50 transition-colors"
                          >
                            반려
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">
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
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
            총 {requests.length}건
          </div>
        )}
      </div>
    </div>
  );
}
