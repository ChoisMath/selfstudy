"use client";

import { useState } from "react";
import { buildMonthCells, parseDateValue, shiftMonth } from "@/lib/calendar";

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
    <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-xl p-3 w-[clamp(260px,80vw,320px)]">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setView((v) => shiftMonth(v.year, v.month, -1))}
          className="w-11 h-11 flex items-center justify-center rounded-md text-[#475569] hover:bg-[#f1f5f9]"
          aria-label="이전 달"
        >
          ‹
        </button>
        <span className="font-bold text-sm text-[#1e293b] whitespace-nowrap">
          {view.year}년 {view.month}월
        </span>
        <button
          type="button"
          onClick={() => setView((v) => shiftMonth(v.year, v.month, 1))}
          className="w-11 h-11 flex items-center justify-center rounded-md text-[#475569] hover:bg-[#f1f5f9]"
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
              i === 0 ? "text-[#ef4444]" : i === 6 ? "text-[#2563eb]" : "text-[#94a3b8]"
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
              className={`aspect-square min-h-9 rounded-md text-[13px] font-medium transition-colors ${
                isSelected
                  ? "bg-[#2563eb] text-white"
                  : isToday
                    ? "border-2 border-[#2563eb] text-[#2563eb] hover:bg-[#eff6ff]"
                    : "text-[#1e293b] hover:bg-[#f1f5f9]"
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
          className="px-4 py-1.5 rounded-md text-xs font-semibold text-[#2563eb] bg-[#eff6ff] hover:bg-[#dbeafe] whitespace-nowrap min-h-11"
        >
          오늘로
        </button>
      </div>
    </div>
  );
}
