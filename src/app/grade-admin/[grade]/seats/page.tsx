"use client";

import { useParams } from "next/navigation";
import SeatSessionPanel from "@/components/seats/SeatSessionPanel";

export default function GradeAdminSeatsPage() {
  const params = useParams();
  const grade = Number(params.grade);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink">좌석 배치</h1>
      <SeatSessionPanel grade={grade} tabsClassName="mb-6" />
    </div>
  );
}
