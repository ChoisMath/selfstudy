"use client";

import { useState, useCallback, useMemo, useRef, useEffect, useId } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import SupervisorSummaryModal from "@/components/homeroom/SupervisorSummaryModal";
import { REPRESENTATIVE_SESSION_TYPE, type SessionType } from "@/lib/sessions";
import { chrome } from "@/components/ui/chrome";
import { formatFullDate, formatYearMonth } from "@/lib/format-date";

type AssignmentData = {
  id: number;
  date: string;
  grade: number;
  sessionType: SessionType;
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

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `${res.status} 오류가 발생했습니다.`);
  }
  return res.json();
};

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const SLOTS = [1, 2, 3].map((g) => ({
  grade: g, sessionType: REPRESENTATIVE_SESSION_TYPE, label: `${g}학년`,
}));

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMonthDays(year: number, month: number, weekdayOnly: boolean) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: (Date | null)[] = [];
  if (weekdayOnly) {
    // 월=0, 화=1, ... 금=4 기준 패딩
    const firstWeekday = firstDay.getDay(); // 0=일~6=토
    const paddingCount = firstWeekday === 0 ? 0 : firstWeekday - 1; // 월요일 기준
    for (let i = 0; i < paddingCount; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      if (date.getDay() >= 1 && date.getDay() <= 5) days.push(date);
    }
  } else {
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  }
  return days;
}

