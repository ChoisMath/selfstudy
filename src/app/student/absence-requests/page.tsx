"use client";

import Link from "next/link";
import useSWR from "swr";
import { SESSION_META, type SessionType } from "@/lib/sessions";
import { reasonLabel } from "@/lib/absence-reasons";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const STATUS_LABELS: Record<string, { text: string; className: string }> = {
  pending: { text: "대기중", className: "bg-yellow-100 text-yellow-700" },
  approved: { text: "승인", className: "bg-green-100 text-green-700" },
  rejected: { text: "반려", className: "bg-red-100 text-red-700" },
};

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

type AbsenceRequestItem = {
  id: number;
  date: string;
  sessionType: SessionType;
  reasonType: string;
  detail: string | null;
  status: string;
  createdAt: string;
};

export default function AbsenceRequestsPage() {
  const { data, isLoading } = useSWR<{ requests: AbsenceRequestItem[] }>(
    "/api/student/absence-requests",
    fetcher
  );
  const requests = data?.requests ?? [];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">불참목록</h2>
      <p className="mb-4 flex flex-wrap items-center gap-x-1 text-sm text-gray-500">
        <span>불참 신청은</span>
        <Link href="/student" className="inline-flex min-h-11 items-center px-1 font-medium text-blue-600 underline whitespace-nowrap">
          참여일정
        </Link>
        <span>탭에서 요일을 눌러 할 수 있습니다.</span>
      </p>

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
            const dayName = DAY_NAMES[d.getUTCDay()];

            return (
              <div
                key={req.id}
                className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">
                    {d.getUTCMonth() + 1}/{d.getUTCDate()}({dayName}){" "}
                    {SESSION_META[req.sessionType]?.shortLabel ?? req.sessionType}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                    {reasonLabel(req.reasonType)}
                    {req.detail && ` - ${req.detail}`}
                  </div>
                </div>
                <span className={`shrink-0 px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${statusInfo.className}`}>
                  {statusInfo.text}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
