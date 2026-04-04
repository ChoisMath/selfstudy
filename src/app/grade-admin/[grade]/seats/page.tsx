"use client";

import { useParams } from "next/navigation";
import SeatingManagement from "@/components/seats/SeatingManagement";

export default function GradeAdminSeatsPage() {
  const params = useParams();
  const grade = parseInt(params.grade as string);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{grade}학년 좌석 배치</h1>
      <SeatingManagement grade={grade} />
    </div>
  );
}
