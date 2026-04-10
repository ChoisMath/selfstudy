"use client";

import { useEffect } from "react";
import useSWR from "swr";

type SummaryTeacher = {
  id: number;
  name: string;
  primaryGrade: number | null;
  monthlyCounts: Record<string, number>;
  total: number;
};

type SummaryResponse = {
  currentUserId: number;
  months: string[];
  teachers: SummaryTeacher[];
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatMonthLabel(monthKey: string) {
  const m = parseInt(monthKey.split("-")[1], 10);
  return `${m}월`;
}

export default function SupervisorSummaryModal({
  onClose,
  filterGrade,
}: {
  onClose: () => void;
  filterGrade?: number;
}) {
  const apiUrl = filterGrade
    ? `/api/homeroom/schedule/summary?grade=${filterGrade}`
    : "/api/homeroom/schedule/summary";
  const { data, isLoading } = useSWR<SummaryResponse>(apiUrl, fetcher);

  // ESC 키로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // 배경 스크롤 방지
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const currentUserId = data?.currentUserId ?? 0;
  const months = data?.months ?? [];

  // 본인 분리 + 나머지 가나다순
  const myTeacher = data?.teachers.find((t) => t.id === currentUserId);
  const otherTeachers = (data?.teachers ?? [])
    .filter((t) => t.id !== currentUserId)
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-lg shadow-xl flex flex-col m-2 max-h-[calc(100vh-1rem)] w-full max-w-[calc(100vw-1rem)] sm:max-w-2xl">
        {/* 닫기 버튼 */}
        <div className="flex justify-end p-2 pb-0 shrink-0">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none px-1"
          >
            &times;
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-sm text-gray-400">
            로딩 중...
          </div>
        ) : (
          <div className="overflow-auto flex-1 px-2 pb-2">
            <table className="border-collapse w-full">
              <thead className="sticky top-0 z-20 bg-gray-50">
                <tr>
                  <th className="sticky left-0 z-30 bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-600 border-b border-r border-gray-200 whitespace-nowrap">
                    교사명
                  </th>
                  {months.map((m) => (
                    <th
                      key={m}
                      className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap"
                    >
                      {formatMonthLabel(m)}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center text-xs font-bold text-gray-800 border-b border-l border-gray-200 whitespace-nowrap">
                    총계
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* 본인 행 - sticky */}
                {myTeacher && (
                  <tr className="sticky top-[33px] z-10 bg-yellow-50 font-bold">
                    <td className="sticky left-0 z-20 bg-yellow-50 px-3 py-2 text-sm text-gray-900 border-b border-r border-yellow-200 whitespace-nowrap">
                      {myTeacher.name}
                      {myTeacher.primaryGrade != null && (
                        <span className="text-xs font-normal text-gray-500 ml-1">
                          ({myTeacher.primaryGrade})
                        </span>
                      )}
                    </td>
                    {months.map((m) => (
                      <td
                        key={m}
                        className="px-3 py-2 text-center text-sm text-gray-900 border-b border-yellow-200 whitespace-nowrap"
                      >
                        {myTeacher.monthlyCounts[m] || 0}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center text-sm text-gray-900 border-b border-l border-yellow-200 whitespace-nowrap">
                      {myTeacher.total}
                    </td>
                  </tr>
                )}
                {/* 나머지 교사 */}
                {otherTeachers.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="sticky left-0 z-[5] bg-white px-3 py-2 text-sm text-gray-700 border-b border-r border-gray-100 whitespace-nowrap">
                      {t.name}
                      {t.primaryGrade != null && (
                        <span className="text-xs text-gray-400 ml-1">
                          ({t.primaryGrade})
                        </span>
                      )}
                    </td>
                    {months.map((m) => (
                      <td
                        key={m}
                        className="px-3 py-2 text-center text-sm text-gray-600 border-b border-gray-100 whitespace-nowrap"
                      >
                        {t.monthlyCounts[m] || 0}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center text-sm font-medium text-gray-700 border-b border-l border-gray-100 whitespace-nowrap">
                      {t.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
