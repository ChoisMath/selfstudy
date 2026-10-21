"use client";

import useSWR from "swr";
import { Dialog } from "@/components/ui/Dialog";
import { chrome } from "@/components/ui/chrome";

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

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `${res.status} 오류가 발생했습니다.`);
  }
  return res.json();
};

function formatMonthLabel(monthKey: string) {
  const m = parseInt(monthKey.split("-")[1], 10);
  return `${m}월`;
}

/**
 * 감독 누계 모달. 부모가 조건부로 렌더하므로 항상 open — Dialog 가 role·Escape·포커스 트랩·배경 스크롤 잠금을 맡는다.
 */
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
  const { data, error, isLoading } = useSWR<SummaryResponse>(apiUrl, fetcher);

  const currentUserId = data?.currentUserId ?? 0;
  const months = data?.months ?? [];

  // 본인 분리 + 나머지 가나다순
  const myTeacher = data?.teachers.find((t) => t.id === currentUserId);
  const otherTeachers = (data?.teachers ?? [])
    .filter((t) => t.id !== currentUserId)
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  return (
    <Dialog
      open
      onClose={onClose}
      title="감독 누계"
      description={filterGrade ? `${filterGrade}학년 감독 배정 횟수 (월별·총계)` : "감독 배정 횟수 (월별·총계)"}
      panelClassName="max-w-2xl"
    >
      {isLoading ? (
        <div className="py-8 text-center text-sm text-ink-muted" role="status" aria-live="polite">
          로딩 중…
        </div>
      ) : error ? (
        <div role="alert" className={chrome.notice("error")}>{error.message}</div>
      ) : (
        <div className="max-h-[65dvh] overflow-auto overscroll-contain rounded-xl border border-line">
          <table className="w-full border-collapse">
            <thead className={`${chrome.tableHead} sticky top-0 z-20`}>
              <tr>
                <th className="sticky left-0 z-30 whitespace-nowrap border-b border-r border-line bg-butter px-3 py-2 text-left text-xs font-semibold">
                  교사명
                </th>
                {months.map((m) => (
                  <th
                    key={m}
                    className="whitespace-nowrap border-b border-line px-3 py-2 text-center text-xs font-semibold"
                  >
                    {formatMonthLabel(m)}
                  </th>
                ))}
                <th className="whitespace-nowrap border-b border-l border-line px-3 py-2 text-center text-xs font-bold text-ink">
                  총계
                </th>
              </tr>
            </thead>
            <tbody>
              {/* 본인 행 - sticky */}
              {myTeacher && (
                <tr className="sticky top-[33px] z-10 bg-yellow-50 font-bold">
                  <td className="sticky left-0 z-20 whitespace-nowrap border-b border-r border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-ink">
                    {myTeacher.name}
                    {myTeacher.primaryGrade != null && (
                      <span className="ml-1 text-xs font-normal text-ink-muted">
                        ({myTeacher.primaryGrade})
                      </span>
                    )}
                  </td>
                  {months.map((m) => (
                    <td
                      key={m}
                      className="whitespace-nowrap border-b border-yellow-200 px-3 py-2 text-center text-sm text-ink tabular-nums"
                    >
                      {myTeacher.monthlyCounts[m] || 0}
                    </td>
                  ))}
                  <td className="whitespace-nowrap border-b border-l border-yellow-200 px-3 py-2 text-center text-sm text-ink tabular-nums">
                    {myTeacher.total}
                  </td>
                </tr>
              )}
              {/* 나머지 교사 */}
              {otherTeachers.map((t) => (
                <tr key={t.id} className={chrome.tableRowHover}>
                  <td className="sticky left-0 z-[5] whitespace-nowrap border-b border-r border-line/60 bg-white px-3 py-2 text-sm text-ink">
                    {t.name}
                    {t.primaryGrade != null && (
                      <span className="ml-1 text-xs text-ink-muted">
                        ({t.primaryGrade})
                      </span>
                    )}
                  </td>
                  {months.map((m) => (
                    <td
                      key={m}
                      className="whitespace-nowrap border-b border-line/60 px-3 py-2 text-center text-sm text-ink-muted tabular-nums"
                    >
                      {t.monthlyCounts[m] || 0}
                    </td>
                  ))}
                  <td className="whitespace-nowrap border-b border-l border-line/60 px-3 py-2 text-center text-sm font-medium text-ink tabular-nums">
                    {t.total}
                  </td>
                </tr>
              ))}
              {otherTeachers.length === 0 && !myTeacher && (
                <tr>
                  <td colSpan={months.length + 2} className="px-3 py-6 text-center text-sm text-ink-muted">
                    배정 기록이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Dialog>
  );
}
