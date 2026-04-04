"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const DAY_LABELS = ["월", "화", "수", "목", "금"] as const;
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"] as const;

const REASON_LABELS: Record<string, string> = {
  academy: "학원",
  afterschool: "방과후",
  illness: "질병",
  custom: "기타",
};

type AttendanceRecord = {
  date: string;
  sessionType: "afternoon" | "night";
  status: "unchecked" | "present" | "absent";
  absenceReason: { reasonType: string; detail: string | null } | null;
};

type WeeklyData = {
  weekDates: string[];
  attendances: AttendanceRecord[];
  participationDays: Record<
    string,
    {
      isParticipating: boolean;
      mon: boolean;
      tue: boolean;
      wed: boolean;
      thu: boolean;
      fri: boolean;
    }
  >;
};

type MonthlyData = {
  month: string;
  attendances: AttendanceRecord[];
};

type ViewTab = "weekly" | "monthly";

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

function StatusBadge({ status, isParticipating }: { status: string | undefined; isParticipating: boolean }) {
  if (!isParticipating) {
    return <span className="text-gray-300 text-sm">-</span>;
  }
  if (!status || status === "unchecked") {
    return <span className="text-gray-400 text-sm">-</span>;
  }
  if (status === "present") {
    return <span className="text-green-600 font-bold text-sm">O</span>;
  }
  return <span className="text-red-600 font-bold text-sm">X</span>;
}

