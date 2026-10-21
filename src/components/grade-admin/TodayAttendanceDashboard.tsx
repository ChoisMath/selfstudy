"use client";

import useSWR from "swr";
import { SESSION_TYPES, SESSION_META, type SessionType } from "@/lib/sessions";
import { chrome } from "@/components/ui/chrome";
import { formatFullDate } from "@/lib/format-date";

type SessionStats = {
  supervisor: string | null;
  total: number;
  present: number;
  absent: number;
  excusedAbsent: number;
  afterSchool: number;
};

type TodayData = {
  date: string;
  dayOfWeek: string;
  isWeekend: boolean;
  sessions: Record<SessionType, SessionStats>;
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("오늘 출결 현황을 불러오지 못했습니다. 새로고침 후 다시 시도하세요.");
  return res.json();
};

// 출결 상태색(출석 초록·결석 빨강·사유결석 주황·방과후 노랑)은 다른 화면과 맞춘다
const STAT_TONE = {
  green: "bg-green-50 text-green-700",
  red: "bg-red-50 text-red-700",
  orange: "bg-orange-50 text-orange-700",
  yellow: "bg-yellow-50 text-yellow-700",
} as const;

function StatCard({ label, value, color }: { label: string; value: number; color: keyof typeof STAT_TONE }) {
  return (
    <div className={`rounded-xl p-4 text-center ${STAT_TONE[color]}`}>
      <div className="text-3xl font-bold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-ink-muted">{label}</div>
    </div>
  );
}

function SessionCard({ title, icon, stats }: { title: string; icon: string; stats: SessionStats }) {
  return (
    <section className={`${chrome.card} p-4 sm:p-5`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">
          <span aria-hidden="true">{icon}</span> {title}
        </h2>
        {stats.supervisor && <span className={chrome.badge}>감독: {stats.supervisor}</span>}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="출석" value={stats.present} color="green" />
        <StatCard label="결석" value={stats.absent} color="red" />
        <StatCard label="사유결석" value={stats.excusedAbsent} color="orange" />
        <StatCard label="방과후" value={stats.afterSchool} color="yellow" />
      </div>
      <div className="mt-3 text-right text-sm text-ink-muted tabular-nums">
        총 자습대상: {stats.total}명
      </div>
    </section>
  );
}

export default function TodayAttendanceDashboard({ grade }: { grade: number }) {
  const { data, error, isLoading } = useSWR<TodayData>(
    `/api/grade-admin/${grade}/today-attendance`,
    fetcher
  );

  if (isLoading) {
    return <div className="py-12 text-center text-ink-muted">불러오는 중…</div>;
  }

  if (error || !data) {
    return (
      <div role="alert" className={chrome.notice("error")}>
        {error instanceof Error ? error.message : "데이터를 불러올 수 없습니다. 새로고침 후 다시 시도하세요."}
      </div>
    );
  }

  if (data.isWeekend) {
    return (
      <div className={`${chrome.card} px-4 py-12 text-center`}>
        <div className="mb-2 text-lg font-semibold text-ink">{formatFullDate(data.date)}</div>
        <div className="text-ink-muted">주말에는 자습이 없습니다.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 text-center">
        <span className="text-lg font-semibold text-ink">{formatFullDate(data.date)}</span>
      </div>
      <div className="space-y-4">
        {SESSION_TYPES.map((t) => (
          <SessionCard key={t} title={SESSION_META[t].label} icon={SESSION_META[t].icon} stats={data.sessions[t]} />
        ))}
      </div>
    </div>
  );
}
