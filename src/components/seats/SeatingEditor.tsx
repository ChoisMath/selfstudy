"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import useSWR from "swr";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import RoomGrid from "./RoomGrid";
import UnassignedStudents from "./UnassignedStudents";
import MiraeHallLayout, { GAP_CONFIG } from "./MiraeHallLayout";
import { buildPrintGroups } from "@/lib/seats/print-groups";
import { participatesInSeatSession } from "@/lib/seats/seat-participation";
import { type SeatSessionType } from "@/lib/sessions";

type ParticipationDay = {
  sessionType: string;
  isParticipating: boolean;
};

type Student = {
  id: number;
  name: string;
  grade: number;
  classNumber: number;
  studentNumber: number;
  participationDays?: ParticipationDay[];
};

type SeatLayoutItem = {
  id: number;
  rowIndex: number;
  colIndex: number;
  studentId: number | null;
  student: Student | null;
};

type Room = {
  id: number;
  name: string;
  cols: number;
  rows: number;
  sortOrder: number;
  seatLayouts: SeatLayoutItem[];
};

type StudySession = {
  id: number;
  type: SeatSessionType;
  grade: number;
  name: string;
  rooms: Room[];
};

// 좌석 셀 상태를 위한 타입
type CellState = {
  studentId: number | null;
  student: Student | null;
};

// 교실별 좌석 맵: roomId -> row -> col -> CellState
type RoomSeats = Map<string, CellState>; // key: "row-col"
type AllSeats = Map<number, RoomSeats>; // key: roomId

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const EMPTY_ROOM_SEATS: RoomSeats = new Map();