export default function SchedulePage() {
  const { data: session } = useSession();
  const myPrimaryGrade = session?.user?.primaryGrade ?? undefined;
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [showWeekend, setShowWeekend] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const { data, error, mutate, isLoading } = useSWR<ScheduleResponse>(
    `/api/homeroom/schedule?month=${monthStr}`,
    fetcher
  );

  const currentUserId = data?.currentUserId ?? 0;
  const assignments = data?.assignments ?? [];
  const teachers = useMemo(() => data?.teachers ?? [], [data]);

  const monthDays = useMemo(() => getMonthDays(year, month, !showWeekend), [year, month, showWeekend]);

  // 교체 모달 상태
  const [swapTarget, setSwapTarget] = useState<AssignmentData | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<number | "">("");
  const [reason, setReason] = useState("");
  const [showCrossGradeConfirm, setShowCrossGradeConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);

  const ids = useId();
  const swapTitleId = `${ids}-swap-title`;
  const swapDescId = `${ids}-swap-desc`;
  const teacherInputId = `${ids}-teacher`;
  const reasonId = `${ids}-reason`;
  const swapPanelRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef(false);
  useEffect(() => {
    processingRef.current = processing;
  }, [processing]);

  const handleSwapClick = useCallback((assignment: AssignmentData) => {
    setSwapTarget(assignment);
    setSelectedTeacher("");
    setReason("");
    setShowCrossGradeConfirm(false);
    setSwapError(null);
  }, []);

  const closeSwap = useCallback(() => {
    if (processingRef.current) return;
    setSwapTarget(null);
  }, []);

  // 교체 모달: Escape 닫기·Tab 순환·열릴 때 첫 컨트롤 포커스·닫힐 때 복귀·배경 스크롤 잠금
  useEffect(() => {
    if (!swapTarget) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = swapPanelRef.current;
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    (focusables()[0] ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!processingRef.current) {
          e.preventDefault();
          setSwapTarget(null);
        }
        return;
      }
      if (e.key === "Tab") {
        const f = focusables();
        if (f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, [swapTarget]);

  const handleSwapSubmit = useCallback(async () => {
    if (!swapTarget || !selectedTeacher) return;

    const teacher = teachers.find((t) => t.id === selectedTeacher);
    const isCrossGrade = teacher && !teacher.grades.includes(swapTarget.grade);

    if (isCrossGrade && !showCrossGradeConfirm) {
      setShowCrossGradeConfirm(true);
      return;
    }

    setProcessing(true);
    setSwapError(null);
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
      setSwapError(`${msg} 다시 시도하세요.`);
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
      {/* 월 네비게이션 — 아래 세 버튼의 className 은 tests/responsive-tables 가 문자열로 검사하므로 chrome 상수 대신 리터럴 */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <button onClick={prevMonth} type="button" aria-label="이전 달" className="inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-butter hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <span aria-hidden="true">&larr;</span>
        </button>
        <div className="flex flex-1 flex-wrap items-center justify-center gap-2">
          <span className="whitespace-nowrap text-lg font-semibold text-ink tabular-nums">
            {formatYearMonth(year, month + 1)}
          </span>
          {(year !== today.getFullYear() || month !== today.getMonth()) && (
            <button onClick={goToday} type="button" className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-line bg-white px-3 text-xs font-medium text-ink whitespace-nowrap transition-colors hover:bg-butter focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              이번 달
            </button>
          )}
        </div>
        <button onClick={nextMonth} type="button" aria-label="다음 달" className="inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-butter hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <span aria-hidden="true">&rarr;</span>
        </button>
      </div>

      {/* 범례 + 주말 토글 */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded border border-yellow-300 bg-yellow-100" aria-hidden="true" /> 내 배정
          </span>
          <span className="whitespace-nowrap">학년별 1명 (오후1·오후2·야간)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowWeekend(!showWeekend)}
            aria-pressed={showWeekend}
            className={`${chrome.chip(showWeekend)} text-xs`}
          >
            주말 표시
          </button>
          <button
            type="button"
            onClick={() => setShowSummary(true)}
            className={`${chrome.secondaryButton} px-3 text-xs`}
          >
            누계
          </button>
        </div>
      </div>

      <div aria-live="polite" role="status">
        {isLoading && <div className="py-4 text-center text-sm text-ink-muted">로딩 중…</div>}
        {error && <div className={`${chrome.notice("error")} mb-3`}>{error.message}</div>}
      </div>

      {/* 달력 그리드 */}
      <div className={`${chrome.card} overflow-hidden`}>
        {/* 요일 헤더 */}
        <div className={`grid ${showWeekend ? "grid-cols-7" : "grid-cols-5"} border-b border-line bg-butter`}>
          {DAY_LABELS.filter((_, i) => showWeekend || (i >= 1 && i <= 5)).map((label) => (
            <div
              key={label}
              className={`px-2 py-2 text-center text-xs font-medium sm:py-3 sm:text-sm ${
                label === "일" ? "text-red-400" : label === "토" ? "text-blue-400" : "text-ink-muted"
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {/* 날짜 셀 */}
        <div className={`grid ${showWeekend ? "grid-cols-7" : "grid-cols-5"}`}>
          {monthDays.map((date, idx) => (
            <div
              key={idx}
              className={`min-h-[90px] border-b border-r border-line/70 p-1 sm:min-h-[120px] sm:p-2 ${
                !date ? "bg-canvas/60" : isWeekend(date) ? "bg-canvas/60" : ""
              }`}
            >
              {date && (
                <>
                  <div
                    className={`mb-0.5 text-xs font-semibold tabular-nums sm:mb-1 sm:text-sm ${
                      formatDate(date) === todayStr
                        ? "flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-white sm:h-6 sm:w-6 sm:text-xs"
                        : date.getDay() === 0
                          ? "text-red-400"
                          : date.getDay() === 6
                            ? "text-blue-400"
                            : "text-ink"
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

                        // 9px "교체" 글자 대신 행 전체가 44px 탭 타겟(responsive-ui §6)
                        const rowClass = `flex min-h-11 items-center gap-0.5 sm:gap-1 px-1 py-0.5 sm:py-1 rounded text-[10px] sm:text-sm leading-tight ${
                          isMine
                            ? "bg-yellow-100 border border-yellow-300 font-bold text-yellow-900"
                            : assignment
                              ? "text-ink font-medium"
                              : "text-gray-300"
                        }`;
                        const rowContent = (
                          <>
                            <span className="shrink-0 text-[9px] text-ink-muted/70 sm:text-xs">{slot.grade}</span>
                            <span className="min-w-0 flex-1 truncate">{assignment?.teacherName ?? "-"}</span>
                          </>
                        );

                        return assignment && isFutureOrToday ? (
                          <button
                            key={`${slot.grade}-${slot.sessionType}`}
                            type="button"
                            onClick={() => handleSwapClick(assignment)}
                            aria-label={`${slot.grade}학년 ${assignment.teacherName} 감독 교체`}
                            className={`${rowClass} w-full cursor-pointer text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isMine ? "hover:bg-yellow-200" : "hover:bg-peach"}`}
                          >
                            {rowContent}
                            <span className="shrink-0 text-[9px] font-medium text-primary sm:text-xs">교체</span>
                          </button>
                        ) : (
                          <div key={`${slot.grade}-${slot.sessionType}`} className={rowClass}>
                            {rowContent}
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

      {/* 누계 모달 */}
      {showSummary && (
        <SupervisorSummaryModal onClose={() => setShowSummary(false)} filterGrade={myPrimaryGrade} />
      )}

      {/* 교체 모달 — 카드 여백(mx-2 p-3 sm:mx-4 sm:p-6)은 tests/responsive-tables 가 검사한다 */}
      {swapTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50" onClick={closeSwap}>
          <div
            ref={swapPanelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={swapTitleId}
            aria-describedby={swapDescId}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[90dvh] overflow-y-auto overscroll-contain rounded-2xl bg-white shadow-xl focus:outline-none mx-2 p-3 sm:mx-4 sm:p-6"
          >
            <h2 id={swapTitleId} className="mb-1 text-lg font-bold text-ink text-balance">감독 교체</h2>
            <p id={swapDescId} className="mb-4 text-sm text-ink-muted">
              {formatFullDate(swapTarget.date)} {swapTarget.grade}학년 감독({swapTarget.teacherName})을 교체합니다.
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor={teacherInputId} className={chrome.label}>
                  교체 대상 교사
                </label>
                <TeacherSearchSelect
                  id={teacherInputId}
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
                <label htmlFor={reasonId} className={chrome.label}>
                  교체 사유 (선택)
                </label>
                <textarea
                  id={reasonId}
                  name="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  autoComplete="off"
                  className={`${chrome.input} resize-none py-2`}
                  placeholder="예: 출장으로 감독 불가…"
                />
              </div>

              <div role="status" aria-live="polite" className="space-y-2">
                {showCrossGradeConfirm && (
                  <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                    선택한 교사는 다른 학년 소속입니다. 정말 교체하시겠습니까?
                  </div>
                )}
                {swapError && <div className={chrome.notice("error")}>{swapError}</div>}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button type="button" onClick={closeSwap} disabled={processing} className={chrome.secondaryButton}>
                취소
              </button>
              <button
                type="button"
                onClick={handleSwapSubmit}
                disabled={!selectedTeacher || processing}
                aria-busy={processing}
                className={chrome.primaryButton}
              >
                {processing
                  ? "처리 중…"
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
  id,
  teachers,
  grade,
  value,
  onChange,
}: {
  id?: string;
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
  const autoId = useId();
  const listId = `${autoId}-listbox`;
  const optionId = (teacherId: number) => `${autoId}-opt-${teacherId}`;

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

  const [prevAllFiltered, setPrevAllFiltered] = useState(allFiltered);
  if (prevAllFiltered !== allFiltered) {
    setPrevAllFiltered(allFiltered);
    setHighlightIdx(0);
  }

  useEffect(() => {
    if (isOpen && listRef.current) {
      const el = listRef.current.children[highlightIdx] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIdx, isOpen]);

  const selectTeacher = (teacherId: number) => {
    onChange(teacherId);
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
      case "Escape":
        // 목록만 닫고 모달의 Escape(닫기)까지 올라가지 않게 한다
        e.stopPropagation();
        setIsOpen(false);
        setQuery("");
        break;
    }
  };

  const activeOption = isOpen && allFiltered[highlightIdx] ? optionId(allFiltered[highlightIdx].id) : undefined;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-activedescendant={activeOption}
        autoComplete="off"
        spellCheck={false}
        value={isOpen ? query : selectedName || query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          if (!e.target.value) onChange("");
        }}
        onFocus={() => { setQuery(""); setIsOpen(true); }}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder="이름을 입력하여 검색…"
        className={chrome.input}
      />
      {isOpen && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="교체 대상 교사 목록"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto overscroll-contain rounded-xl border border-line bg-white shadow-lg"
        >
          {allFiltered.map((t, idx) => (
            <li
              key={t.id}
              id={optionId(t.id)}
              role="option"
              aria-selected={idx === highlightIdx}
              onMouseDown={() => selectTeacher(t.id)}
              onMouseEnter={() => setHighlightIdx(idx)}
              className={`flex min-h-11 cursor-pointer items-center px-3 text-sm ${
                idx === highlightIdx
                  ? "bg-peach text-primary-deep"
                  : "text-ink hover:bg-butter"
              } ${t.id === value ? "font-semibold" : ""} ${
                idx === separatorAfter ? "border-b border-line" : ""
              }`}
            >
              {t.name}
              {t.primaryGrade && (
                <span className="ml-1 text-xs text-ink-muted">{t.primaryGrade}학년</span>
              )}
            </li>
          ))}
          {allFiltered.length === 0 && query && (
            <li role="option" aria-selected={false} aria-disabled="true" className="flex min-h-11 items-center px-3 text-sm text-ink-muted">
              검색 결과가 없습니다
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
