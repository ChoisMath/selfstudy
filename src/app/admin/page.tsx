"use client";

import useSWR from "swr";

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
  afternoon: SessionStats;
  night: SessionStats;
};

type TodayData = {
  date: string;
  dayOfWeek: string;
  isWeekend: boolean;
  grades: GradeData[];
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function CompactStatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    orange: "bg-orange-50 text-orange-600",
    yellow: "bg-yellow-50 text-yellow-600",
  };
  return (
    <div className={`rounded-md p-2.5 text-center ${colorMap[color] || ""}`}>
      <span className="text-xl font-bold">{value}</span>
      <span className="text-xs text-gray-500 ml-1">{label}</span>
    </div>
  );
}

function SessionRow({ label, icon, stats }: { label: string; icon: string; stats: SessionStats }) {
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-gray-500 w-14">{icon} {label}</span>
        {stats.supervisor && (
          <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full text-xs font-medium">
            {stats.supervisor}
          </span>
        )}
        <div className="flex-1" />
        <span className="text-xs text-gray-400">대상 {stats.total}명</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <CompactStatCard label="출석" value={stats.present} color="green" />
        <CompactStatCard label="결석" value={stats.absent} color="red" />
        <CompactStatCard label="사유결석" value={stats.excusedAbsent} color="orange" />
        <CompactStatCard label="방과후" value={stats.afterSchool} color="yellow" />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useSWR<TodayData>(
    "/api/admin/today-attendance",
    fetcher
  );

  if (isLoading) {
    return <div className="text-center py-12 text-gray-400">불러오는 중...</div>;
  }

  if (!data) {
    return <div className="text-center py-12 text-gray-400">데이터를 불러올 수 없습니다.</div>;
  }

  if (data.isWeekend) {
    return (
      <div className="text-center py-12">
        <div className="text-lg font-semibold text-gray-800 mb-2">
          {data.date.replace(/-/g, ".")} ({data.dayOfWeek})
        </div>
        <div className="text-gray-400">주말에는 자습이 없습니다.</div>
      </div>
    );
  }

  const [y, m, d] = data.date.split("-");
  const dateDisplay = `${y}년 ${parseInt(m)}월 ${parseInt(d)}일 (${data.dayOfWeek}) 자습 현황`;

  return (
    <div>
      <div className="text-center mb-6">
        <span className="text-lg font-semibold text-gray-800">{dateDisplay}</span>
      </div>
      <div className="space-y-3">
        {data.grades.map((g) => (
          <div key={g.grade} className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="text-base font-bold text-gray-800 mb-3">{g.grade}학년</div>
            <SessionRow label="오후" icon="☀️" stats={g.afternoon} />
            <SessionRow label="야간" icon="🌙" stats={g.night} />
          </div>
        ))}
      </div>
    </div>
  );
}
