"use client";

import { useState, useRef, useCallback } from "react";
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
}

type Tab = "afternoon" | "night";

export default function AttendanceGradePage() {
  const params = useParams();
  const router = useRouter();
  const grade = parseInt(params.grade as string);
  const [tab, setTab] = useState<Tab>("afternoon");
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyDay[]>([]);
  const [weeklyName, setWeeklyName] = useState("");
  const [activatedStudents, setActivatedStudents] = useState<Set<number>>(new Set());
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })).toISOString().split("T")[0];
  const todayFormatted = (() => {
    const d = new Date();
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} (${days[d.getDay()]})`;
  })();

  const { data, mutate } = useSWR(
    `/api/attendance?date=${today}&session=${tab}&grade=${grade}`,
    fetcher,
    { refreshInterval: 30000 }
  );

  const rooms: Room[] = data?.rooms || [];
  const attendances: Record<number, AttendanceRecord> = data?.attendances || {};
  const supervisor = data?.supervisor;

  // 출석 카운트
  const allStudents = rooms.flatMap((r) =>
    r.seats.filter((s) => s.student && s.student.isParticipating)
  );
  const presentCount = allStudents.filter(
    (s) => attendances[s.student!.id]?.status === "present"
  ).length;
  const absentCount = allStudents.filter(
    (s) => attendances[s.student!.id]?.status === "absent"
  ).length;
  const uncheckedCount = allStudents.length - presentCount - absentCount;
  const totalSeats = rooms.reduce((sum, r) => sum + r.seats.filter((s) => s.student).length, 0);

  async function handleToggle(studentId: number) {
    const current = attendances[studentId]?.status || "unchecked";
    const res = await fetch("/api/attendance/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, sessionType: tab, date: today, currentStatus: current }),
    });
    const result = await res.json();

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
  }

  async function handleSeatClick(studentId: number, isParticipating: boolean) {
    // 비참여 + 미활성화 → 무시 (길게 터치로만 활성화)
    if (!isParticipating && !activatedStudents.has(studentId)) return;
    await handleToggle(studentId);
  }

  const handlePointerDown = useCallback((studentId: number, isParticipating: boolean) => {
    if (isParticipating || activatedStudents.has(studentId)) return;
    longPressTimerRef.current = setTimeout(() => {
      setActivatedStudents(prev => new Set(prev).add(studentId));
      longPressTimerRef.current = null;
    }, 500);
  }, [activatedStudents]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  async function handleInfoClick(e: React.MouseEvent, studentId: number, name: string) {
    e.stopPropagation(); // 좌석 클릭(출석토글) 방지
    if (selectedSeat === studentId) {
      // 이미 열려있으면 닫기
      setSelectedSeat(null);
      return;
    }
    setSelectedSeat(studentId);
    setWeeklyName(name);
    const res = await fetch(`/api/attendance/weekly?studentId=${studentId}&date=${today}`);
    const result = await res.json();
    setWeeklyData(result.weekly || []);
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
                  const isApproved = student.isApprovedAbsence;
                  const isSelected = selectedSeat === student.id;
                  const isInactive = !student.isParticipating && !activatedStudents.has(student.id);
                  let seatClass = "";
                  if (isInactive) {
                    seatClass = "bg-[#e5e7eb] text-[#9ca3af] border-[#d1d5db] opacity-60";
                  } else if (isSelected) {
                    seatClass = "bg-[#2563eb] text-white border-[#1d4ed8] shadow-[0_2px_8px_rgba(37,99,235,0.3)]";
                  } else if (isApproved) {
                    seatClass = "bg-[#fef9c3] border-[#facc15]";
                  } else if (status === "present") {
                    seatClass = "bg-[#bbf7d0] border-transparent";
                  } else if (status === "absent") {
                    seatClass = "bg-[#fecaca] border-transparent";
                  } else {
                    seatClass = "bg-[#dbeafe] border-transparent";
                  }
                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`relative rounded-[clamp(3px,0.8vw,5px)] py-[clamp(4px,1vw,8px)] px-[clamp(1px,0.3vw,4px)] text-center cursor-pointer border-2 transition-all active:scale-95 min-w-0 select-none ${seatClass}`}
                      onClick={() => handleSeatClick(student.id, student.isParticipating)}
                      onPointerDown={() => handlePointerDown(student.id, student.isParticipating)}
                      onPointerUp={handlePointerUp}
                      onPointerLeave={handlePointerUp}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      <button
                        onClick={(e) => handleInfoClick(e, student.id, student.name)}
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
                        {student.name}
                      </div>
                      <div className={`text-[clamp(7px,1.8vw,9px)] mt-0.5 ${isSelected ? "text-[#bfdbfe]" : "text-[#6b7280]"}`}>
                        {grade}-{student.classNumber}
                      </div>
                      {isApproved && !isSelected && (
                        <div className="text-[7px] text-[#ca8a04] mt-0.5">불참승인</div>
                      )}
                    </div>
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

  // 주간 출석 팝업
  function renderWeeklyPopup(room: Room, selectedInThisRow: Seat) {
    return (
      <div
        className="relative bg-[#eff6ff] border-2 border-[#2563eb] rounded-lg p-[clamp(8px,2vw,14px)]"
        style={{ marginBottom: "clamp(3px, 0.8vw, 6px)" }}
      >
        <div
          className="absolute -top-[8px] w-[14px] h-[14px] bg-[#eff6ff] border-l-2 border-t-2 border-[#2563eb] rotate-45"
          style={{
            left: `calc(${(selectedInThisRow.colIndex + 0.5) / room.cols * 100}% - 7px)`,
          }}
        />
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
            const record = tab === "afternoon" ? d.afternoon : d.night;
            const status = record?.status;
            if (!participating) {
              return (
                <div
                  key={`cell-${d.date}`}
                  className="rounded-[4px] py-[clamp(6px,1.5vw,10px)] px-1 text-[clamp(9px,2.2vw,11px)] font-medium bg-[#e5e7eb] text-[#9ca3af]"
                >
                  -
                </div>
              );
            }
            let cellClass = "bg-[#f3f4f6] text-[#9ca3af]";
            let label = "-";
            if (status === "present") { cellClass = "bg-[#bbf7d0] text-[#166534]"; label = "출석"; }
            else if (status === "absent") { cellClass = "bg-[#fecaca] text-[#991b1b]"; label = "결석"; }
            return (
              <div
                key={`cell-${d.date}`}
                className={`rounded-[4px] py-[clamp(6px,1.5vw,10px)] px-1 text-[clamp(9px,2.2vw,11px)] font-medium ${cellClass} ${
                  isToday ? "border-2 border-[#2563eb] font-bold text-[clamp(10px,2.5vw,12px)]" : ""
                }`}
              >
                {label}
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
          <div className="flex gap-2 ml-auto shrink-0 whitespace-nowrap text-[clamp(10px,2.4vw,12px)]">
            <span className="opacity-85">
              출석 <b className="opacity-100 font-bold" style={{ color: "#86efac" }}>{presentCount}</b>
            </span>
            <span className="opacity-85">
              결석 <b className="opacity-100 font-bold" style={{ color: "#fca5a5" }}>{absentCount}</b>
            </span>
            <span className="opacity-85">
              미체크 <b className="opacity-100 font-bold">{uncheckedCount}</b>
            </span>
          </div>
          <button
            onClick={() => setShowGradeModal(true)}
            className="ml-2 shrink-0 bg-white/20 hover:bg-white/30 text-white text-[clamp(10px,2.4vw,12px)] px-2.5 py-1 rounded-md transition-colors"
          >
            다른학년
          </button>
        </div>

        {/* 오후/야간 탭 */}
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
        </div>
      </div>

      {/* 교실 콘텐츠 */}
      <div className="max-w-[960px] mx-auto px-3 pb-3">
        <div className="bg-white rounded-b-xl p-3 flex flex-col gap-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          {grade === 2 && tab === "night" ? (
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
                { color: "#e5e7eb", label: "비참여" },
                { color: "#2563eb", label: "선택됨", textWhite: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1 text-[clamp(9px,2.2vw,11px)] whitespace-nowrap">
                  <div
                    className="w-[clamp(10px,2.5vw,14px)] h-[clamp(10px,2.5vw,14px)] rounded-[3px] shrink-0"
                    style={{ background: item.color }}
                  />
                  {item.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
