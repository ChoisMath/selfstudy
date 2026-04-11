"use client";

import { useState, useRef, useCallback, useEffect, memo } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import MiraeHallLayout, { GAP_CONFIG } from "@/components/seats/MiraeHallLayout";

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
  seats: Seat[];
}

interface AttendanceRecord {
  id: number;
  status: string;
  absenceReason?: { reasonType: string; detail: string | null };
}

interface WeeklyDay {
  date: string;
  dayOfWeek: string;
  afternoon: { status: string; reason?: { type: string; detail: string | null } } | null;
  night: { status: string; reason?: { type: string; detail: string | null } } | null;
  afternoonParticipating: boolean;
  nightParticipating: boolean;
  afternoonNote: string | null;
  nightNote: string | null;
  afternoonAfterSchool: boolean;
  nightAfterSchool: boolean;
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

type Tab = "afternoon" | "night" | "absence";

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
}

const SeatCell = memo(function SeatCell({
  student, status, isSelected, isInactive, grade,
  attendanceStatus, onSeatClick, onPointerDown, onPointerUp, onInfoClick,
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

  return (
    <div
      className={`relative rounded-[clamp(3px,0.8vw,5px)] py-[clamp(4px,1vw,8px)] px-[clamp(1px,0.3vw,4px)] text-center cursor-pointer border-2 transition-all active:scale-95 min-w-0 select-none ${seatClass}`}
      onClick={() => onSeatClick(student.id, student.isParticipating)}
      onPointerDown={() => onPointerDown(student.id, student.isParticipating)}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        onClick={(e) => onInfoClick(e, student.id, student.name)}
        className={`absolute top-0.5 right-0.5 w-[clamp(12px,3vw,16px)] h-[clamp(12px,3vw,16px)] rounded-full text-[clamp(7px,1.8vw,10px)] font-bold leading-none flex items-center justify-center transition-colors ${
          isSelected
            ? "bg-white/30 text-white hover:bg-white/50"
            : "bg-black/5 text-[#6b7280] hover:bg-black/10 hover:text-[#1e293b]"
        }`}
        title="주간 출석현황"
      >
        i
      </button>
      <div className="font-bold text-[clamp(9px,2.2vw,12px)] whitespace-nowrap overflow-hidden text-ellipsis">
        {student.hasPendingAbsenceRequest && (
          <span className="text-[#ef4444] font-black">*</span>
        )}
        {student.name}
      </div>
      <div className={`text-[clamp(7px,1.8vw,9px)] mt-0.5 ${isSelected ? "text-[#bfdbfe]" : "text-[#6b7280]"}`}>
        {grade}-{student.classNumber}
      </div>
      {student.isApprovedAbsence && !isSelected && (
        <div className="text-[7px] text-[#ca8a04] mt-0.5">불참승인</div>
      )}
      {student.isAfterSchool && !isSelected && (() => {
        const aStatus = attendanceStatus?.status || "unchecked";
        if (aStatus === "present") return <div className="text-[7px] text-[#166534] mt-0.5">출석</div>;
        if (aStatus === "absent") return <div className="text-[7px] text-[#991b1b] mt-0.5">결석</div>;
        return <div className="text-[7px] text-[#ca8a04] mt-0.5">방과후</div>;
      })()}
    </div>
  );
});

export default function AttendanceGradePage() {
  const params = useParams();
  const router = useRouter();
  const grade = parseInt(params.grade as string);
  const [tab, setTab] = useState<Tab>("afternoon");
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyDay[]>([]);
  const [weeklyTotals, setWeeklyTotals] = useState<WeeklyTotals | null>(null);
  const [weeklyRanking, setWeeklyRanking] = useState<WeeklyRanking | null>(null);
  const [weeklyName, setWeeklyName] = useState("");
  const [activatedStudents, setActivatedStudents] = useState<Set<number>>(new Set());
  const [noteValues, setNoteValues] = useState<Record<string, string>>({});
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activatedStudentsRef = useRef(activatedStudents);
  activatedStudentsRef.current = activatedStudents;
  const attendancesRef = useRef<Record<number, AttendanceRecord>>({});

  const kstNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const today = `${kstNow.getFullYear()}-${String(kstNow.getMonth() + 1).padStart(2, "0")}-${String(kstNow.getDate()).padStart(2, "0")}`;
  const todayFormatted = (() => {
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return `${kstNow.getFullYear()}.${kstNow.getMonth() + 1}.${kstNow.getDate()} (${days[kstNow.getDay()]})`;
  })();

  const { data, mutate } = useSWR(
    tab !== "absence" ? `/api/attendance?date=${today}&session=${tab}&grade=${grade}` : null,
    fetcher,
    { revalidateOnFocus: true }
  );

  const [absenceFilter, setAbsenceFilter] = useState<string>("pending");

  const { data: absenceData, mutate: mutateAbsence } = useSWR(
    tab === "absence" ? `/api/attendance/absence-requests?grade=${grade}${absenceFilter !== "all" ? `&status=${absenceFilter}` : ""}` : null,
    fetcher,
    { revalidateOnFocus: true }
  );

  // pending 건수 (탭 배지용) — 탭과 무관하게 항상 조회
  const { data: pendingCountData, mutate: mutatePendingCount } = useSWR(
    `/api/attendance/absence-requests?grade=${grade}&status=pending`,
    fetcher,
    { revalidateOnFocus: true }
  );
  const pendingCount = pendingCountData?.requests?.length ?? 0;

  const rooms: Room[] = data?.rooms || [];
  const attendances: Record<number, AttendanceRecord> = data?.attendances || {};
  attendancesRef.current = attendances;
  const supervisor = data?.supervisor;

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
  const totalSeats = rooms.reduce((sum, r) => sum + r.seats.filter((s) => s.student).length, 0);

  async function handleToggle(studentId: number) {
    const current = attendances[studentId]?.status || "unchecked";
    const nextStatus = current === "unchecked" ? "present" : current === "present" ? "absent" : "unchecked";

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
        body: JSON.stringify({ studentId, sessionType: tab, date: today, currentStatus: current }),
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
    if (isParticipating || activatedStudentsRef.current.has(studentId) || attendancesRef.current[studentId]) return;
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

  async function handleInfoClick(e: React.MouseEvent, studentId: number, name: string) {
    e.stopPropagation();
    if (selectedSeat === studentId) {
      setSelectedSeat(null);
      setWeeklyTotals(null);
      setWeeklyRanking(null);
      return;
    }
    setSelectedSeat(studentId);
    setWeeklyName(name);
    const res = await fetch(`/api/attendance/weekly?studentId=${studentId}&date=${today}`);
    const result = await res.json();
    setWeeklyData(result.weekly || []);
    setWeeklyTotals(result.totals || null);
    setWeeklyRanking(result.ranking || null);
    const notes: Record<string, string> = {};
    for (const d of (result.weekly || []) as WeeklyDay[]) {
      const noteVal = tab === "afternoon" ? d.afternoonNote : d.nightNote;
      if (noteVal) notes[d.date] = noteVal;
    }
    setNoteValues(notes);
  }

  // 모달(<lg) 표시 중 ESC로 닫기 + body scroll lock
  useEffect(() => {
    if (selectedSeat === null) return;

    const prevOverflow = document.body.style.overflow;
    const mql = typeof window !== "undefined" ? window.matchMedia("(max-width: 1023.98px)") : null;

    const lockScroll = () => {
      if (mql?.matches) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = prevOverflow;
      }
    };

    lockScroll();
    mql?.addEventListener?.("change", lockScroll);

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
      mql?.removeEventListener?.("change", lockScroll);
    };
  }, [selectedSeat]);

  async function handleNoteSave(studentId: number, date: string, note: string) {
    try {
      await fetch("/api/attendance/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, sessionType: tab, date, note: note.trim() }),
      });
    } catch { /* silent */ }
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

  // 주간 팝업/모달 공통 콘텐츠 (래퍼 없음)
  function renderWeeklyContent(selectedInThisRow: Seat) {
    return (
      <>
        <div className="flex justify-between items-center mb-2 flex-wrap gap-1">
          <span className="font-bold text-[clamp(11px,2.8vw,13px)] text-[#1e40af] whitespace-nowrap">
            {weeklyName} ({grade}-{selectedInThisRow.student?.classNumber})
          </span>
          <span className="text-[clamp(9px,2.2vw,11px)] text-[#6b7280] whitespace-nowrap">
            {(() => {
              const d = new Date(weeklyData[0]?.date);
              return `${d.getMonth() + 1}월 ${Math.ceil(d.getDate() / 7)}주차`;
            })()}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-[clamp(2px,0.6vw,4px)] text-center">
          {weeklyData.map((d) => {
            const isToday = d.date === today;
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
          {weeklyData.map((d) => {
            const isToday = d.date === today;
            const participating = tab === "afternoon" ? d.afternoonParticipating : d.nightParticipating;
            const isAfterSchoolDay = tab === "afternoon" ? d.afternoonAfterSchool : d.nightAfterSchool;
            const record = tab === "afternoon" ? d.afternoon : d.night;
            const status = record?.status;
            if (!participating) {
              return (
                <div key={`cell-${d.date}`} className="rounded-[4px] py-[clamp(6px,1.5vw,10px)] px-1 text-[clamp(9px,2.2vw,11px)] font-medium bg-[#e5e7eb] text-[#9ca3af]">-</div>
              );
            }
            if (isAfterSchoolDay && (!status || status === "unchecked")) {
              return (
                <div key={`cell-${d.date}`} className={`rounded-[4px] py-[clamp(6px,1.5vw,10px)] px-1 text-[clamp(9px,2.2vw,11px)] font-medium bg-[#fef9c3] text-[#ca8a04] ${isToday ? "border-2 border-[#2563eb] font-bold text-[clamp(10px,2.5vw,12px)]" : ""}`}>
                  방과후
                </div>
              );
            }
            let cellClass = "bg-[#f3f4f6] text-[#9ca3af]";
            let label = "-";
            if (status === "present") { cellClass = "bg-[#bbf7d0] text-[#166534]"; label = "출석"; }
            else if (status === "absent") { cellClass = "bg-[#fecaca] text-[#991b1b]"; label = "결석"; }
            return (
              <div key={`cell-${d.date}`} className={`rounded-[4px] py-[clamp(6px,1.5vw,10px)] px-1 text-[clamp(9px,2.2vw,11px)] font-medium ${cellClass} ${isToday ? "border-2 border-[#2563eb] font-bold text-[clamp(10px,2.5vw,12px)]" : ""}`}>
                {label}
              </div>
            );
          })}
          {weeklyData.map((d) => {
            const participating = tab === "afternoon" ? d.afternoonParticipating : d.nightParticipating;
            const noteKey = d.date;
            return (
              <div key={`note-${d.date}`} style={{ paddingTop: "2px" }}>
                <input
                  type="text"
                  maxLength={100}
                  placeholder="비고"
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
        {weeklyData.some((d) => {
          const r = tab === "afternoon" ? d.afternoon : d.night;
          return r?.reason;
        }) && (
          <div className="mt-1.5 text-[clamp(9px,2.2vw,11px)] text-[#dc2626]">
            {weeklyData
              .filter((d) => (tab === "afternoon" ? d.afternoon : d.night)?.reason)
              .map((d) => {
                const r = (tab === "afternoon" ? d.afternoon : d.night)!.reason!;
                return `${d.dayOfWeek}: ${r.type}${r.detail ? ` (${r.detail})` : ""}`;
              })
              .join(", ")}
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

  const reasonLabels: Record<string, string> = {
    academy: "학원",
    afterschool: "방과후",
    illness: "질병",
    custom: "기타",
  };

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

  function renderAbsenceRequests() {
    const requests = absenceData?.requests || [];

    return (
      <div>
        {/* 필터 버튼 */}
        <div className="flex gap-2 mb-4">
          {[
            { key: "pending", label: `대기중${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
            { key: "approved", label: "승인" },
            { key: "rejected", label: "반려" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setAbsenceFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-[clamp(11px,2.8vw,13px)] font-semibold transition-all ${
                absenceFilter === f.key
                  ? "bg-[#3b82f6] text-white"
                  : "bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 요청 목록 */}
        {requests.length === 0 ? (
          <div className="text-center text-[#94a3b8] py-12 text-sm">
            {absenceFilter === "pending" ? "대기 중인 불참신청이 없습니다." : "불참신청이 없습니다."}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {requests.map((r: {
              id: number;
              student: { id: number; name: string; grade: number; classNumber: number; studentNumber: number };
              sessionType: string;
              date: string;
              reasonType: string;
              detail: string | null;
              status: string;
              reviewer: { id: number; name: string } | null;
              reviewedAt: string | null;
              createdAt: string;
            }) => {
              const dateObj = new Date(r.date + "T12:00:00+09:00");
              const days = ["일", "월", "화", "수", "목", "금", "토"];
              const dateLabel = `${dateObj.getMonth() + 1}/${dateObj.getDate()}(${days[dateObj.getDay()]})`;

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
                        {dateLabel} · {r.sessionType === "afternoon" ? "오후자습" : "야간자습"} ·{" "}
                        <span className={reasonColors[r.reasonType] || "text-[#6b7280]"}>
                          {reasonLabels[r.reasonType] || r.reasonType}
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
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => handleAbsenceAction(r.id, "approved")}
                          className="bg-[#3b82f6] text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-[#2563eb] transition-colors"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => handleAbsenceAction(r.id, "rejected")}
                          className="bg-[#f1f5f9] text-[#64748b] px-3 py-1.5 rounded-md text-xs hover:bg-[#e2e8f0] transition-colors"
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
    <div className="bg-[#f1f5f9] min-h-screen">
      {/* 고정 상단 바 - seat-responsive-v2 디자인 */}
      <div className="sticky top-0 z-[100] bg-[#f1f5f9] px-3 pt-2 max-w-[960px] mx-auto">
        {/* 날짜 바 */}
        <div
          className="rounded-[10px] px-3.5 py-2.5 flex items-center gap-2 overflow-x-auto text-white"
          style={{
            background: "linear-gradient(135deg, #1e40af, #2563eb)",
            scrollbarWidth: "none",
          }}
        >
          <span className="text-[clamp(13px,3.5vw,16px)] font-bold whitespace-nowrap shrink-0">
            {todayFormatted}
          </span>
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
            <div className="flex gap-2 ml-auto shrink-0 whitespace-nowrap text-[clamp(10px,2.4vw,12px)]">
              <span className="opacity-90">
                출석 <b className="opacity-100 font-bold" style={{ color: "#86efac" }}>{presentCount}</b>
              </span>
              <span className="opacity-90">
                결석 <b className="opacity-100 font-bold" style={{ color: "#fca5a5" }}>{absentCount}</b>
              </span>
              <span className="opacity-90">
                미체크 <b className="opacity-100 font-bold">{uncheckedCount}</b>
              </span>
              <span className="opacity-90">
                방과후 <b className="opacity-100 font-bold" style={{ color: "#fde047" }}>{afterSchoolDefaultCount}</b>
              </span>
            </div>
          )}
          <button
            onClick={() => setShowGradeModal(true)}
            className="ml-2 shrink-0 bg-white/20 hover:bg-white/30 text-white text-[clamp(10px,2.4vw,12px)] px-2.5 py-1 rounded-md transition-colors"
          >
            다른학년
          </button>
        </div>

        {/* 오후/야간/불참신청 탭 */}
        <div className="flex gap-1 mt-2">
          <button
            onClick={() => { setTab("afternoon"); setSelectedSeat(null); setActivatedStudents(new Set()); }}
            className={`flex-1 text-center py-2.5 rounded-t-[10px] text-[clamp(12px,3vw,14px)] font-semibold transition-all ${
              tab === "afternoon"
                ? "bg-white text-[#2563eb] shadow-[0_-2px_8px_rgba(0,0,0,0.06)]"
                : "bg-[#e2e8f0] text-[#94a3b8]"
            }`}
          >
            오후자습
          </button>
          <button
            onClick={() => { setTab("night"); setSelectedSeat(null); setActivatedStudents(new Set()); }}
            className={`flex-1 text-center py-2.5 rounded-t-[10px] text-[clamp(12px,3vw,14px)] font-semibold transition-all ${
              tab === "night"
                ? "bg-white text-[#2563eb] shadow-[0_-2px_8px_rgba(0,0,0,0.06)]"
                : "bg-[#e2e8f0] text-[#94a3b8]"
            }`}
          >
            야간자습
          </button>
          <button
            onClick={() => { setTab("absence"); setSelectedSeat(null); }}
            className={`flex-1 text-center py-2.5 rounded-t-[10px] text-[clamp(12px,3vw,14px)] font-semibold transition-all relative ${
              tab === "absence"
                ? "bg-white text-[#2563eb] shadow-[0_-2px_8px_rgba(0,0,0,0.06)]"
                : "bg-[#e2e8f0] text-[#94a3b8]"
            }`}
          >
            불참신청
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#ef4444] text-white rounded-full w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 교실 콘텐츠 */}
      <div className="max-w-[960px] mx-auto px-3 pb-3">
        <div className="bg-white rounded-b-xl p-3 flex flex-col gap-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          {tab === "absence" ? (
            renderAbsenceRequests()
          ) : grade === 2 && tab === "night" ? (
            /* 2학년 야간: 미래홀 공간 배치 */
            <MiraeHallLayout
              rooms={rooms}
              renderRoom={(room) => renderAttendanceRoom(room, { compact: true, hideTeacherDesk: true, gapAfterRows: GAP_CONFIG[room.name] })}
            />
          ) : tab === "afternoon" ? (
            /* 오후 자습: 이름 접두사 기반 그룹 */
            <div className="flex flex-col gap-5">
              {(() => {
                const sorted = [...rooms].sort((a, b) => a.sortOrder - b.sortOrder);
                const groups: typeof rooms[] = [];
                let currentGroup: typeof rooms = [];
                let currentPrefix = "";
                for (const room of sorted) {
                  const prefix = room.name.split(" ")[0];
                  if (prefix !== currentPrefix && currentGroup.length > 0) {
                    groups.push(currentGroup);
                    currentGroup = [];
                  }
                  currentPrefix = prefix;
                  currentGroup.push(room);
                }
                if (currentGroup.length > 0) groups.push(currentGroup);
                return groups.map((group, gi) => (
                  <div key={gi} className="border border-[#e2e8f0] rounded-[10px] overflow-hidden">
                    <div className="bg-[#f8fafc] px-3.5 py-2.5 border-b border-[#e2e8f0] flex justify-between items-center">
                      <span className="text-[clamp(12px,3vw,14px)] font-bold text-[#334155]">
                        {group[0]?.name.split(" ")[0]}
                      </span>
                      <span className="text-[clamp(10px,2.5vw,12px)] text-[#94a3b8] font-medium">
                        {group.reduce((sum, r) => sum + r.seats.filter((s) => s.student).length, 0)}석
                      </span>
                    </div>
                    <div className={`grid gap-1 p-[clamp(6px,1.5vw,12px)]`} style={{ gridTemplateColumns: `repeat(${group[0]?.name.startsWith("오후미래혜윰") ? 1 : group.length}, 1fr)` }}>
                      {group.map((room) => (
                        <div key={room.id}>
                          {renderAttendanceGrid(room)}
                        </div>
                      ))}
                    </div>
                    <div className="text-center py-1.5 bg-[#f9fafb] border-t border-dashed border-[#d1d5db] text-[#9ca3af] text-[clamp(10px,2.5vw,12px)]">
                      교탁
                    </div>
                  </div>
                ));
              })()}
            </div>
          ) : (
            /* 기본: 세로 스택 */
            rooms.map((room) => renderAttendanceRoom(room, {}))
          )}

          {rooms.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              좌석 배치가 설정되지 않았습니다.
            </div>
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
      {selectedSeat !== null && weeklyData.length > 0 && (() => {
        // 모든 방을 순회하여 선택된 좌석 찾기
        let foundSeat: Seat | null = null;
        const allRooms = (data?.rooms || []) as Room[];
        for (const room of allRooms) {
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
            className="lg:hidden fixed inset-0 z-50 flex items-center justify-center p-4"
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
              className="relative bg-[#eff6ff] border-2 border-[#2563eb] rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label="닫기"
                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 text-lg font-bold"
                onClick={() => {
                  setSelectedSeat(null);
                  setWeeklyTotals(null);
                  setWeeklyRanking(null);
                }}
              >
                ✕
              </button>
              <div className="pr-6">
                {renderWeeklyContent(foundSeat)}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 학년 선택 모달 */}
      {showGradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowGradeModal(false)}>
          <div className="bg-white rounded-xl p-8 max-w-sm w-full mx-4 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-2">출석 확인할 학년 선택</h2>
            <div className="flex gap-3 justify-center mt-4">
              {[1, 2, 3].map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    router.push(`/attendance/${g}`);
                    setShowGradeModal(false);
                  }}
                  className={`px-8 py-5 rounded-xl text-xl font-bold transition-all ${
                    g === grade
                      ? "bg-[#2563eb] text-white shadow-lg"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
