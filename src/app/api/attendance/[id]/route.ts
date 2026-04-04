import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

// PUT /api/attendance/:id - 출석 상태 토글
export const PUT = withAuth(["supervisor", "admin"], async (req: Request, user) => {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  const idStr = segments[segments.length - 1];

  // id가 "toggle"인 경우: upsert 방식 토글
  if (idStr === "toggle") {
    return handleToggle(req, user);
  }

  const id = parseInt(idStr);
  const body = await req.json();
  const { status } = body;

  const attendance = await prisma.attendance.update({
    where: { id },
    data: { status, checkedBy: user.userId },
  });

  return NextResponse.json({ attendance });
});

async function handleToggle(req: Request, user: { userId: number }) {
  const body = await req.json();
  const { studentId, sessionType, date, currentStatus } = body;

  // 순환: unchecked → present → absent → unchecked
  const nextStatus =
    currentStatus === "unchecked" ? "present" : currentStatus === "present" ? "absent" : "unchecked";

  const dateObj = new Date(date + "T00:00:00Z");

  if (nextStatus === "unchecked") {
    // unchecked로 돌리면 레코드 삭제
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
}
