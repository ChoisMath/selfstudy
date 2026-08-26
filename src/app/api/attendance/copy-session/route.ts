import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import { isSessionType, seatSessionOf } from "@/lib/sessions";
import { planSessionCopy } from "@/lib/attendance/copy-session";

const DAY_FIELDS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

// POST /api/attendance/copy-session
// Body: { grade, date: "YYYY-MM-DD", from: SessionType, to: SessionType }
export const POST = withAuth(["teacher"], async (req: Request, user) => {
  const body = await req.json();
  const { grade, date, from, to } = body;

  if (!Number.isInteger(grade) || grade < 1 || grade > 3) {
    return NextResponse.json({ error: "잘못된 학년입니다." }, { status: 400 });
  }
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date 는 YYYY-MM-DD 형식이어야 합니다." }, { status: 400 });
  }
  if (!isSessionType(from) || !isSessionType(to) || from === to || seatSessionOf(from) !== seatSessionOf(to)) {
    return NextResponse.json({ error: "같은 좌석 세션의 서로 다른 블록만 복사할 수 있습니다." }, { status: 400 });
  }

  const dateObj = new Date(`${date}T00:00:00Z`);
  const dayIndex = new Date(`${date}T12:00:00+09:00`).getDay();
  const todayField = DAY_FIELDS[dayIndex] as "mon" | "tue" | "wed" | "thu" | "fri" | undefined;

  const studySession = await prisma.studySession.findUnique({
    where: { type_grade: { type: seatSessionOf(from), grade } },
    include: { rooms: { select: { id: true } } },
  });
  if (!studySession) {
    return NextResponse.json({ copied: 0, skipped: 0 });
  }

  const seatLayouts = await prisma.seatLayout.findMany({
    where: { roomId: { in: studySession.rooms.map((r) => r.id) }, studentId: { not: null } },
    select: { studentId: true },
  });
  const seatedStudentIds = seatLayouts.map((s) => s.studentId as number);

  const [fromRows, toRows, toParticipation, toRequests] = await Promise.all([
    prisma.attendance.findMany({
      where: { date: dateObj, sessionType: from, studentId: { in: seatedStudentIds } },
      select: { studentId: true, status: true, absenceReason: { select: { id: true } } },
    }),
    prisma.attendance.findMany({
      where: { date: dateObj, sessionType: to, studentId: { in: seatedStudentIds } },
      select: { studentId: true },
    }),
    prisma.participationDay.findMany({
      where: { sessionType: to, studentId: { in: seatedStudentIds } },
    }),
    prisma.absenceRequest.findMany({
      where: { date: dateObj, sessionType: to, status: { in: ["pending", "approved"] }, studentId: { in: seatedStudentIds } },
      select: { studentId: true },
    }),
  ]);

  const participationBy = new Map(toParticipation.map((p) => [p.studentId, p]));
  const toParticipatingStudentIds = new Set(
    seatedStudentIds.filter((id) => {
      const p = participationBy.get(id);
      if (!p) return true; // 참여설정 없으면 기본 참여 (출석 API 와 동일 규칙)
      if (!p.isParticipating) return false;
      return todayField && todayField in p ? p[todayField] : true;
    })
  );

  const plan = planSessionCopy({
    seatedStudentIds,
    fromAttendance: new Map(fromRows.map((r) => [r.studentId, { status: r.status, hasReason: r.absenceReason !== null }])),
    toAttendanceStudentIds: new Set(toRows.map((r) => r.studentId)),
    toParticipatingStudentIds,
    toBlockedStudentIds: new Set(toRequests.map((r) => r.studentId)),
  });

  if (plan.toCreate.length > 0) {
    await prisma.attendance.createMany({
      data: plan.toCreate.map((c) => ({
        studentId: c.studentId,
        sessionType: to,
        date: dateObj,
        status: c.status,
        checkedBy: user.userId,
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ copied: plan.toCreate.length, skipped: plan.skipped });
});
