"use client";

import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";

type Teacher = { id: number; name: string; primaryGrade?: number | null };
type Assignment = {
  id: number;
  teacherId: number;
  date: string;
  grade: number;
  sessionType: "afternoon" | "night";
  teacher: { id: number; name: string };
};

type SlotConfig = {
  grade: number;
  sessionType: "afternoon" | "night";
  label: string;
};

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: (Date | null)[] = [];

  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push(null);
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

export default function MonthlyCalendar({
  grade,
  showAllGrades = false,
  apiBasePath,
}: {
  grade?: number;
  showAllGrades?: boolean;
  apiBasePath: string;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const slots: SlotConfig[] = useMemo(() => {
    if (showAllGrades) {
      return [1, 2, 3].map((g) => ({
        grade: g, sessionType: "afternoon" as const, label: `${g}학년`,
      }));
    }
    return [
      { grade: grade!, sessionType: "afternoon" as const, label: "감독" },
    ];
  }, [grade, showAllGrades]);

  const monthDays = useMemo(() => getMonthDays(year, month), [year, month]);

  const fromStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDate = new Date(year, month + 1, 0);
  const toStr = formatDate(lastDate);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      if (showAllGrades) {
        const results = await Promise.all(
          [1, 2, 3].map(async (g) => {
            const res = await fetch(
              `/api/grade-admin/${g}/supervisor-assignments?from=${fromStr}&to=${toStr}`
            );
            if (res.ok) {
              const data = await res.json();
              return data.assignments as Assignment[];
            }
            return [];
          })
        );
        setAssignments(results.flat());
      } else {
        const res = await fetch(`${apiBasePath}?from=${fromStr}&to=${toStr}`);
        if (res.ok) {
          const data = await res.json();
          setAssignments(data.assignments);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [apiBasePath, fromStr, toStr, showAllGrades]);

  const fetchTeachers = useCallback(async () => {
    const res = await fetch("/api/teachers");
    if (res.ok) {
      const data = await res.json();
      setTeachers(data.teachers);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);
  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // O(1) 룩업을 위한 Map
  const assignmentMap = useMemo(() => {
    const map = new Map<string, Assignment>();
    for (const a of assignments) {
      map.set(`${a.date.split("T")[0]}-${a.grade}-${a.sessionType}`, a);
    }
    return map;
  }, [assignments]);

  const getAssignment = useCallback(
    (date: Date, g: number, sessionType: string) =>
      assignmentMap.get(`${formatDate(date)}-${g}-${sessionType}`),
    [assignmentMap]
  );

  const handleAssign = async (
    date: Date,
    g: number,
    _sessionType: string,
    teacherId: number | null
  ) => {
    const dateStr = formatDate(date);
    const cellKey = `${dateStr}-${g}-afternoon`;
    setSaving(cellKey);
    try {
      if (teacherId === null) {
        // 해당 날짜+학년의 afternoon 배정을 찾아 DELETE (API가 양쪽 모두 삭제)
        const existing = getAssignment(date, g, "afternoon");
        if (existing) {
          const res = await fetch(
            `/api/grade-admin/${g}/supervisor-assignments/${existing.id}`,
            { method: "DELETE" }
          );
          if (res.ok)
            setAssignments((prev) =>
              prev.filter((a) => !(a.date.startsWith(dateStr) && a.grade === g))
            );
        }
      } else {
        // POST가 오후+야간 동시 생성
        const res = await fetch(
          `/api/grade-admin/${g}/supervisor-assignments`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teacherId, date: dateStr }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          setAssignments((prev) => [
            ...prev.filter(
              (a) => !(a.date.startsWith(dateStr) && a.grade === g)
            ),
            ...(data.assignments || [data.assignment]),
          ]);
        }
      }
    } finally {
      setSaving(null);
    }
  };

  const prevMonth = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          &larr; 이전달
        </button>
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-gray-800">
            {year}년 {month + 1}월
          </span>
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100"
          >
            이번달
          </button>
        </div>
        <button
          onClick={nextMonth}
          className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          다음달 &rarr;
        </button>
      </div>

      {loading && (
        <div className="text-center py-4 text-sm text-gray-400">로딩 중...</div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <div className="min-w-[700px]">
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className={`px-2 py-2 text-center text-sm font-medium ${
                i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-500"
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {monthDays.map((date, idx) => {
            const isSingleSlot = slots.length === 1;
            return (
              <div
                key={idx}
                className={`${isSingleSlot ? "min-h-[80px] sm:min-h-[100px]" : "min-h-[80px] sm:min-h-[110px]"} border-b border-r border-gray-100 p-1 sm:p-1.5 ${
                  !date
                    ? "bg-gray-50"
                    : isWeekend(date)
                      ? "bg-gray-50"
                      : ""
                }`}
              >
                {date && (
                  <>
                    <div
                      className={`text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1 ${
                        date.getDay() === 0
                          ? "text-red-400"
                          : date.getDay() === 6
                            ? "text-blue-400"
                            : "text-gray-700"
                      }`}
                    >
                      {date.getDate()}
                    </div>
                    {!isWeekend(date) && (
                      <div className={isSingleSlot ? "mt-1" : "space-y-0.5"}>
                        {slots.map((slot) => {
                          const assignment = getAssignment(
                            date,
                            slot.grade,
                            slot.sessionType
                          );
                          const cellKey = `${formatDate(date)}-${slot.grade}-${slot.sessionType}`;
                          const isSaving = saving === cellKey;
                          return (
                            <div key={cellKey} className={`flex items-center ${isSingleSlot ? "" : "gap-0.5"}`}>
                              {!isSingleSlot && (
                                <span className="text-[10px] text-gray-400 w-8 shrink-0">
                                  {slot.label}
                                </span>
                              )}
                              <CalendarTeacherSelect
                                teachers={teachers}
                                grade={slot.grade}
                                value={assignment?.teacherId ?? null}
                                disabled={loading || isSaving}
                                isSaving={isSaving}
                                isSingleSlot={isSingleSlot}
                                onChange={(id) =>
                                  handleAssign(date, slot.grade, slot.sessionType, id)
                                }
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
}

const CalendarTeacherSelect = memo(function CalendarTeacherSelect({
  teachers,
  grade,
  value,
  disabled,
  isSaving,
  isSingleSlot,
  onChange,
}: {
  teachers: Teacher[];
  grade: number;
  value: number | null;
  disabled: boolean;
  isSaving: boolean;
  isSingleSlot: boolean;
  onChange: (id: number | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedName = teachers.find((t) => t.id === value)?.name ?? "";

  // 학년 우선 정렬 + 검색 필터
  const grouped = useMemo(() => {
    const filtered = query
      ? teachers.filter((t) => t.name.includes(query))
      : teachers;
    const primary = filtered.filter((t) => t.primaryGrade === grade);
    const others = filtered.filter((t) => t.primaryGrade !== grade);
    return { primary, others };
  }, [teachers, query, grade]);

  const allFiltered = useMemo(
    () => [...grouped.primary, ...grouped.others],
    [grouped]
  );

  useEffect(() => { setHighlightIdx(0); }, [allFiltered]);

  useEffect(() => {
    if (isOpen && listRef.current) {
      const el = listRef.current.children[highlightIdx] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIdx, isOpen]);

  const select = (id: number | null) => {
    onChange(id);
    setQuery("");
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") { setIsOpen(true); e.preventDefault(); }
      return;
    }
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); setHighlightIdx((i) => Math.min(i + 1, allFiltered.length - 1)); break;
      case "ArrowUp": e.preventDefault(); setHighlightIdx((i) => Math.max(i - 1, 0)); break;
      case "Enter":
        e.preventDefault();
        if (allFiltered[highlightIdx]) select(allFiltered[highlightIdx].id);
        break;
      case "Escape": setIsOpen(false); setQuery(""); break;
    }
  };

  // 리스트 항목에서 구분선 위치 계산
  const separatorAfter = grouped.primary.length > 0 && grouped.others.length > 0
    ? grouped.primary.length - 1
    : -1;

  return (
    <div className="relative flex-1 min-w-0">
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        value={isOpen ? query : selectedName}
        onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
        onFocus={() => { setQuery(""); setIsOpen(true); }}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder={value ? selectedName : "미배정"}
        className={`w-full ${isSingleSlot
          ? "text-xs sm:text-sm py-1 sm:py-1.5 px-1 font-medium"
          : "text-[11px] px-1 py-0.5"
        } border rounded min-w-0 ${
          isSaving
            ? "bg-yellow-50 border-yellow-300"
            : value
              ? "bg-blue-50 border-blue-200 text-blue-800"
              : "bg-white border-gray-200 text-gray-400"
        }`}
      />
      {isOpen && (
        <ul
          ref={listRef}
          className="absolute z-50 w-48 mt-0.5 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto text-sm"
        >
          <li
            onMouseDown={() => select(null)}
            className={`px-2 py-1.5 cursor-pointer text-gray-400 hover:bg-gray-50 ${
              highlightIdx === -1 ? "bg-blue-50" : ""
            }`}
          >
            미배정
          </li>
          {allFiltered.map((t, idx) => (
            <li
              key={t.id}
              onMouseDown={() => select(t.id)}
              onMouseEnter={() => setHighlightIdx(idx)}
              className={`px-2 py-1.5 cursor-pointer ${
                idx === highlightIdx ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
              } ${t.id === value ? "font-semibold" : ""} ${
                idx === separatorAfter ? "border-b border-gray-200" : ""
              }`}
            >
              {t.name}
              {t.primaryGrade && (
                <span className="text-[10px] text-gray-400 ml-1">{t.primaryGrade}학년</span>
              )}
            </li>
          ))}
          {allFiltered.length === 0 && query && (
            <li className="px-2 py-1.5 text-gray-400">검색 결과 없음</li>
          )}
        </ul>
      )}
    </div>
  );
});
