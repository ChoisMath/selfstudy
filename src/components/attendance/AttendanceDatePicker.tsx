"use client";

import { useState } from "react";
import { buildMonthCells, parseDateValue, shiftMonth } from "@/lib/calendar";
import { formatFullDate, formatYearMonth } from "@/lib/format-date";

const WEEKDAY_HEADERS = ["일", "월", "화", "수", "목", "금", "토"];

interface AttendanceDatePickerProps {
  value: string; // YYYY-MM-DD
  today: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

function monthOf(date: string): { year: number; month: number } {
  const { year, month } = parseDateValue(date);
  return { year, month };
}

export default function AttendanceDatePicker({ value, today, onChange }: AttendanceDatePickerProps) {
  const [view, setView] = useState(() => monthOf(value));
  const [syncedValue, setSyncedValue] = useState(value);

  // Re-sync the visible month during render (React's "adjust state on prop change" pattern)
  // so the arrows can still navigate freely between external date changes.
  if (syncedValue !== value) {
    setSyncedValue(value);
    setView(monthOf(value));
  }

  const cells = buildMonthCells(view.year, view.month);

  return (
    <div role="dialog" aria-label="날짜 선택" className="bg-white border border-line rounded-2xl shadow-xl p-3 w-[min(100vw-1.5rem,344px)]">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setView((v) => shiftMonth(v.year, v.month, -1))}
          className="w-11 h-11 flex items-center justify-center rounded-full text-ink-muted hover:bg-butter cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="이전 달"
        >
          ‹
        </button>
        <span className="font-bold text-sm text-ink whitespace-nowrap" aria-live="polite">
          {formatYearMonth(view.year, view.month)}
        </span>
        <button
          type="button"
          onClick={() => setView((v) => shiftMonth(v.year, v.month, 1))}
          className="w-11 h-11 flex items-center justify-center rounded-full text-ink-muted hover:bg-butter cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAY_HEADERS.map((w, i) => (
          <div
            key={w}
            className={`text-center text-[11px] font-semibold py-1 ${
              i === 0 ? "text-[#dc2626]" : i === 6 ? "text-sky-700" : "text-ink-muted"
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((date, idx) => {
          if (!date) return <div key={`pad-${idx}`} />;
          const { day } = parseDateValue(date);
          const isSelected = date === value;
          const isToday = date === today;
          return (
            <button
              key={date}
              type="button"
              onClick={() => onChange(date)}
              aria-label={formatFullDate(date)}
              aria-pressed={isSelected}
              aria-current={isToday ? "date" : undefined}
              className={`aspect-square min-h-11 rounded-xl text-[13px] font-medium tabular-nums cursor-pointer touch-manipulation transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isSelected
                  ? "bg-primary text-white"
                  : isToday
                    ? "border-2 border-primary text-primary hover:bg-peach"
                    : "text-ink hover:bg-butter"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="mt-2 pt-2 border-t border-[#f1f5f9] flex justify-center">
        <button
          type="button"
          onClick={() => onChange(today)}
          className="px-4 rounded-xl text-xs font-semibold text-primary-deep bg-butter hover:bg-peach cursor-pointer whitespace-nowrap min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          오늘로
        </button>
      </div>
    </div>
  );
}