export default function StudentAttendancePage() {
  const [viewTab, setViewTab] = useState<ViewTab>("weekly");
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const [weekDate, setWeekDate] = useState(todayStr);
  const [month, setMonth] = useState(currentMonth);

  const weeklyUrl =
    viewTab === "weekly"
      ? `/api/student/attendance?type=weekly&date=${weekDate}`
      : null;
  const monthlyUrl =
    viewTab === "monthly"
      ? `/api/student/attendance?type=monthly&month=${month}`
      : null;

  const { data: weeklyData, isLoading: weeklyLoading } =
    useSWR<WeeklyData>(weeklyUrl, fetcher);
  const { data: monthlyData, isLoading: monthlyLoading } =
    useSWR<MonthlyData>(monthlyUrl, fetcher);

  // 주간 네비게이션
  function changeWeek(offset: number) {
    const d = new Date(weekDate + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + offset * 7);
    setWeekDate(d.toISOString().split("T")[0]);
  }

  // 월간 네비게이션
  function changeMonth(offset: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + offset, 1));
    setMonth(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">출결기록</h2>

      {/* 뷰 전환 탭 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewTab("weekly")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            viewTab === "weekly"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          이번 주
        </button>
        <button
          onClick={() => setViewTab("monthly")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            viewTab === "monthly"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          이번 달
        </button>
      </div>

      {viewTab === "weekly" && (
        <WeeklyView
          data={weeklyData}
          isLoading={weeklyLoading}
          onPrev={() => changeWeek(-1)}
          onNext={() => changeWeek(1)}
        />
      )}

      {viewTab === "monthly" && (
        <MonthlyView
          data={monthlyData}
          isLoading={monthlyLoading}
          month={month}
          onPrev={() => changeMonth(-1)}
          onNext={() => changeMonth(1)}
        />
      )}
    </div>
  );
}

function WeeklyView({
  data,
  isLoading,
  onPrev,
  onNext,
}: {
  data: WeeklyData | undefined;
  isLoading: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (isLoading) {
    return <div className="text-center py-8 text-gray-400">불러오는 중...</div>;
  }

  if (!data) return null;

  const { weekDates, attendances, participationDays } = data;

  // 출석 데이터를 날짜+세션으로 맵핑
  const attendanceMap = new Map<string, AttendanceRecord>();
  for (const a of attendances) {
    attendanceMap.set(`${a.date}_${a.sessionType}`, a);
  }

  // 참가 여부 확인
  function isParticipating(sessionType: string, dayIndex: number): boolean {
    const p = participationDays?.[sessionType];
    if (!p || !p.isParticipating) return false;
    return p[DAY_KEYS[dayIndex]] ?? false;
  }

  // 결석 사유 모음
  const absenceNotes: { date: string; sessionType: string; reason: string }[] = [];
  for (const a of attendances) {
    if (a.status === "absent" && a.absenceReason) {
      absenceNotes.push({
        date: a.date,
        sessionType: a.sessionType === "afternoon" ? "오후" : "야간",
        reason:
          REASON_LABELS[a.absenceReason.reasonType] +
          (a.absenceReason.detail ? ` (${a.absenceReason.detail})` : ""),
      });
    }
  }

  const weekStart = weekDates[0];
  const weekEnd = weekDates[4];

  return (
    <div>
      {/* 주간 네비게이션 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrev}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          &lt;
        </button>
        <span className="text-sm font-medium text-gray-700">
          {formatDate(weekStart)} ~ {formatDate(weekEnd)}
        </span>
        <button
          onClick={onNext}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          &gt;
        </button>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium text-gray-600 w-16"></th>
              {weekDates.map((d, i) => (
                <th
                  key={d}
                  className="px-2 py-2.5 text-center font-medium text-gray-600"
                >
                  <div>{DAY_LABELS[i]}</div>
                  <div className="text-xs text-gray-400 font-normal">
                    {formatDate(d)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(["afternoon", "night"] as const).map((sessionType) => (
              <tr key={sessionType} className="border-t border-gray-100">
                <td className="px-3 py-3 text-gray-600 font-medium">
                  {sessionType === "afternoon" ? "오후" : "야간"}
                </td>
                {weekDates.map((d, i) => {
                  const record = attendanceMap.get(`${d}_${sessionType}`);
                  const participating = isParticipating(sessionType, i);
                  return (
                    <td key={d} className="px-2 py-3 text-center">
                      <StatusBadge
                        status={record?.status}
                        isParticipating={participating}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 결석 사유 */}
      {absenceNotes.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-600">결석 사유</h4>
          {absenceNotes.map((note, i) => (
            <div
              key={i}
              className="text-sm text-gray-500 bg-red-50 rounded-lg px-3 py-2"
            >
              {formatDate(note.date)} {note.sessionType}: {note.reason}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MonthlyView({
  data,
  isLoading,
  month,
  onPrev,
  onNext,
}: {
  data: MonthlyData | undefined;
  isLoading: boolean;
  month: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  const [year, mon] = month.split("-").map(Number);

  // 달력 데이터 생성
  const calendarDays = useMemo(() => {
    const firstDay = new Date(Date.UTC(year, mon - 1, 1));
    const lastDay = new Date(Date.UTC(year, mon, 0));
    const daysInMonth = lastDay.getUTCDate();

    // 첫째 날의 요일 (0=일, 1=월, ...)
    let startDow = firstDay.getUTCDay();
    // 월요일 시작으로 조정 (0=월, 1=화, ..., 6=일)
    startDow = startDow === 0 ? 6 : startDow - 1;

    const days: (number | null)[] = [];
    // 앞쪽 빈칸
    for (let i = 0; i < startDow; i++) {
      days.push(null);
    }
    // 날짜
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [year, mon]);

  // 출석 데이터를 날짜+세션으로 맵핑
  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    if (data?.attendances) {
      for (const a of data.attendances) {
        map.set(`${a.date}_${a.sessionType}`, a);
      }
    }
    return map;
  }, [data]);

  if (isLoading) {
    return <div className="text-center py-8 text-gray-400">불러오는 중...</div>;
  }

  function getDateStr(day: number): string {
    return `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function getDayStatus(day: number, sessionType: string): string | null {
    const dateStr = getDateStr(day);
    const record = attendanceMap.get(`${dateStr}_${sessionType}`);
    return record?.status ?? null;
  }

  function StatusDot({ status }: { status: string | null }) {
    if (!status || status === "unchecked") return null;
    return (
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          status === "present" ? "bg-green-500" : "bg-red-500"
        }`}
      />
    );
  }

  return (
    <div>
      {/* 월간 네비게이션 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrev}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          &lt;
        </button>
        <span className="text-sm font-medium text-gray-700">
          {year}년 {mon}월
        </span>
        <button
          onClick={onNext}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          &gt;
        </button>
      </div>

      {/* 달력 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
            <div
              key={d}
              className="py-2 text-center text-xs font-medium text-gray-500"
            >
              {d}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="p-2 min-h-[60px]" />;
            }

            const dateObj = new Date(Date.UTC(year, mon - 1, day));
            const dow = dateObj.getUTCDay();
            const isWeekend = dow === 0 || dow === 6;

            const afternoonStatus = getDayStatus(day, "afternoon");
            const nightStatus = getDayStatus(day, "night");
            const hasData = afternoonStatus || nightStatus;

            return (
              <div
                key={day}
                className={`p-1.5 min-h-[60px] border-t border-r border-gray-100 ${
                  isWeekend ? "bg-gray-50" : ""
                }`}
              >
                <div
                  className={`text-xs mb-1 ${
                    isWeekend ? "text-gray-400" : "text-gray-700"
                  }`}
                >
                  {day}
                </div>
                {hasData && !isWeekend && (
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-400">오</span>
                      <StatusDot status={afternoonStatus} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-400">야</span>
                      <StatusDot status={nightStatus} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 범례 */}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
          출석
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
          결석
        </div>
      </div>
    </div>
  );
}
