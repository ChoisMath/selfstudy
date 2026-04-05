"use client";

import { useState, useEffect } from "react";

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

export default function SwapHistoryPage() {
  const [history, setHistory] = useState<SwapRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/supervisor-swap-history")
      .then((r) => r.json())
      .then((data) => { setHistory(data.history); setLoading(false); });
  }, []);

  if (loading) return <div className="text-gray-500">로딩 중...</div>;

  return (
    <div>
      {history.length === 0 ? (
        <p className="text-gray-500">교체 이력이 없습니다.</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">교체일시</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">날짜</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">학년</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">세션</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">원래 교사</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">교체 교사</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">사유</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">타학년</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{new Date(h.swappedAt).toLocaleString("ko-KR")}</td>
                  <td className="px-4 py-3">{new Date(h.assignment.date).toLocaleDateString("ko-KR")}</td>
                  <td className="px-4 py-3">{h.assignment.grade}학년</td>
                  <td className="px-4 py-3">{h.assignment.sessionType === "afternoon" ? "오후" : "야간"}</td>
                  <td className="px-4 py-3">{h.originalTeacher.name}</td>
                  <td className="px-4 py-3 font-medium">{h.replacementTeacher.name}</td>
                  <td className="px-4 py-3 text-gray-500">{h.reason || "-"}</td>
                  <td className="px-4 py-3">
                    {h.isCrossGrade && <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">타학년</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
