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

type TodayData = {
  date: string;
  dayOfWeek: string;
  isWeekend: boolean;
  afternoon: SessionStats;
  night: SessionStats;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    orange: "bg-orange-50 text-orange-600",
    yellow: "bg-yellow-50 text-yellow-600",
  };
  return (
    <div className={`rounded-lg p-4 text-center ${colorMap[color] || ""}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function SessionCard({ title, icon, stats }: { title: string; icon: string; stats: SessionStats }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <span className="text-base font-semibold text-gray-700">{icon} {title}</span>
        {stats.supervisor && (
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
            감독: {stats.supervisor}
          </span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="출석" value={stats.present} color="green" />
        <StatCard label="결석" value={stats.absent} color="red" />
        <StatCard label="사유결석" value={stats.excusedAbsent} color="orange" />
        <StatCard label="방과후" value={stats.afterSchool} color="yellow" />
      </div>
      <div className="mt-3 text-right text-sm text-gray-400">
        총 자습대상: {stats.total}명
      </div>
    </div>
  );
}

export default function TodayAttendanceDashboard({ grade }: { grade: number }) {
  const { data, isLoading } = useSWR<TodayData>(
    `/api/grade-admin/${grade}/today-attendance`,
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
  const dateDisplay = `${y}년 ${parseInt(m)}월 ${parseInt(d)}일 (${data.dayOfWeek})`;

  return (
    <div>
      <div className="text-center mb-5">
        <span className="text-lg font-semibold text-gray-800">{dateDisplay}</span>
      </div>
      <div className="space-y-4">
        <SessionCard title="오후자습" icon="☀️" stats={data.afternoon} />
        <SessionCard title="야간자습" icon="🌙" stats={data.night} />
      </div>
    </div>
  );
}
