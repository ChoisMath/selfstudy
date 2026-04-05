import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

// POST /api/attendance/toggle - 좌석 탭 시 출석 상태 순환
export const POST = withAuth(["teacher"], async (req: Request, user) => {
  const body = await req.json();
  const { studentId, sessionType, date, currentStatus } = body;

  // 순환: unchecked → present → absent → unchecked
  const nextStatus =
    currentStatus === "unchecked"
      ? "present"
      : currentStatus === "present"
        ? "absent"
        : "unchecked";

  const dateObj = new Date(date + "T00:00:00Z");

  if (nextStatus === "unchecked") {
    await prisma.attendance.deleteMany({
      where: { studentId, sessionType, date: dateObj },
    });
    return NextResponse.json({ status: "unchecked", id: null });
  }

  const attendance = await prisma.attendance.upsert({
    where: {
      studentId_sessionType_date: { studentId, sessionType, date: dateObj },
    },
    update: { status: nextStatus, checkedBy: user.userId },
    create: {
      studentId,
      sessionType,
      date: dateObj,
      status: nextStatus,
      checkedBy: user.userId,
    },
  });

  return NextResponse.json({ status: attendance.status, id: attendance.id });
});