export default function SeatingEditor({
  grade,
  sessionType,
}: {
  grade: number;
  sessionType: SeatSessionType;
}) {
  const [seats, setSeats] = useState<AllSeats>(new Map());
  const [dirty, setDirty] = useState<Set<number>>(new Set()); // 변경된 roomId 세트
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // 좌석 데이터
  const {
    data: layoutData,
    isLoading: layoutLoading,
    mutate: layoutMutate,
  } = useSWR<{ sessions: StudySession[] }>(
    `/api/grade-admin/${grade}/seat-layouts?sessionType=${sessionType}`,
    fetcher
  );

  // 학생 목록
  const { data: studentData } = useSWR<{ students: Student[] }>(
    `/api/grade-admin/${grade}/students`,
    fetcher
  );

  const allStudents = useMemo(
    () => (studentData?.students ?? []).filter((s: Student & { isActive?: boolean }) => {
      if ((s as { isActive?: boolean }).isActive === false) return false;
      return participatesInSeatSession(s.participationDays, sessionType);
    }),
    [studentData, sessionType]
  );

  const sessions = layoutData?.sessions ?? [];
  const currentSession = sessions[0]; // 필터링 결과는 하나
  const rooms = currentSession?.rooms ?? [];

  // 데이터 로드 후 seats 상태 초기화
  useEffect(() => {
    if (!layoutData) return;
    const newSeats: AllSeats = new Map();

    for (const session of layoutData.sessions) {
      for (const room of session.rooms) {
        const roomMap: RoomSeats = new Map();
        // 전체 격자를 null로 초기화
        for (let r = 0; r < room.rows; r++) {
          for (let c = 0; c < room.cols; c++) {
            roomMap.set(`${r}-${c}`, { studentId: null, student: null });
          }
        }
        // 기존 배치 반영
        for (const layout of room.seatLayouts) {
          roomMap.set(`${layout.rowIndex}-${layout.colIndex}`, {
            studentId: layout.studentId,
            student: layout.student,
          });
        }
        newSeats.set(room.id, roomMap);
      }
    }

    setSeats(newSeats);
    setDirty(new Set());
  }, [layoutData]);

  // 배정된 학생 ID 세트
  const assignedStudentIds = useMemo(() => {
    const ids = new Set<number>();
    seats.forEach((roomMap) => {
      roomMap.forEach((cell) => {
        if (cell.studentId) ids.add(cell.studentId);
      });
    });
    return ids;
  }, [seats]);

  // 미배정 학생 목록
  const unassignedStudents = useMemo(
    () => allStudents.filter((s) => !assignedStudentIds.has(s.id)),
    [allStudents, assignedStudentIds]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    if (activeIdStr === overIdStr) return;

    // 드래그 소스 분석
    const activeSource = parseDragId(activeIdStr);
    const overTarget = parseDragId(overIdStr);

    if (!overTarget || overTarget.type !== "seat") return;

    setSeats((prev) => {
      const next = cloneSeats(prev);
      const targetRoomMap = next.get(overTarget.roomId);
      if (!targetRoomMap) return prev;

      const targetKey = `${overTarget.row}-${overTarget.col}`;
      const targetCell = targetRoomMap.get(targetKey);

      if (activeSource?.type === "student") {
        // 미배정 학생 → 좌석
        const student = allStudents.find((s) => s.id === activeSource.studentId);
        if (!student) return prev;

        // 대상 좌석에 이미 학생이 있으면 교환 불가 (미배정→좌석이므로 대상 좌석을 비움)
        targetRoomMap.set(targetKey, {
          studentId: student.id,
          student,
        });

        setDirty((d) => new Set(d).add(overTarget.roomId));
      } else if (activeSource?.type === "seat") {
        // 좌석 → 좌석 (교환)
        const sourceRoomMap = next.get(activeSource.roomId);
        if (!sourceRoomMap) return prev;

        const sourceKey = `${activeSource.row}-${activeSource.col}`;
        const sourceCell = sourceRoomMap.get(sourceKey);

        if (!sourceCell) return prev;

        // 교환
        const tempStudent = targetCell
          ? { studentId: targetCell.studentId, student: targetCell.student }
          : { studentId: null, student: null };

        targetRoomMap.set(targetKey, {
          studentId: sourceCell.studentId,
          student: sourceCell.student,
        });
        sourceRoomMap.set(sourceKey, {
          studentId: tempStudent.studentId,
          student: tempStudent.student,
        });

        const dirtySet = new Set(dirty);
        dirtySet.add(overTarget.roomId);
        dirtySet.add(activeSource.roomId);
        setDirty(dirtySet);
      }

      return next;
    });
  };

  // 좌석에서 학생 제거
  const handleRemoveStudent = useCallback((roomId: number, row: number, col: number) => {
    setSeats((prev) => {
      const next = cloneSeats(prev);
      const roomMap = next.get(roomId);
      if (!roomMap) return prev;
      roomMap.set(`${row}-${col}`, { studentId: null, student: null });
      return next;
    });
    setDirty((d) => new Set(d).add(roomId));
  }, []);

  // 저장
  const handleSave = async () => {
    if (dirty.size === 0) return;
    setSaving(true);

    try {
      const promises = Array.from(dirty).map((roomId) => {
        const roomMap = seats.get(roomId);
        if (!roomMap) return Promise.resolve();

        const layouts: { rowIndex: number; colIndex: number; studentId: number | null }[] = [];
        roomMap.forEach((cell, key) => {
          const [r, c] = key.split("-").map(Number);
          layouts.push({
            rowIndex: r,
            colIndex: c,
            studentId: cell.studentId,
          });
        });

        return fetch(`/api/grade-admin/${grade}/seat-layouts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, layouts }),
        });
      });

      await Promise.all(promises);
      setDirty(new Set());
      layoutMutate();
      alert("저장되었습니다.");
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    if (
      dirty.size > 0 &&
      !confirm("저장하지 않은 변경사항은 인쇄에 반영되지 않습니다. 계속할까요?")
    ) {
      return;
    }
    window.open(`/grade-admin/${grade}/seats/print?session=${sessionType}`, "_blank");
  };

  // 드래그 중인 아이템 정보
  const activeItem = useMemo(() => {
    if (!activeId) return null;
    const parsed = parseDragId(activeId);
    if (!parsed) return null;

    if (parsed.type === "student") {
      return allStudents.find((s) => s.id === parsed.studentId) ?? null;
    }

    if (parsed.type === "seat") {
      const roomMap = seats.get(parsed.roomId);
      if (!roomMap) return null;
      const cell = roomMap.get(`${parsed.row}-${parsed.col}`);
      return cell?.student ?? null;
    }

    return null;
  }, [activeId, allStudents, seats]);

  if (layoutLoading) {
    return <div className="text-center py-12 text-gray-500">불러오는 중...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="whitespace-nowrap text-xl font-bold text-gray-900">좌석 편집</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="min-h-11 whitespace-nowrap rounded-md border border-gray-300 px-4 text-sm text-gray-700 hover:bg-gray-50"
          >
            출력
          </button>
          <button
            onClick={handleSave}
            disabled={saving || dirty.size === 0}
            className="min-h-11 whitespace-nowrap px-4 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "저장 중..." : dirty.size > 0 ? `저장 (${dirty.size}개 교실 변경)` : "저장"}
          </button>
        </div>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-lg border">
          이 세션에 등록된 교실이 없습니다.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
            {/* 교실 격자 — min-w-0: 1fr 트랙의 auto 최소폭이 격자 min-content 를 따라 커져 xl 에서 문서가 가로로 넘치는 것을 막는다 */}
            <div className="min-w-0">
              {grade === 2 && sessionType === "night" ? (
                <MiraeHallLayout
                  rooms={rooms}
                  renderRoom={(room) => (
                    <RoomGrid
                      room={room}
                      seats={seats.get(room.id) ?? EMPTY_ROOM_SEATS}
                      onRemoveStudent={handleRemoveStudent}
                      gapAfterRows={GAP_CONFIG[room.name]}
                      hideTeacherDesk
                      compact
                    />
                  )}
                />
              ) : sessionType === "afternoon" ? (
                /* 오후 자습: 이름 접두사 기반 그룹 */
                <div className="space-y-6 overflow-x-auto">
                  {/* preserveSeatWidth: 폭이 부족하면 셀을 줄이지 않고 이 래퍼가 스크롤한다. 미래홀 도면은 자체 minWidth/스크롤이 있어 켜지 않는다. */}
                  {buildPrintGroups(rooms, "afternoon", grade).map((group, gi) => (
                    <div key={`${group.key}-${gi}`}>
                      <h3 className="whitespace-nowrap font-semibold text-gray-700 mb-2">{group.title}</h3>
                      <div
                        className="grid gap-3"
                        style={{
                          gridTemplateColumns: `repeat(${
                            group.kind === "divisions-column" ? 1 : group.rooms.length
                          }, 1fr)`,
                        }}
                      >
                        {group.rooms.map((room) => (
                          <RoomGrid
                            key={room.id}
                            room={room}
                            seats={seats.get(room.id) ?? EMPTY_ROOM_SEATS}
                            onRemoveStudent={handleRemoveStudent}
                            compact
                            preserveSeatWidth
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6 overflow-x-auto">
                  {rooms.map((room) => (
                    <RoomGrid
                      key={room.id}
                      room={room}
                      seats={seats.get(room.id) ?? EMPTY_ROOM_SEATS}
                      onRemoveStudent={handleRemoveStudent}
                    preserveSeatWidth
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 미배정 학생 목록 */}
            <div className="xl:sticky xl:top-6 xl:self-start">
              <UnassignedStudents students={unassignedStudents} />
            </div>
          </div>

          <DragOverlay>
            {activeItem ? (
              <div className="whitespace-nowrap bg-blue-100 border-2 border-blue-400 rounded px-2 py-1 text-xs font-medium shadow-lg">
                {activeItem.classNumber}반 {activeItem.studentNumber}번 {activeItem.name}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

// --- Utilities ---

type DragSource =
  | { type: "student"; studentId: number }
  | { type: "seat"; roomId: number; row: number; col: number };

function parseDragId(id: string): DragSource | null {
  if (id.startsWith("student-")) {
    const studentId = parseInt(id.replace("student-", ""), 10);
    return isNaN(studentId) ? null : { type: "student", studentId };
  }
  if (id.startsWith("seat-")) {
    // seat-{roomId}-{row}-{col}
    const parts = id.replace("seat-", "").split("-").map(Number);
    if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
      return { type: "seat", roomId: parts[0], row: parts[1], col: parts[2] };
    }
  }
  return null;
}

function cloneSeats(seats: AllSeats): AllSeats {
  const next: AllSeats = new Map();
  seats.forEach((roomMap, roomId) => {
    next.set(roomId, new Map(roomMap));
  });
  return next;
}
