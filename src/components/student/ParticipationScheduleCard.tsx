"use client";

import { Fragment } from "react";
import { addDays, nextDateForWeekday, weekdayOf } from "@/lib/calendar";
import {
  WEEKDAY_KEYS,
  WEEKDAY_LABELS,
  activeDayCount,
  isActiveOn,
  weekdayKeyOf,
  type ParticipationDaysMap,
} from "@/lib/participation-days";
import { SESSION_META, SESSION_TYPES, type SessionType } from "@/lib/sessions";

function shortDate(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  return `${month}/${day}`;
}

export default function ParticipationScheduleCard({
  participationDays,
  today,
  onSelectDay,
}: {
  participationDays: ParticipationDaysMap;
  today: string;
  onSelectDay: (sessionType: SessionType, date: string) => void;
}) {
  const todayKey = weekdayKeyOf(today);
  // 주말(토=6, 일=0)에도 "이번 주" 는 지난 월요일부터 센다
  const thisMonday = addDays(today, -((weekdayOf(today) + 6) % 7));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
      <div className="grid grid-cols-[auto_repeat(5,1fr)] gap-2">
        {SESSION_TYPES.map((sessionType) => {
          const settings = participationDays[sessionType];
          const participating = !!settings?.isParticipating;
          return (
            <Fragment key={sessionType}>
              <div className="flex flex-col justify-center pr-1 whitespace-nowrap">
                <span className={`text-sm font-medium ${participating ? "text-gray-700" : "text-gray-400"}`}>
                  {SESSION_META[sessionType].shortLabel}
                </span>
                <span className="text-[10px] text-gray-400">
                  {participating ? `주 ${activeDayCount(settings)}일` : "미참가"}
                </span>
              </div>
              {WEEKDAY_KEYS.map((key, index) => {
                const active = isActiveOn(settings, key);
                const isToday = key === todayKey;
                // getDay() 기준 월=1 … 금=5
                const date = nextDateForWeekday(today, index + 1);
                const isNextWeek = date !== addDays(thisMonday, index);
                const border = isToday ? (active ? "border-blue-700" : "border-gray-400") : "border-transparent";
                const label = WEEKDAY_LABELS[key];
                if (!active) {
                  return (
                    <div
                      key={key}
                      className={`min-h-11 rounded-lg border-2 ${border} bg-gray-100 text-gray-300 flex items-center justify-center text-sm font-medium whitespace-nowrap`}
                    >
                      {label}
                    </div>
                  );
                }
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSelectDay(sessionType, date)}
                    title={date}
                    aria-label={`${SESSION_META[sessionType].shortLabel} ${shortDate(date)}(${label}) 불참 신청`}
                    className={`min-h-11 rounded-lg border-2 ${border} bg-blue-100 text-blue-700 hover:bg-blue-200 flex flex-col items-center justify-center text-sm font-medium whitespace-nowrap transition-colors`}
                  >
                    {label}
                    {isNextWeek && <span className="text-[9px] leading-none text-blue-500">다음주</span>}
                  </button>
                );
              })}
            </Fragment>
          );
        })}
        {todayKey && (
          <>
            <div />
            {WEEKDAY_KEYS.map((key) => (
              <div key={key} className="text-center text-[10px] font-semibold text-blue-700 whitespace-nowrap">
                {key === todayKey ? "오늘" : ""}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
