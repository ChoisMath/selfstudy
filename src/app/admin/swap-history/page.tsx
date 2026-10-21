"use client";

import { useState, useEffect } from "react";
import { SESSION_META, isSessionType } from "@/lib/sessions";
import { chrome } from "@/components/ui/chrome";
import { formatMonthDay } from "@/lib/format-date";

interface SwapRecord {
  id: number;
  assignmentId: number;
  originalTeacher: { id: number; name: string };
  replacementTeacher: { id: number; name: string };
  assignment: { date: string; grade: number; sessionType: string };
  reason: string | null;
  isCrossGrade: boolean;
  swappedAt: string;
}

/** "2026. 10. 21. 14:05" — 교체 시각은 연도·시각까지 보여준다 */
const swappedAtFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
function formatSwappedAt(iso: string): string {
  return swappedAtFormat.format(new Date(iso));
}

export default function SwapHistoryPage() {
  const [history, setHistory] = useState<SwapRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/supervisor-swap-history")
      .then((r) => {
        if (!r.ok) throw new Error("교체 이력을 불러오지 못했습니다. 새로고침 후 다시 시도하세요.");
        return r.json();
      })
      .then((data) => setHistory(data.history ?? []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "교체 이력을 불러오지 못했습니다. 새로고침 후 다시 시도하세요."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-12 text-center text-ink-muted">불러오는 중…</div>;

  if (error) {
    return (
      <div role="alert" className={chrome.notice("error")}>{error}</div>
    );
  }

  return (
    <div>
      {history.length === 0 ? (
        <div className={`${chrome.card} px-4 py-12 text-center`}>
          <p className="font-semibold text-ink">교체 이력이 없습니다</p>
          <p className="mt-1 text-sm text-ink-muted text-pretty">감독 교사가 서로 교체하면 여기에 기록됩니다.</p>
        </div>
      ) : (
        <div className={`${chrome.card} overflow-hidden`}>
          <div className="overflow-x-auto table-scroll">
            <table className="w-full text-sm">
              <thead className={`${chrome.tableHead} sticky top-0 z-20 border-b border-line`}>
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-medium">교체일시</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-medium">날짜</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-medium">학년</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-medium">세션</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-medium">원래 교사</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-medium">교체 교사</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-medium">사유</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-medium">타학년</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {history.map((h) => (
                  <tr key={h.id} className={chrome.tableRowHover}>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-muted tabular-nums">{formatSwappedAt(h.swappedAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">{formatMonthDay(new Date(h.assignment.date))}</td>
                    <td className="whitespace-nowrap px-4 py-3">{h.assignment.grade}학년</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {isSessionType(h.assignment.sessionType) ? SESSION_META[h.assignment.sessionType].shortLabel : h.assignment.sessionType}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{h.originalTeacher.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium">{h.replacementTeacher.name}</td>
                    <td className="max-w-xs break-words px-4 py-3 text-ink-muted">{h.reason || "-"}</td>
                    <td className="px-4 py-3">
                      {h.isCrossGrade && <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">타학년</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
