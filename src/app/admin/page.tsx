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

type GradeData = {
  grade: number;
  sessions: Record<SessionType, SessionStats>;
};

type TodayData = {
  date: string;
  dayOfWeek: string;
  isWeekend: boolean;
  grades: GradeData[];
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("오늘 자습 현황을 불러오지 못했습니다. 새로고침 후 다시 시도하세요.");
  return res.json();
};

// 출결 상태색(출석 초록·결석 빨강·사유결석 주황·방과후 노랑)은 다른 화면과 맞춘다
const STAT_TONE = {
  green: "bg-green-50 text-green-700",
  red: "bg-red-50 text-red-700",
  orange: "bg-orange-50 text-orange-700",
  yellow: "bg-yellow-50 text-yellow-700",
} as const;

function CompactStatCard({ label, value, color }: { label: string; value: number; color: keyof typeof STAT_TONE }) {
  return (
    <div className={`rounded-xl p-2.5 text-center ${STAT_TONE[color]}`}>
      <span className="text-xl font-bold tabular-nums">{value}</span>
      <span className="ml-1 text-xs text-ink-muted">{label}</span>
    </div>
  );
}

function SessionRow({ label, icon, stats }: { label: string; icon: string; stats: SessionStats }) {
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="min-w-16 whitespace-nowrap text-sm font-semibold text-ink-muted">
          <span aria-hidden="true">{icon}</span> {label}
        </span>
        {stats.supervisor && <span className={chrome.badge}>감독 {stats.supervisor}</span>}
        <div className="flex-1" />
        <span className="text-xs text-ink-muted tabular-nums">대상 {stats.total}명</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <CompactStatCard label="출석" value={stats.present} color="green" />
        <CompactStatCard label="결석" value={stats.absent} color="red" />
        <CompactStatCard label="사유결석" value={stats.excusedAbsent} color="orange" />
        <CompactStatCard label="방과후" value={stats.afterSchool} color="yellow" />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, error, isLoading } = useSWR<TodayData>(
    "/api/admin/today-attendance",
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
      <h1 className="mb-6 text-center text-lg font-semibold text-ink text-balance">{formatFullDate(data.date)} 자습 현황</h1>
      <div className="space-y-3">
        {data.grades.map((g) => (
          <section key={g.grade} aria-labelledby={`grade-${g.grade}-heading`} className={`${chrome.card} p-4`}>
            <h2 id={`grade-${g.grade}-heading`} className="mb-3 text-base font-bold text-ink">{g.grade}학년</h2>
            {SESSION_TYPES.map((t) => (
              <SessionRow key={t} label={SESSION_META[t].shortLabel} icon={SESSION_META[t].icon} stats={g.sessions[t]} />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
