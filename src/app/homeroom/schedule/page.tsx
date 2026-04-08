"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import useSWR from "swr";

type AssignmentData = {
  id: number;
  date: string;
  grade: number;
  sessionType: "afternoon" | "night";
  teacherId: number;
  teacherName: string;
};

type TeacherData = {
  id: number;
  name: string;
  primaryGrade?: number | null;
  grades: number[];
};

type ScheduleResponse = {
  currentUserId: number;
  assignments: AssignmentData[];
  teachers: TeacherData[];
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const SLOTS = [1, 2, 3].map((g) => ({
  grade: g, sessionType: "afternoon" as const, label: `${g}학년`,
}));

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

export default function SchedulePage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const { data, mutate, isLoading } = useSWR<ScheduleResponse>(
    `/api/homeroom/schedule?month=${monthStr}`,
    fetcher
  );

  const currentUserId = data?.currentUserId ?? 0;
  const assignments = data?.assignments ?? [];
  const teachers = data?.teachers ?? [];

  const monthDays = useMemo(() => getMonthDays(year, month), [year, month]);

  // 교체 모달 상태
  const [swapTarget, setSwapTarget] = useState<AssignmentData | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<number | "">("");
  const [reason, setReason] = useState("");
  const [showCrossGradeConfirm, setShowCrossGradeConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleSwapClick = useCallback((assignment: AssignmentData) => {
    setSwapTarget(assignment);
    setSelectedTeacher("");
    setReason("");
    setShowCrossGradeConfirm(false);
  }, []);

  const handleSwapSubmit = useCallback(async () => {
    if (!swapTarget || !selectedTeacher) return;

    const teacher = teachers.find((t) => t.id === selectedTeacher);
    const isCrossGrade = teacher && !teacher.grades.includes(swapTarget.grade);

    if (isCrossGrade && !showCrossGradeConfirm) {
      setShowCrossGradeConfirm(true);
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`/api/supervisor-assignments/${swapTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replacementTeacherId: selectedTeacher,
          reason: reason || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "교체에 실패했습니다.");
      setSwapTarget(null);
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "교체에 실패했습니다.";
      alert(msg);
    } finally {
      setProcessing(false);
    }
  }, [swapTarget, selectedTeacher, reason, teachers, showCrossGradeConfirm, mutate]);

  const getAssignment = (date: Date, g: number, sessionType: string) =>
    assignments.find(
      (a) => a.date === formatDate(date) && a.grade === g && a.sessionType === sessionType
    );

  const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;
  const todayStr = formatDate(today);

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  return (
    <div>
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">
          &larr; 이전달
        </button>
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-gray-800">
            {year}년 {month + 1}월 감독배정표
          </span>
          <button onClick={goToday} className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100">
            이번달
          </button>
        </div>
        <button onClick={nextMonth} className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">
          다음달 &rarr;
        </button>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300 inline-block" /> 내 배정
        </span>
        <span>학년별 1명이 오후 + 야간 모두 담당</span>
      </div>

      {isLoading && (
        <div className="text-center py-4 text-sm text-gray-400">로딩 중...</div>
      )}

      {/* 달력 그리드 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className={`px-2 py-2 sm:py-3 text-center text-xs sm:text-sm font-medium ${
                i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-500"
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {/* 날짜 셀 */}
        <div className="grid grid-cols-7">
          {monthDays.map((date, idx) => (
            <div
              key={idx}
              className={`min-h-[90px] sm:min-h-[120px] border-b border-r border-gray-100 p-1 sm:p-2 ${
                !date ? "bg-gray-50" : isWeekend(date) ? "bg-gray-50" : ""
              }`}
            >
              {date && (
                <>
                  <div
                    className={`text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1 ${
                      formatDate(date) === todayStr
                        ? "text-white bg-blue-600 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[10px] sm:text-xs"
                        : date.getDay() === 0
                          ? "text-red-400"
                          : date.getDay() === 6
                            ? "text-blue-400"
                            : "text-gray-700"
                    }`}
                  >
                    {date.getDate()}
                  </div>
                  {!isWeekend(date) && (
                    <div className="space-y-0.5 sm:space-y-1">
                      {SLOTS.map((slot) => {
                        const assignment = getAssignment(date, slot.grade, slot.sessionType);
                        const isMine = assignment?.teacherId === currentUserId;
                        const isFutureOrToday = formatDate(date) >= todayStr;

                        return (
                          <div
                            key={`${slot.grade}-${slot.sessionType}`}
                            className={`flex items-center gap-0.5 sm:gap-1 px-1 py-0.5 sm:py-1 rounded text-[10px] sm:text-sm leading-tight ${
                              isMine
                                ? "bg-yellow-100 border border-yellow-300 font-bold text-yellow-900"
                                : assignment
                                  ? "text-gray-800 font-medium"
                                  : "text-gray-300"
                            }`}
                          >
                            <span className="text-[9px] sm:text-xs text-gray-400 shrink-0">{slot.grade}</span>
                            <span className="truncate flex-1">
                              {assignment?.teacherName ?? "-"}
                            </span>
                            {assignment && isFutureOrToday && (
                              <button
                                onClick={() => handleSwapClick(assignment)}
                                className="shrink-0 text-[9px] sm:text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                교체
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 교체 모달 */}
      {swapTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">감독 교체</h2>
            <div className="text-sm text-gray-600 mb-4">
              {swapTarget.date} {swapTarget.grade}학년 감독을 교체합니다.
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  교체 대상 교사
                </label>
                <TeacherSearchSelect
                  teachers={teachers}
                  grade={swapTarget.grade}
                  value={selectedTeacher}
                  onChange={(id) => {
                    setSelectedTeacher(id);
                    setShowCrossGradeConfirm(false);
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  교체 사유 (선택)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="교체 사유를 입력하세요"
                />
              </div>

              {showCrossGradeConfirm && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2 text-sm text-yellow-800">
                  선택한 교사는 다른 학년 소속입니다. 정말 교체하시겠습니까?
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setSwapTarget(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSwapSubmit}
                disabled={!selectedTeacher || processing}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processing
                  ? "처리 중..."
                  : showCrossGradeConfirm
                    ? "확인 후 교체"
                    : "교체"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TeacherSearchSelect({
  teachers,
  grade,
  value,
  onChange,
}: {
  teachers: TeacherData[];
  grade: number;
  value: number | "";
  onChange: (id: number | "") => void;
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

  const separatorAfter = grouped.primary.length > 0 && grouped.others.length > 0
    ? grouped.primary.length - 1
    : -1;

  useEffect(() => { setHighlightIdx(0); }, [allFiltered]);

  useEffect(() => {
    if (isOpen && listRef.current) {
      const el = listRef.current.children[highlightIdx] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIdx, isOpen]);

  const selectTeacher = (id: number) => {
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
        if (allFiltered[highlightIdx]) selectTeacher(allFiltered[highlightIdx].id);
        break;
      case "Escape": setIsOpen(false); setQuery(""); break;
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={isOpen ? query : selectedName || query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          if (!e.target.value) onChange("");
        }}
        onFocus={() => { setQuery(""); setIsOpen(true); }}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder="이름을 입력하여 검색..."
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {isOpen && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto"
        >
          {allFiltered.map((t, idx) => (
            <li
              key={t.id}
              onMouseDown={() => selectTeacher(t.id)}
              onMouseEnter={() => setHighlightIdx(idx)}
              className={`px-3 py-2 text-sm cursor-pointer ${
                idx === highlightIdx
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-50"
              } ${t.id === value ? "font-semibold" : ""} ${
                idx === separatorAfter ? "border-b border-gray-300" : ""
              }`}
            >
              {t.name}
              {t.primaryGrade && (
                <span className="text-xs text-gray-400 ml-1">{t.primaryGrade}학년</span>
              )}
            </li>
          ))}
          {allFiltered.length === 0 && query && (
            <li className="px-3 py-2 text-sm text-gray-400">검색 결과가 없습니다</li>
          )}
        </ul>
      )}
    </div>
  );
}
