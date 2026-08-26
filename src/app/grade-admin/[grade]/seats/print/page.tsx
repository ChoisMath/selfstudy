"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";
import PrintPageFitter from "@/components/seats/PrintPageFitter";
import type { PrintRoomSeats } from "@/components/seats/PrintRoomGrid";
import SeatPrintGroup from "@/components/seats/SeatPrintGroup";
import { buildPrintGroups, type PrintBaseRoom } from "@/lib/seats/print-groups";
import type { Orientation } from "@/lib/seats/print-layout";
import { SEAT_SESSION_META, type SeatSessionType } from "@/lib/sessions";
import "./print.css";

type SeatStudent = {
  id: number;
  name: string;
  classNumber: number;
  studentNumber: number;
};

type SeatLayoutItem = {
  rowIndex: number;
  colIndex: number;
  studentId: number | null;
  student: SeatStudent | null;
};

type ApiRoom = PrintBaseRoom & { seatLayouts: SeatLayoutItem[] };
type ApiSession = { id: number; type: SeatSessionType; rooms: ApiRoom[] };

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function orientationStorageKey(grade: number, sessionType: string) {
  return `seatPrintOrientation:${grade}:${sessionType}`;
}

function readStoredOrientations(key: string): Record<string, Orientation> {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const result: Record<string, Orientation> = {};
    for (const [groupKey, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (value === "landscape" || value === "portrait") result[groupKey] = value;
    }
    return result;
  } catch {
    return {};
  }
}

function SeatPrintView() {
  const params = useParams();
  const searchParams = useSearchParams();
  const grade = Number(params.grade);
  const sessionType: SeatSessionType =
    searchParams.get("session") === "night" ? "night" : "afternoon";

  const { data, isLoading } = useSWR<{ sessions: ApiSession[] }>(
    `/api/grade-admin/${grade}/seat-layouts?sessionType=${sessionType}`,
    fetcher
  );

  const rooms = useMemo<ApiRoom[]>(() => data?.sessions?.[0]?.rooms ?? [], [data]);
  const groups = useMemo(
    () => buildPrintGroups(rooms, sessionType, grade),
    [rooms, sessionType, grade]
  );

  const seatsByRoom = useMemo(() => {
    const map = new Map<number, PrintRoomSeats>();
    for (const room of rooms) {
      const roomSeats: PrintRoomSeats = new Map();
      for (const layout of room.seatLayouts) {
        roomSeats.set(`${layout.rowIndex}-${layout.colIndex}`, {
          studentId: layout.studentId,
          student: layout.student,
        });
      }
      map.set(room.id, roomSeats);
    }
    return map;
  }, [rooms]);

  const [stored, setStored] = useState<Record<string, Orientation>>({});
  const [suggested, setSuggested] = useState<Record<string, Orientation>>({});
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setStored(readStoredOrientations(orientationStorageKey(grade, sessionType)));
  }, [grade, sessionType]);

  useEffect(() => {
    document.documentElement.classList.add("seat-print-mode");
    document.body.classList.add("seat-print-mode");
    return () => {
      document.documentElement.classList.remove("seat-print-mode");
      document.body.classList.remove("seat-print-mode");
    };
  }, []);

  useEffect(() => {
    const sessionLabel = SEAT_SESSION_META[sessionType].label;
    document.title = `${grade}학년 ${sessionLabel} 좌석배치`;
  }, [grade, sessionType]);

  const orientationOf = useCallback(
    (groupKey: string): Orientation => stored[groupKey] ?? suggested[groupKey] ?? "portrait",
    [stored, suggested]
  );

  const handleMeasure = useCallback((groupKey: string, next: Orientation) => {
    setSuggested((prev) => (prev[groupKey] === next ? prev : { ...prev, [groupKey]: next }));
  }, []);

  const setOrientation = (groupKey: string, next: Orientation) => {
    const updated = { ...stored, [groupKey]: next };
    setStored(updated);
    try {
      window.localStorage.setItem(
        orientationStorageKey(grade, sessionType),
        JSON.stringify(updated)
      );
    } catch {
      // 저장 실패(프라이빗 모드 등)는 이번 세션 선택만 유지하면 충분하다
    }
  };

  const toggleExcluded = (groupKey: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const visibleGroups = groups.filter((group) => !excluded.has(group.key));

  if (isLoading) {
    return <div className="py-12 text-center text-gray-500">불러오는 중...</div>;
  }

  if (groups.length === 0) {
    return <div className="py-12 text-center text-gray-400">인쇄할 좌석 배치가 없습니다.</div>;
  }

  return (
    <div>
      <div className="no-print sticky top-14 z-40 mb-4 rounded-lg border bg-white p-2">
        <div className="flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-3">
            {groups.map((group) => {
              const orientation = orientationOf(group.key);
              return (
                <div
                  key={group.key}
                  className="flex min-h-11 items-center gap-1 whitespace-nowrap rounded border px-2 py-1"
                >
                  <label className="flex min-h-11 items-center gap-1 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={!excluded.has(group.key)}
                      onChange={() => toggleExcluded(group.key)}
                    />
                    {group.title}
                  </label>
                  <div className="ml-1 flex overflow-hidden rounded border">
                    <button
                      type="button"
                      onClick={() => setOrientation(group.key, "landscape")}
                      className={`min-h-11 min-w-11 px-2 text-xs whitespace-nowrap ${
                        orientation === "landscape" ? "bg-blue-600 text-white" : "bg-white text-gray-600"
                      }`}
                    >
                      가로
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrientation(group.key, "portrait")}
                      className={`min-h-11 min-w-11 px-2 text-xs whitespace-nowrap ${
                        orientation === "portrait" ? "bg-blue-600 text-white" : "bg-white text-gray-600"
                      }`}
                    >
                      세로
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              disabled={visibleGroups.length === 0}
              className="min-h-11 whitespace-nowrap rounded-md bg-blue-600 px-4 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              인쇄
            </button>
            <button
              type="button"
              onClick={() => window.close()}
              className="min-h-11 whitespace-nowrap rounded-md border px-4 text-sm text-gray-700"
            >
              닫기
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-400 whitespace-nowrap">
          가로·세로 혼합 인쇄는 Chrome·Edge에서 정확히 동작합니다.
        </p>
      </div>

      {/* flex 컨테이너 안에서는 인쇄 페이지 분할이 무시될 수 있어 블록 레이아웃을 쓴다 */}
      <div className="seat-print-pages">
        {visibleGroups.map((group, index) => (
          <PrintPageFitter
            key={`${group.key}-${index}`}
            orientation={orientationOf(group.key)}
            onMeasure={(next) => handleMeasure(group.key, next)}
          >
            <SeatPrintGroup
              group={group}
              grade={grade}
              sessionType={sessionType}
              seatsByRoom={seatsByRoom}
            />
          </PrintPageFitter>
        ))}
      </div>
    </div>
  );
}

export default function SeatPrintPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-gray-500">불러오는 중...</div>}>
      <SeatPrintView />
    </Suspense>
  );
}
