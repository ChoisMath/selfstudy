"use client";

import { Fragment, useState, useRef, useCallback, useEffect, useMemo, memo } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import AttendanceDatePicker from "@/components/attendance/AttendanceDatePicker";
import { getKstTodayString, formatDateLabel } from "@/lib/calendar";
import { formatMonthDay, formatWeekOfMonth } from "@/lib/format-date";
import MiraeHallLayout, { GAP_CONFIG } from "@/components/seats/MiraeHallLayout";
import ClassroomFrame from "@/components/seats/ClassroomFrame";
import { buildPrintGroups, type ClassroomMeta } from "@/lib/seats/print-groups";
import { SESSION_TYPES, SESSION_META, seatSessionOf, sessionTypesOfSeat, type SessionType } from "@/lib/sessions";
import { reasonLabel } from "@/lib/absence-reasons";
import { summarizeWeeklyCell, type WeeklyDayRow, type WeeklyCellKind } from "@/lib/attendance/weekly-summary";

const COPY_SOURCE: SessionType = "afternoon1";
const COPY_TARGET: SessionType = "afternoon2";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Seat {
  rowIndex: number;
  colIndex: number;
  student: {
    id: number;
    name: string;
    classNumber: number;
    studentNumber: number;
    isParticipating: boolean;
    isApprovedAbsence: boolean;
    isAfterSchool: boolean;
    hasPendingAbsenceRequest: boolean;
  } | null;
}

interface Room {
  id: number;
  name: string;
  cols: number;
  rows: number;
  sortOrder: number;
  classroom?: ClassroomMeta | null;
  seats: Seat[];
}

interface AttendanceRecord {
  id: number;
  status: string;
  absenceReason?: { reasonType: string; detail: string | null };
}

interface WeeklyTotals {
  monthlyMinutes: number;
  monthlyHours: number;
  academicYearMinutes: number;
  academicYearHours: number;
}

interface WeeklyRanking {
  rank: number;
  totalRanked: number;
  topPercent: number;
}

type Tab = SessionType | "absence";

type AbsenceRequestItem = {
  id: number;
  student: {
    id: number;
    name: string;
    grade: number;
    classNumber: number;
    studentNumber: number;
  };
  sessionType: SessionType;
  date: string;
  reasonType: string;
  detail: string | null;
  status: string;
  reviewer: { id: number; name: string } | null;
  reviewedAt: string | null;
  createdAt: string;
};

type TodaySupervisorAssignment = {
  id: number;
  grade: number;
  sessionType: SessionType;
};

interface SeatCellProps {
  student: NonNullable<Seat["student"]>;
  status: string;
  isSelected: boolean;
  isInactive: boolean;
  grade: number;
  attendanceStatus?: AttendanceRecord;
  onSeatClick: (studentId: number, isParticipating: boolean) => void;
  onPointerDown: (studentId: number, isParticipating: boolean) => void;
  onPointerUp: () => void;
  onInfoClick: (e: React.MouseEvent, studentId: number, name: string) => void;
  /** 길게 누르기의 키보드 대안(Shift+Enter): 비참여 학생 활성화/해제 */
  onActivateToggle: (studentId: number) => void;
}

const SeatCell = memo(function SeatCell({
  student, status, isSelected, isInactive, grade,
  attendanceStatus, onSeatClick, onPointerDown, onPointerUp, onInfoClick, onActivateToggle,
}: SeatCellProps) {
  let seatClass = "";
  if (isInactive) {
    seatClass = "bg-[#e5e7eb] text-[#9ca3af] border-[#d1d5db] opacity-70";
  } else if (isSelected) {
    seatClass = "bg-[#2563eb] text-white border-[#1d4ed8] shadow-[0_2px_8px_rgba(37,99,235,0.3)]";
  } else if (student.isAfterSchool) {
    const aStatus = attendanceStatus?.status || "unchecked";
    if (aStatus === "present") seatClass = "bg-[#fef9c3] text-[#1e293b] border-[#22c55e]";
    else if (aStatus === "absent") seatClass = "bg-[#fef9c3] text-[#1e293b] border-[#ef4444]";
    else seatClass = "bg-[#fef9c3] text-[#1e293b] border-[#facc15]";
  } else if (student.isApprovedAbsence) {
    seatClass = "bg-[#fef9c3] text-[#1e293b] border-[#facc15]";
  } else if (status === "present") {
    seatClass = "bg-[#bbf7d0] text-[#1e293b] border-transparent";
  } else if (status === "absent") {
    seatClass = "bg-[#fecaca] text-[#1e293b] border-transparent";
  } else {
    seatClass = "bg-[#dbeafe] text-[#1e293b] border-transparent";
  }

  const aStatus = attendanceStatus?.status || "unchecked";
  const statusLabel = isInactive
    ? "비참여"
    : student.isAfterSchool
      ? `방과후 ${aStatus === "present" ? "출석" : aStatus === "absent" ? "결석" : "미체크"}`
      : student.isApprovedAbsence
        ? "불참승인"
        : status === "present" ? "출석" : status === "absent" ? "결석" : "미체크";

  return (
    <div
      className={`relative rounded-[clamp(3px,0.8vw,5px)] border-2 min-w-0 min-h-11 select-none transition-[background-color,border-color,box-shadow] ${seatClass}`}
    >
      {/* 좌석 본체 = 진짜 버튼(키보드·스크린리더 접근, 44px 이상). 정보 버튼은 형제 요소라 중첩 버튼이 아니다 */}
      <button
        type="button"
        aria-label={`${student.name} ${grade}-${student.classNumber} ${statusLabel}${student.hasPendingAbsenceRequest ? " 불참신청 대기" : ""}`}
        className="w-full h-full min-h-11 py-[clamp(4px,1vw,8px)] px-[clamp(1px,0.3vw,4px)] text-center cursor-pointer touch-manipulation rounded-[inherit] transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
        onClick={() => onSeatClick(student.id, student.isParticipating)}
        onPointerDown={() => onPointerDown(student.id, student.isParticipating)}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            onActivateToggle(student.id);
          }
        }}
      >
        <div className="font-bold text-[clamp(9px,2.2vw,12px)] whitespace-nowrap overflow-hidden text-ellipsis pr-[clamp(10px,2.5vw,14px)]">
          {student.hasPendingAbsenceRequest && (
            <span className="text-[#ef4444] font-black" aria-hidden="true">*</span>
          )}
          {student.name}
        </div>
        <div className={`text-[clamp(8px,2vw,10px)] mt-0.5 tabular-nums ${isSelected ? "text-[#bfdbfe]" : "text-[#6b7280]"}`}>
          {grade}-{student.classNumber}
        </div>
        {student.isApprovedAbsence && !isSelected && (
          <div className="text-[clamp(7px,1.8vw,9px)] text-[#ca8a04] mt-0.5">불참승인</div>
        )}
        {student.isAfterSchool && !isSelected && (
          aStatus === "present" ? <div className="text-[clamp(7px,1.8vw,9px)] text-[#166534] mt-0.5">출석</div>
          : aStatus === "absent" ? <div className="text-[clamp(7px,1.8vw,9px)] text-[#991b1b] mt-0.5">결석</div>
          : <div className="text-[clamp(7px,1.8vw,9px)] text-[#ca8a04] mt-0.5">방과후</div>
        )}
      </button>
      <button
        type="button"
        onClick={(e) => onInfoClick(e, student.id, student.name)}
        aria-label={`${student.name} 주간 출석현황`}
        title="주간 출석현황"
        className={`absolute top-0 right-0 w-[clamp(20px,5vw,26px)] h-[clamp(20px,5vw,26px)] rounded-full text-[clamp(8px,2vw,11px)] font-bold leading-none flex items-center justify-center cursor-pointer touch-manipulation transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          isSelected
            ? "bg-white/30 text-white hover:bg-white/50"
            : "bg-black/5 text-[#6b7280] hover:bg-black/10 hover:text-[#1e293b]"
        }`}
      >
        i
      </button>
    </div>
  );
});

