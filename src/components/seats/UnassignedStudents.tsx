"use client";

import { useState, memo } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";

type Student = {
  id: number;
  name: string;
  grade: number;
  classNumber: number;
  studentNumber: number;
};

export const UNASSIGNED_DROP_ID = "unassigned";

function DraggableStudent({ student }: { student: Student }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `student-${student.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`
        flex min-h-11 items-center gap-2 px-2 py-1.5 bg-white border border-gray-200 rounded text-xs
        cursor-grab active:cursor-grabbing hover:border-blue-300 hover:bg-blue-50 transition-colors
        ${isDragging ? "opacity-40" : ""}
      `}
    >
      <span className="text-gray-400 min-w-[2.5rem]">
        {student.classNumber}-{student.studentNumber}
      </span>
      <span className="font-medium text-gray-800">{student.name}</span>
    </div>
  );
}

export default memo(function UnassignedStudents({
  students,
}: {
  students: Student[];
}) {
  const [search, setSearch] = useState("");
  // 좌석을 이 패널로 끌어오면 배정 해제. 패널 안의 학생 칩을 끌 때는 하이라이트하지 않는다.
  const { setNodeRef, isOver, active } = useDroppable({ id: UNASSIGNED_DROP_ID });
  const isSeatOver = isOver && String(active?.id).startsWith("seat-");

  const filtered = students.filter(
    (s) =>
      s.name.includes(search) ||
      `${s.classNumber}-${s.studentNumber}`.includes(search)
  );

  // 반별 그룹핑
  const grouped = filtered.reduce<Record<number, Student[]>>((acc, s) => {
    if (!acc[s.classNumber]) acc[s.classNumber] = [];
    acc[s.classNumber].push(s);
    return acc;
  }, {});

  const classNumbers = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border p-4 transition-colors ${
        isSeatOver ? "border-red-300 bg-red-50 ring-2 ring-red-200" : "bg-white"
      }`}
    >
      <h3 className="font-semibold text-gray-800 mb-1 whitespace-nowrap">
        미배정 학생{" "}
        <span className="text-sm font-normal text-gray-400">
          ({students.length}명)
        </span>
      </h3>
      <p
        className="text-[11px] text-gray-400 mb-2 whitespace-nowrap overflow-hidden text-ellipsis"
        title="좌석을 탭하거나 여기로 끌어오면 배정이 해제됩니다"
      >
        좌석을 탭하거나 여기로 끌어오면 배정이 해제됩니다
      </p>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="이름 또는 반-번호 검색"
        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs mb-3 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />

      <div className="max-h-[60dvh] overflow-y-auto space-y-3">
        {classNumbers.length === 0 ? (
          <div className="text-center py-4 text-gray-400 text-xs">
            {search ? "검색 결과 없음" : "모든 학생이 배정되었습니다"}
          </div>
        ) : (
          classNumbers.map((cn) => (
            <div key={cn}>
              <div className="text-[10px] font-medium text-gray-400 uppercase mb-1">
                {cn}반
              </div>
              <div className="space-y-2">
                {grouped[cn]
                  .sort((a, b) => a.studentNumber - b.studentNumber)
                  .map((student) => (
                    <DraggableStudent key={student.id} student={student} />
                  ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});