export default function AttendanceGradePage() {
  const params = useParams();
  const router = useRouter();
  const grade = parseInt(params.grade as string);
  const [tab, setTab] = useState<Tab>("afternoon1");
  const [isCopying, setIsCopying] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyDayRow[]>([]);
  const [weeklyTotals, setWeeklyTotals] = useState<WeeklyTotals | null>(null);
  const [weeklyRanking, setWeeklyRanking] = useState<WeeklyRanking | null>(null);
  const [weeklyName, setWeeklyName] = useState("");
  const [activatedStudents, setActivatedStudents] = useState<Set<number>>(new Set());
  const [noteValues, setNoteValues] = useState<Record<string, string>>({});
  const [showBulkApproveModal, setShowBulkApproveModal] = useState(false);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activatedStudentsRef = useRef(activatedStudents);
  activatedStudentsRef.current = activatedStudents;
  const attendancesRef = useRef<Record<number, AttendanceRecord>>({});
  // 세션 캐시: 동일 학생 "i" 재클릭 시 네트워크 요청 생략
  const weeklyCacheRef = useRef<
    Map<number, { weekly: WeeklyDayRow[]; totals: WeeklyTotals | null; ranking: WeeklyRanking | null; name: string }>
  >(new Map());

  const today = useMemo(() => getKstTodayString(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const selectedDateFormatted = formatDateLabel(selectedDate);

  const { data: session } = useSession();
  const canChangeDate =
    session?.user?.roles?.includes("admin") || (session?.user?.subAdminGrades?.length ?? 0) > 0;
  const [showDatePicker, setShowDatePicker] = useState(false);

  function handleDateChange(date: string) {
    setSelectedDate(date);
    setSelectedSeat(null);
    setActivatedStudents(new Set());
    setWeeklyTotals(null);
    setWeeklyRanking(null);
    weeklyCacheRef.current.clear();
    setShowDatePicker(false);
  }

  const { data, error: seatsError, mutate } = useSWR(
    tab !== "absence" ? `/api/attendance?date=${selectedDate}&session=${tab}&grade=${grade}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const [absenceFilter, setAbsenceFilter] = useState<string>("pending");

  const { data: absenceData, mutate: mutateAbsence } = useSWR(
    tab === "absence" ? `/api/attendance/absence-requests?grade=${grade}${absenceFilter !== "all" ? `&status=${absenceFilter}` : ""}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  // 불참신청 탭은 세션이 특정되지 않아 /api/attendance 를 부르지 않으므로 감독교사를 따로 조회
  const { data: absenceSupervisorData } = useSWR(
    tab === "absence" ? `/api/attendance/supervisor?date=${selectedDate}&grade=${grade}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: todayAssignmentsData } = useSWR(
    "/api/supervisor-assignments/my-today",
    fetcher,
    { revalidateOnFocus: false }
  );

  // pending 건수 (탭 배지용) — 탭과 무관하게 항상 조회
  const { data: pendingCountData, mutate: mutatePendingCount } = useSWR(
    `/api/attendance/absence-requests?grade=${grade}&status=pending`,
    fetcher,
    { revalidateOnFocus: false }
  );
  const pendingCount = pendingCountData?.requests?.length ?? 0;
  const pendingAbsenceRequests = (pendingCountData?.requests ?? []) as AbsenceRequestItem[];
  const assignedSessionTypes = new Set(
    ((todayAssignmentsData?.assignments ?? []) as TodaySupervisorAssignment[])
      .filter((assignment) => assignment.grade === grade)
      .map((assignment) => assignment.sessionType)
  );
  const bulkCandidates = pendingAbsenceRequests.filter(
    (request) =>
      request.status === "pending" &&
      request.date === today &&
      assignedSessionTypes.has(request.sessionType)
  );

  const seatSession = tab === "absence" ? null : seatSessionOf(tab);
  const rooms: Room[] = data?.rooms || [];
  const attendances: Record<number, AttendanceRecord> = data?.attendances || {};
  attendancesRef.current = attendances;
  const supervisor =
    tab === "absence" ? absenceSupervisorData?.supervisor : data?.supervisor;

  // 출석 카운트
  const allStudents = rooms.flatMap((r) =>
    r.seats.filter((s) => s.student && s.student.isParticipating)
  );
  const afterSchoolStudents = allStudents.filter((s) => s.student!.isAfterSchool);
  const afterSchoolDefaultCount = afterSchoolStudents.filter(
    (s) => !attendances[s.student!.id] || attendances[s.student!.id]?.status === "unchecked"
  ).length;
  const presentCount = allStudents.filter(
    (s) => attendances[s.student!.id]?.status === "present"
  ).length;
  const absentCount = allStudents.filter(
    (s) => attendances[s.student!.id]?.status === "absent"
  ).length;
  const uncheckedCount = allStudents.length - presentCount - absentCount - afterSchoolDefaultCount;

  async function handleToggle(studentId: number) {
    const current = attendances[studentId]?.status || "unchecked";
    const nextStatus = current === "unchecked" ? "present" : current === "present" ? "absent" : "unchecked";

    // 출석 상태가 바뀌면 주간 팝업 데이터도 stale — 해당 학생 세션 캐시 무효화
    weeklyCacheRef.current.delete(studentId);

    // 낙관적 업데이트: UI 즉시 반영
    mutate(
      (prev: typeof data) => {
        if (!prev) return prev;
        const newAttendances = { ...prev.attendances };
        if (nextStatus === "unchecked") {
          delete newAttendances[studentId];
        } else {
          newAttendances[studentId] = { id: attendances[studentId]?.id ?? 0, status: nextStatus };
        }
        return { ...prev, attendances: newAttendances };
      },
      { revalidate: false }
    );

    // 백그라운드 API 요청
    try {
      const res = await fetch("/api/attendance/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, sessionType: tab, date: selectedDate, currentStatus: current }),
      });
      if (!res.ok) {
        // 실패 시 롤백
        mutate();
        return;
      }
      const result = await res.json();
      // 서버 응답의 실제 id로 갱신
      mutate(
        (prev: typeof data) => {
          if (!prev) return prev;
          const newAttendances = { ...prev.attendances };
          if (result.status === "unchecked") {
            delete newAttendances[studentId];
          } else {
            newAttendances[studentId] = { id: result.id, status: result.status };
          }
          return { ...prev, attendances: newAttendances };
        },
        { revalidate: false }
      );
    } catch {
      // 네트워크 오류 시 롤백
      mutate();
    }
  }

  async function handleSeatClick(studentId: number, isParticipating: boolean) {
    // 비참여 + 미활성화 + 기존 출석기록 없음 → 무시 (길게 터치로만 활성화)
    if (!isParticipating && !activatedStudents.has(studentId) && !attendances[studentId]) return;
    await handleToggle(studentId);
  }

  const handlePointerDown = useCallback((studentId: number, isParticipating: boolean) => {
    if (isParticipating) return;
    const alreadyActivated = activatedStudentsRef.current.has(studentId);
    // 이미 활성화된 학생: 출석기록 없으면 비활성화, 있으면 무시
    if (alreadyActivated) {
      if (attendancesRef.current[studentId]) return;
      longPressTimerRef.current = setTimeout(() => {
        setActivatedStudents(prev => { const next = new Set(prev); next.delete(studentId); return next; });
        longPressTimerRef.current = null;
      }, 500);
      return;
    }
    // 미활성화 학생: 기존 출석기록 있으면 무시, 없으면 활성화
    if (attendancesRef.current[studentId]) return;
    longPressTimerRef.current = setTimeout(() => {
      setActivatedStudents(prev => new Set(prev).add(studentId));
      longPressTimerRef.current = null;
    }, 500);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // 길게 누르기(500ms)의 키보드 대안: Shift+Enter 로 즉시 활성화/해제 (기존 출석기록이 있으면 무시 — 포인터 규칙과 동일)
  const handleActivateToggle = useCallback((studentId: number) => {
    if (attendancesRef.current[studentId]) return;
    setActivatedStudents(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId); else next.add(studentId);
      return next;
    });
  }, []);

  function applyWeeklyResult(
    studentId: number,
    name: string,
    weekly: WeeklyDayRow[],
    totals: WeeklyTotals | null,
    ranking: WeeklyRanking | null,
  ) {
    setSelectedSeat(studentId);
    setWeeklyName(name);
    setWeeklyData(weekly);
    setWeeklyTotals(totals);
    setWeeklyRanking(ranking);
    const notes: Record<string, string> = {};
    for (const d of weekly) {
      const noteVal = tab === "absence" ? null : d.sessions[tab].note;
      if (noteVal) notes[d.date] = noteVal;
    }
    setNoteValues(notes);
  }

  async function handleInfoClick(e: React.MouseEvent, studentId: number, name: string) {
    e.stopPropagation();
    if (selectedSeat === studentId) {
      setSelectedSeat(null);
      setWeeklyTotals(null);
      setWeeklyRanking(null);
      return;
    }

    const cached = weeklyCacheRef.current.get(studentId);
    if (cached) {
      applyWeeklyResult(studentId, cached.name, cached.weekly, cached.totals, cached.ranking);
      return;
    }

    const res = await fetch(`/api/attendance/weekly?studentId=${studentId}&date=${selectedDate}`);
    if (!res.ok) return;
    const result = await res.json();
    const weekly = (result.weekly || []) as WeeklyDayRow[];
    const totals = (result.totals || null) as WeeklyTotals | null;
    const ranking = (result.ranking || null) as WeeklyRanking | null;
    weeklyCacheRef.current.set(studentId, { weekly, totals, ranking, name });
    applyWeeklyResult(studentId, name, weekly, totals, ranking);
  }

  // 모달(<lg) 표시 중 ESC로 닫기 + body scroll lock
  useEffect(() => {
    if (selectedSeat === null) return;

    const prevOverflow = document.body.style.overflow;
    const mql = window.matchMedia("(max-width: 1023.98px)");

    const lockScroll = () => {
      if (mql.matches) document.body.style.overflow = "hidden";
    };

    lockScroll();
    mql.addEventListener("change", lockScroll);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedSeat(null);
        setWeeklyTotals(null);
        setWeeklyRanking(null);
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      mql.removeEventListener("change", lockScroll);
    };
  }, [selectedSeat]);

  useEffect(() => {
    if (!showDatePicker) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowDatePicker(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showDatePicker]);

  useEffect(() => {
    if (!showGradeModal && !showBulkApproveModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setShowGradeModal(false);
      if (!isBulkApproving) setShowBulkApproveModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showGradeModal, showBulkApproveModal, isBulkApproving]);

  async function handleNoteSave(studentId: number, date: string, note: string) {
    try {
      await fetch("/api/attendance/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, sessionType: tab, date, note: note.trim() }),
      });
    } catch { /* silent */ }
  }

  async function handleCopyFromSource() {
    if (!confirm("오후1 출석 결과를 오후2 미체크 학생에게 복사할까요?")) return;
    setIsCopying(true);
    try {
      const res = await fetch("/api/attendance/copy-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade, date: selectedDate, from: COPY_SOURCE, to: COPY_TARGET }),
      });
      const result = await res.json();
      if (!res.ok) {
        alert(result.error || "복사에 실패했습니다.");
        return;
      }
      weeklyCacheRef.current.clear();
      mutate();
      alert(`${result.copied}명 복사, ${result.skipped}명은 오후1 미체크·사유결석이라 건너뜀`);
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setIsCopying(false);
    }
  }

  // 좌석 그리드만 렌더링 (제목/교탁 없이)
  function renderAttendanceGrid(room: Room, opts?: { gapAfterRows?: number[] }) {
    return (
      <div className="p-[clamp(4px,1vw,8px)]">
        {Array.from({ length: room.rows }, (_, rowIndex) => {
          const selectedInThisRow = room.seats.find(
            (s) => s.rowIndex === rowIndex && s.student?.id === selectedSeat
          );
          return (
            <div key={`row-${rowIndex}`}>
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${room.cols}, 1fr)`,
                  gap: "clamp(2px, 0.6vw, 4px)",
                  marginBottom: opts?.gapAfterRows?.includes(rowIndex) ? "10px" : "clamp(2px, 0.6vw, 4px)",
                }}
              >
                {Array.from({ length: room.cols }, (_, colIndex) => {
                  const seat = room.seats.find(
                    (s) => s.rowIndex === rowIndex && s.colIndex === colIndex
                  );
                  const student = seat?.student;
                  if (!student) {
                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className="rounded-[clamp(4px,1vw,6px)] bg-[#f9fafb] min-h-[clamp(36px,8vw,48px)]"
                      />
                    );
                  }
                  const status = attendances[student.id]?.status || "unchecked";
                  const isSelected = selectedSeat === student.id;
                  const isInactive = !student.isParticipating && !activatedStudents.has(student.id) && !attendances[student.id];
                  return (
                    <SeatCell
                      key={`${rowIndex}-${colIndex}`}
                      student={student}
                      status={status}
                      isSelected={isSelected}
                      isInactive={isInactive}
                      grade={grade}
                      attendanceStatus={attendances[student.id]}
                      onSeatClick={handleSeatClick}
                      onPointerDown={handlePointerDown}
                      onPointerUp={handlePointerUp}
                      onInfoClick={handleInfoClick}
                      onActivateToggle={handleActivateToggle}
                    />
                  );
                })}
              </div>
              {/* 주간 출석 팝업 */}
              {selectedInThisRow && weeklyData.length > 0 && renderWeeklyPopup(room, selectedInThisRow)}
            </div>
          );
        })}
      </div>
    );
  }

  // 전체 방 카드 렌더링 (제목 + 그리드 + 교탁)
  function renderAttendanceRoom(room: Room, opts: { compact?: boolean; hideTeacherDesk?: boolean; gapAfterRows?: number[] }) {
    const roomStudents = room.seats.filter((s) => s.student);
    return (
      <div key={room.id} className="border border-[#e2e8f0] rounded-[10px] overflow-hidden">
        <div className="bg-[#f8fafc] px-3.5 py-2.5 border-b border-[#e2e8f0] flex justify-between items-center">
          <span className={`font-bold text-[#334155] ${opts.compact ? "text-[clamp(10px,2.5vw,12px)]" : "text-[clamp(12px,3vw,14px)]"}`}>{room.name}</span>
          <span className="text-[clamp(10px,2.5vw,12px)] text-[#94a3b8] font-medium">{roomStudents.length}석</span>
        </div>
        {renderAttendanceGrid(room, { gapAfterRows: opts.gapAfterRows })}
        {!opts.hideTeacherDesk && (
          <div className="text-center py-1.5 bg-[#f9fafb] border-t border-dashed border-[#d1d5db] text-[#9ca3af] text-[clamp(10px,2.5vw,12px)]">
            교탁
          </div>
        )}
      </div>
    );
  }

  const weeklyCellStyle: Record<WeeklyCellKind, string> = {
    "not-participating": "bg-[#e5e7eb] text-[#9ca3af]",
    "approved-absence": "bg-[#fef9c3] text-[#ca8a04]",
    "after-school": "bg-[#fef9c3] text-[#ca8a04]",
    present: "bg-[#bbf7d0] text-[#166534]",
    absent: "bg-[#fecaca] text-[#991b1b]",
    unchecked: "bg-[#f3f4f6] text-[#9ca3af]",
  };

  // 주간 팝업/모달 공통 콘텐츠 (래퍼 없음)
  function renderWeeklyContent(selectedInThisRow: Seat) {
    if (tab === "absence") return null;
    const blockTypes = sessionTypesOfSeat(seatSessionOf(tab));
    const reasonLines = weeklyData.flatMap((d) =>
      blockTypes.flatMap((t) => {
        const cell = d.sessions[t];
        const r = cell.approvedReason ?? cell.reason;
        if (!r) return [];
        return [`${d.dayOfWeek} ${SESSION_META[t].shortLabel}: ${reasonLabel(r.type)}${r.detail ? ` (${r.detail})` : ""}`];
      })
    );
    const rowLabelClass =
      "text-[clamp(9px,2.2vw,11px)] font-semibold text-[#6b7280] whitespace-nowrap flex items-center justify-center px-1";

    return (
      <>
        <div className="flex justify-between items-center mb-2 flex-wrap gap-1">
          <span className="font-bold text-[clamp(11px,2.8vw,13px)] text-[#1e40af] whitespace-nowrap">
            {weeklyName} ({grade}-{selectedInThisRow.student?.classNumber})
          </span>
          <span className="text-[clamp(9px,2.2vw,11px)] text-[#6b7280] whitespace-nowrap">
            {formatWeekOfMonth(weeklyData[0]?.date ?? selectedDate)}
          </span>
        </div>
        <div className="grid grid-cols-[auto_repeat(5,1fr)] gap-[clamp(2px,0.6vw,4px)] text-center">
          <div />
          {weeklyData.map((d) => {
            const isToday = d.date === selectedDate;
            return (
              <div
                key={`h-${d.date}`}
                className={`text-[clamp(10px,2.5vw,12px)] py-0.5 ${
                  isToday
                    ? "font-extrabold text-[#1e40af] border-b-[3px] border-[#2563eb] pb-1.5"
                    : "font-medium text-[#6b7280]"
                }`}
              >
                {d.dayOfWeek}
              </div>
            );
          })}
          {blockTypes.map((t) => (
            <Fragment key={t}>
              <div className={rowLabelClass}>{SESSION_META[t].shortLabel}</div>
              {weeklyData.map((d) => {
                const isToday = d.date === selectedDate;
                const { kind, label } = summarizeWeeklyCell(d.sessions[t]);
                return (
                  <div
                    key={`cell-${t}-${d.date}`}
                    className={`rounded-[4px] py-[clamp(6px,1.5vw,10px)] px-1 text-[clamp(9px,2.2vw,11px)] font-medium whitespace-nowrap ${weeklyCellStyle[kind]} ${
                      isToday && kind !== "not-participating" ? "border-2 border-[#2563eb] font-bold" : ""
                    }`}
                  >
                    {label}
                  </div>
                );
              })}
            </Fragment>
          ))}
          <div className={rowLabelClass}>비고</div>
          {weeklyData.map((d) => {
            const participating = d.sessions[tab].participating;
            const noteKey = d.date;
            return (
              <div key={`note-${d.date}`} style={{ paddingTop: "2px" }}>
                <input
                  type="text"
                  maxLength={100}
                  placeholder="비고…"
                  aria-label={`${formatMonthDay(d.date)} 비고`}
                  autoComplete="off"
                  disabled={!participating}
                  value={noteValues[noteKey] ?? ""}
                  onChange={(e) => setNoteValues(prev => ({ ...prev, [noteKey]: e.target.value }))}
                  onBlur={() => handleNoteSave(selectedSeat!, d.date, noteValues[noteKey] ?? "")}
                  className={`w-full py-[clamp(2px,0.6vw,4px)] px-1 border rounded text-[clamp(8px,2vw,10px)] text-center ${
                    noteValues[noteKey]
                      ? "border-[#ea580c] bg-[#fff7ed] text-[#ea580c] font-medium"
                      : "border-[#cbd5e1] bg-white text-[#374151]"
                  } disabled:bg-gray-50 disabled:text-gray-300 disabled:border-gray-200`}
                />
              </div>
            );
          })}
        </div>
        {reasonLines.length > 0 && (
          <div className="mt-1.5 text-[clamp(9px,2.2vw,11px)] text-[#dc2626]">
            {reasonLines.join(", ")}
          </div>
        )}
        {/* 누계·랭킹 블록 */}
        {weeklyTotals && (
          <div className="mt-3 pt-3 border-t border-[#bfdbfe] grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] text-gray-500">이번 달</p>
              <p className="text-sm font-bold text-blue-700">{weeklyTotals.monthlyHours.toFixed(1)}h</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">학년도</p>
              <p className="text-sm font-bold text-indigo-700">{weeklyTotals.academicYearHours.toFixed(1)}h</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">학년 내 순위</p>
              {weeklyRanking ? (
                <p className="text-sm font-bold text-amber-600">
                  {weeklyRanking.rank}위{" "}
                  <span className="text-[10px] text-gray-500">(상위 {weeklyRanking.topPercent}%)</span>
                </p>
              ) : (
                <p className="text-xs text-gray-400">-</p>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  // 데스크톱 인라인 말풍선 래퍼 (>= lg)
  function renderWeeklyPopup(room: Room, selectedInThisRow: Seat) {
    return (
      <div
        className="hidden lg:block relative bg-[#eff6ff] border-2 border-[#2563eb] rounded-lg p-[clamp(8px,2vw,14px)]"
        style={{ marginBottom: "clamp(3px, 0.8vw, 6px)" }}
      >
        <div
          className="absolute -top-[8px] w-[14px] h-[14px] bg-[#eff6ff] border-l-2 border-t-2 border-[#2563eb] rotate-45"
          style={{
            left: `calc(${(selectedInThisRow.colIndex + 0.5) / room.cols * 100}% - 7px)`,
          }}
        />
        {renderWeeklyContent(selectedInThisRow)}
      </div>
    );
  }

  const reasonColors: Record<string, string> = {
    academy: "text-[#f59e0b]",
    afterschool: "text-[#8b5cf6]",
    illness: "text-[#ef4444]",
    custom: "text-[#6b7280]",
  };

  const statusLabels: Record<string, string> = {
    pending: "대기중",
    approved: "승인",
    rejected: "반려",
  };

  async function handleAbsenceAction(requestId: number, action: "approved" | "rejected") {
    const label = action === "approved" ? "승인" : "반려";
    if (!confirm(`이 불참신청을 ${label}하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/homeroom/absence-requests/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "처리에 실패했습니다.");
        return;
      }

      mutateAbsence();
      mutatePendingCount();
      mutate();
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    }
  }

  async function handleBulkApprove(candidates: AbsenceRequestItem[]) {
    const sessionTypes = Array.from(new Set(candidates.map((candidate) => candidate.sessionType)));
    setIsBulkApproving(true);

    try {
      let totalApproved = 0;
      for (const sessionType of sessionTypes) {
        const res = await fetch("/api/attendance/absence-requests/bulk-approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grade, date: today, sessionType }),
        });

        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || "일괄승인에 실패했습니다.");
        }

        totalApproved += result.approvedCount || 0;
      }

      setShowBulkApproveModal(false);
      mutateAbsence();
      mutatePendingCount();
      mutate();
      alert(`${totalApproved}건을 승인했습니다.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "일괄승인에 실패했습니다.");
    } finally {
      setIsBulkApproving(false);
    }
  }

  function renderAbsenceRequests() {
    const requests = (absenceData?.requests || []) as AbsenceRequestItem[];

    return (
      <div>
        {/* 필터 버튼 */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto">
          {[
            { key: "pending", label: `대기중${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
            { key: "approved", label: "승인" },
            { key: "rejected", label: "반려" },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={absenceFilter === f.key}
              onClick={() => setAbsenceFilter(f.key)}
              className={`min-h-11 px-3 rounded-full text-[clamp(11px,2.8vw,13px)] font-semibold cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                absenceFilter === f.key
                  ? "bg-primary text-white"
                  : "bg-butter text-ink-muted hover:bg-peach hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowBulkApproveModal(true)}
            disabled={bulkCandidates.length === 0 || isBulkApproving}
            className="ml-auto shrink-0 min-h-11 bg-primary text-white px-3 rounded-xl text-[clamp(11px,2.8vw,13px)] font-semibold cursor-pointer hover:bg-primary-deep disabled:bg-line disabled:text-ink-muted disabled:cursor-not-allowed transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            일괄승인{bulkCandidates.length > 0 ? ` (${bulkCandidates.length})` : ""}
          </button>
        </div>

        {/* 요청 목록 */}
        {requests.length === 0 ? (
          <div className="text-center text-[#94a3b8] py-12 text-sm">
            {absenceFilter === "pending" ? "대기 중인 불참신청이 없습니다." : "불참신청이 없습니다."}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {requests.map((r) => {
              const dateLabel = formatMonthDay(r.date);

              return (
                <div key={r.id} className="bg-white border border-[#e2e8f0] rounded-lg p-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-sm">
                        {r.student.name}{" "}
                        <span className="text-[#94a3b8] font-normal text-xs">
                          {r.student.grade}학년 {r.student.classNumber}반 {r.student.studentNumber}번
                        </span>
                      </div>
                      <div className="text-xs text-[#64748b] mt-1">
                        {dateLabel} · {SESSION_META[r.sessionType].label} ·{" "}
                        <span className={reasonColors[r.reasonType] || "text-[#6b7280]"}>
                          {reasonLabel(r.reasonType)}
                        </span>
                      </div>
                      {r.detail && (
                        <div className="text-[11px] text-[#94a3b8] mt-0.5">{r.detail}</div>
                      )}
                      {r.reviewer && (
                        <div className="text-[11px] text-[#94a3b8] mt-1">
                          처리: {r.reviewer.name} ({statusLabels[r.status]})
                        </div>
                      )}
                    </div>
                    {r.status === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAbsenceAction(r.id, "approved")}
                          aria-label={`${r.student.name} ${dateLabel} 불참신청 승인`}
                          className="min-h-11 bg-primary text-white px-3 rounded-xl text-xs font-semibold cursor-pointer hover:bg-primary-deep transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                          승인
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAbsenceAction(r.id, "rejected")}
                          aria-label={`${r.student.name} ${dateLabel} 불참신청 반려`}
                          className="min-h-11 bg-white border border-line text-ink-muted px-3 rounded-xl text-xs cursor-pointer hover:bg-butter hover:text-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          반려
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-canvas min-h-dvh">
      {/* 고정 상단 바 - seat-responsive-v2 디자인 */}
      <div className="sticky top-0 z-[100] bg-canvas px-3 pt-2 max-w-[960px] mx-auto relative">
        {/* 날짜 바 */}
        <div
          className="rounded-[10px] px-3.5 min-h-11 flex items-center gap-2 overflow-x-auto text-white"
          style={{
            background: "linear-gradient(135deg, var(--color-primary-deep), var(--color-primary))",
            scrollbarWidth: "none",
          }}
        >
          {canChangeDate ? (
            <button
              type="button"
              onClick={() => setShowDatePicker((v) => !v)}
              className="text-[clamp(13px,3.5vw,16px)] font-bold whitespace-nowrap shrink-0 min-h-11 self-stretch flex items-center gap-1 cursor-pointer rounded-md hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              aria-expanded={showDatePicker}
              aria-haspopup="dialog"
              aria-label={`날짜 선택, 현재 ${selectedDateFormatted}`}
            >
              {selectedDateFormatted}
              <span className="text-[11px] leading-none" aria-hidden="true">▾</span>
            </button>
          ) : (
            <span className="text-[clamp(13px,3.5vw,16px)] font-bold whitespace-nowrap shrink-0">
              {selectedDateFormatted}
            </span>
          )}
          {selectedDate !== today && (
            <span className="shrink-0 text-[10px] bg-white/20 px-1.5 py-0.5 rounded whitespace-nowrap">
              오늘 아님
            </span>
          )}
          <div className="w-px h-4 bg-white/30 shrink-0" />
          <span className="text-[clamp(11px,2.6vw,13px)] whitespace-nowrap shrink-0 opacity-90">
            감독{" "}
            <span className="bg-white/20 px-1.5 py-0.5 rounded font-semibold">
              {supervisor?.name || "미배정"}
            </span>
          </span>
          <div className="w-px h-4 bg-white/30 shrink-0" />
          <span className="text-[clamp(11px,2.6vw,13px)] font-bold whitespace-nowrap shrink-0">
            {grade}학년
          </span>
          {tab !== "absence" && (
            <div className="flex gap-2 ml-auto shrink-0 whitespace-nowrap text-[clamp(10px,2.4vw,12px)] tabular-nums">
              <span className="opacity-90">
                출석 <b className="opacity-100 font-bold" style={{ color: "#dcfce7" }}>{presentCount}</b>
              </span>
              <span className="opacity-90">
                결석 <b className="opacity-100 font-bold" style={{ color: "#fee2e2" }}>{absentCount}</b>
              </span>
              <span className="opacity-90">
                미체크 <b className="opacity-100 font-bold">{uncheckedCount}</b>
              </span>
              <span className="opacity-90">
                방과후 <b className="opacity-100 font-bold" style={{ color: "#fef9c3" }}>{afterSchoolDefaultCount}</b>
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowGradeModal(true)}
            className={`${tab === "absence" ? "ml-auto" : "ml-2"} group shrink-0 cursor-pointer min-h-11 self-stretch flex items-center whitespace-nowrap text-white text-[clamp(10px,2.4vw,12px)] focus-visible:outline-none`}
          >
            <span className="bg-white/20 group-hover:bg-white/30 group-focus-visible:ring-2 group-focus-visible:ring-white/70 px-2.5 py-1 rounded-md transition-colors">
              다른학년
            </span>
          </button>
        </div>

        {/* 블록 탭 3개 + 불참신청 */}
        <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }} role="tablist" aria-label="자습 블록">
          {SESSION_TYPES.map((sessionType) => (
            <button
              key={sessionType}
              type="button"
              role="tab"
              aria-selected={tab === sessionType}
              onClick={() => { setTab(sessionType); setSelectedSeat(null); setActivatedStudents(new Set()); }}
              className="group flex-1 min-w-[64px] min-h-11 pt-2 flex flex-col cursor-pointer touch-manipulation focus-visible:outline-none"
            >
              <span
                className={`flex-1 w-full flex items-center justify-center rounded-t-[10px] text-[clamp(12px,3vw,14px)] font-semibold transition-colors whitespace-nowrap group-focus-visible:ring-2 group-focus-visible:ring-primary ${
                  tab === sessionType
                    ? "bg-white text-primary shadow-[0_-2px_8px_rgba(0,0,0,0.06)]"
                    : "bg-peach/70 text-ink-muted group-hover:bg-peach group-hover:text-ink"
                }`}
              >
                {SESSION_META[sessionType].shortLabel}
              </span>
            </button>
          ))}
          <button
            type="button"
            role="tab"
            aria-selected={tab === "absence"}
            onClick={() => { setTab("absence"); setSelectedSeat(null); }}
            className="group flex-1 min-w-[64px] min-h-11 pt-2 flex flex-col cursor-pointer touch-manipulation focus-visible:outline-none"
          >
            <span
              className={`relative flex-1 w-full flex items-center justify-center rounded-t-[10px] text-[clamp(12px,3vw,14px)] font-semibold transition-colors whitespace-nowrap group-focus-visible:ring-2 group-focus-visible:ring-primary ${
                tab === "absence"
                  ? "bg-white text-primary shadow-[0_-2px_8px_rgba(0,0,0,0.06)]"
                  : "bg-peach/70 text-ink-muted group-hover:bg-peach group-hover:text-ink"
              }`}
            >
              불참신청
              {pendingCount > 0 && (
                <span className="absolute -top-1 right-0 bg-[#ef4444] text-white rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold tabular-nums" aria-label={`대기 ${pendingCount}건`}>
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </span>
          </button>
        </div>
        {canChangeDate && showDatePicker && (
          <>
            <div
              className="fixed inset-0 z-[110]"
              aria-hidden="true"
              onClick={() => setShowDatePicker(false)}
            />
            <div className="absolute z-[120] left-3 top-[3.5rem]">
              <AttendanceDatePicker value={selectedDate} today={today} onChange={handleDateChange} />
            </div>
          </>
        )}
      </div>

      {/* 교실 콘텐츠 */}
      <div className="max-w-[960px] mx-auto px-3 pb-3">
        <div className="bg-white rounded-b-xl p-3 flex flex-col gap-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          {tab === COPY_TARGET && rooms.length > 0 && (
            <div className="flex justify-end -mb-2">
              <button
                type="button"
                onClick={handleCopyFromSource}
                disabled={isCopying}
                className="min-h-11 px-4 rounded-xl text-[clamp(11px,2.8vw,13px)] font-semibold bg-butter text-primary-deep border border-primary-soft hover:bg-peach disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {isCopying ? "복사 중…" : "오후1 결과 복사"}
              </button>
            </div>
          )}
          {tab === "absence" ? (
            renderAbsenceRequests()
          ) : grade === 2 && seatSession === "night" ? (
            /* 2학년 야간: 미래홀 공간 배치 */
            <MiraeHallLayout
              rooms={rooms}
              renderRoom={(room) => renderAttendanceRoom(room, { compact: true, hideTeacherDesk: true, gapAfterRows: GAP_CONFIG[room.name] })}
            />
          ) : seatSession === "afternoon" ? (
            /* 오후 좌석: 학급(Classroom) 그룹 우선, 미분류 Room 은 이름 접두사 그룹 */
            <div className="flex flex-col gap-5">
              {buildPrintGroups(rooms, seatSession, grade).map((group, gi) => (
                  <div key={`${group.key}-${gi}`} className="border border-[#e2e8f0] rounded-[10px] overflow-hidden">
                    <div className="bg-[#f8fafc] px-3.5 py-2.5 border-b border-[#e2e8f0] flex justify-between items-center">
                      <span className="text-[clamp(12px,3vw,14px)] font-bold text-[#334155]">
                        {group.title}
                      </span>
                      <span className="text-[clamp(10px,2.5vw,12px)] text-[#94a3b8] font-medium">
                        {group.rooms.reduce((sum, r) => sum + r.seats.filter((s) => s.student).length, 0)}석
                      </span>
                    </div>
                    {group.classroom ? (
                      <div className="overflow-x-auto p-[clamp(6px,1.5vw,12px)]">
                        <ClassroomFrame corridorSide={group.classroom.corridorSide} variant="screen">
                          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${group.rooms.length}, 1fr)` }}>
                            {group.rooms.map((room) => (
                              <div key={room.id}>{renderAttendanceGrid(room)}</div>
                            ))}
                          </div>
                        </ClassroomFrame>
                      </div>
                    ) : (
                      <>
                        <div className={`grid gap-1 p-[clamp(6px,1.5vw,12px)]`} style={{ gridTemplateColumns: `repeat(${group.kind === "divisions-column" ? 1 : group.rooms.length}, 1fr)` }}>
                          {group.rooms.map((room) => (
                            <div key={room.id}>
                              {renderAttendanceGrid(room)}
                            </div>
                          ))}
                        </div>
                        <div className="text-center py-1.5 bg-[#f9fafb] border-t border-dashed border-[#d1d5db] text-[#9ca3af] text-[clamp(10px,2.5vw,12px)]">
                          교탁
                        </div>
                      </>
                    )}
                  </div>
              ))}
            </div>
          ) : (
            /* 기본: 세로 스택 */
            rooms.map((room) => renderAttendanceRoom(room, {}))
          )}

          {tab !== "absence" && rooms.length === 0 && (
            data === undefined && !seatsError ? (
              <div className="text-center text-ink-muted py-12" role="status" aria-live="polite">
                좌석 정보를 불러오는 중…
              </div>
            ) : seatsError ? (
              <div className="text-center py-12" role="alert">
                <p className="text-ink">좌석 정보를 불러오지 못했어요.</p>
                <button type="button" onClick={() => mutate()} className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-line bg-white px-4 text-sm font-medium text-ink hover:bg-butter cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">다시 시도</button>
              </div>
            ) : (
              <div className="text-center text-ink-muted py-12">
                좌석 배치가 설정되지 않았습니다.
              </div>
            )
          )}

          {/* 범례 */}
          {rooms.length > 0 && (
            <div className="flex gap-[clamp(8px,2vw,16px)] justify-center py-2.5 flex-wrap">
              {[
                { color: "#dbeafe", label: "미체크" },
                { color: "#bbf7d0", label: "출석" },
                { color: "#fecaca", label: "결석" },
                { color: "#fef9c3", label: "불참승인" },
                { color: "#fef9c3", label: "방과후", border: "#facc15" },
                { color: "#e5e7eb", label: "비참여" },
                { color: "#2563eb", label: "선택됨", textWhite: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1 text-[clamp(9px,2.2vw,11px)] whitespace-nowrap">
                  <div
                    className="w-[clamp(10px,2.5vw,14px)] h-[clamp(10px,2.5vw,14px)] rounded-[3px] shrink-0"
                    style={{ background: item.color, ...(item.border ? { border: `2px solid ${item.border}` } : {}) }}
                  />
                  {item.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 모바일/태블릿 오버레이 모달 (<1024px) */}
      {showBulkApproveModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={() => {
            if (!isBulkApproving) setShowBulkApproveModal(false);
          }}
        >
          <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-approve-title"
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85dvh] overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-3">
              <div>
                <h2 id="bulk-approve-title" className="text-base font-bold text-ink">불참신청 일괄승인</h2>
                <p className="text-xs text-[#64748b] mt-0.5">{bulkCandidates.length}건을 승인합니다.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkApproveModal(false)}
                disabled={isBulkApproving}
                className="w-11 h-11 flex items-center justify-center rounded-full text-ink-muted hover:bg-butter cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="닫기"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <div className="overflow-auto overscroll-contain max-h-[60dvh] border border-line rounded-xl">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-20 bg-[#f8fafc] border-b border-[#e2e8f0]">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-[#475569] whitespace-nowrap">학생</th>
                      <th className="px-3 py-2 text-center font-semibold text-[#475569] whitespace-nowrap">날짜</th>
                      <th className="px-3 py-2 text-center font-semibold text-[#475569] whitespace-nowrap">시간</th>
                      <th className="px-3 py-2 text-center font-semibold text-[#475569] whitespace-nowrap">사유</th>
                      <th className="px-3 py-2 text-left font-semibold text-[#475569] whitespace-nowrap">상세</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {bulkCandidates.map((request) => (
                      <tr key={request.id}>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="font-semibold text-[#0f172a]">{request.student.name}</span>
                          <span className="text-xs text-[#94a3b8] ml-1">
                            {request.student.grade}학년 {request.student.classNumber}반 {request.student.studentNumber}번
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center text-[#475569] whitespace-nowrap">{request.date}</td>
                        <td className="px-3 py-2 text-center text-[#475569] whitespace-nowrap">
                          {SESSION_META[request.sessionType].label}
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          <span className={reasonColors[request.reasonType] || "text-[#6b7280]"}>
                            {reasonLabel(request.reasonType)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[#64748b] whitespace-nowrap max-w-[260px] truncate">
                          {request.detail || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-[#e2e8f0] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkApproveModal(false)}
                disabled={isBulkApproving}
                className="min-h-11 px-4 py-2 rounded-md text-sm font-semibold bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0] disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => handleBulkApprove(bulkCandidates)}
                disabled={isBulkApproving || bulkCandidates.length === 0}
                className="min-h-11 px-4 py-2 rounded-md text-sm font-semibold bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:bg-[#cbd5e1] disabled:text-[#64748b] disabled:cursor-not-allowed"
              >
                {isBulkApproving ? "승인 중…" : "일괄승인"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedSeat !== null && weeklyData.length > 0 && (() => {
        // 모든 방을 순회하여 선택된 좌석 찾기
        let foundSeat: Seat | null = null;
        for (const room of rooms) {
          for (const s of room.seats) {
            if (s.student?.id === selectedSeat) {
              foundSeat = s;
              break;
            }
          }
          if (foundSeat) break;
        }
        if (!foundSeat) return null;
        return (
          <div
            className="lg:hidden fixed inset-0 z-[150] flex items-center justify-center p-4"
            onClick={() => {
              setSelectedSeat(null);
              setWeeklyTotals(null);
              setWeeklyRanking(null);
            }}
          >
            <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="주간 출석현황"
              className="relative bg-[#eff6ff] border-2 border-[#2563eb] rounded-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto overscroll-contain p-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label="닫기"
                className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center rounded-full text-ink-muted hover:text-ink hover:bg-white/70 cursor-pointer text-lg font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => {
                  setSelectedSeat(null);
                  setWeeklyTotals(null);
                  setWeeklyRanking(null);
                }}
              >
                ✕
              </button>
              <div className="pr-12">
                {renderWeeklyContent(foundSeat)}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 학년 선택 모달 */}
      {showGradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[150]" onClick={() => setShowGradeModal(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="grade-modal-title" className="bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-full mx-4 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 id="grade-modal-title" className="text-lg font-semibold mb-2 text-ink text-balance">출석 확인할 학년을 고르세요</h2>
            <div className="flex gap-2 sm:gap-3 justify-center mt-4">
              {[1, 2, 3].map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-current={g === grade ? "page" : undefined}
                  onClick={() => {
                    router.push(`/attendance/${g}`);
                    setShowGradeModal(false);
                  }}
                  className={`min-h-14 px-5 sm:px-8 rounded-2xl text-lg sm:text-xl font-bold cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    g === grade
                      ? "bg-primary text-white shadow-lg"
                      : "bg-butter text-ink hover:bg-peach"
                  }`}
                >
                  {g}학년
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
