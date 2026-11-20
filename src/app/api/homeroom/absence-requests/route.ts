import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import { isReasonType } from "@/lib/absence-reasons";
import { isSessionType, type SessionType } from "@/lib/sessions";

// GET /api/homeroom/absence-requests - 자기 반 불참 신청 목록
export const GET = withAuth(["homeroom", "admin"], async (req: Request, user) => {
  const isAdmin = user.roles?.includes("admin");
  const assignments = user.homeroomAssignments;
  if (!isAdmin && (!assignments || assignments.length === 0)) {
    return NextResponse.json({ error: "담임 배정이 없습니다." }, { status: 403 });
  }

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status"); // pending, approved, rejected

  // admin은 전체, 담임은 자기 반만
  const classConditions = isAdmin && (!assignments || assignments.length === 0)
    ? undefined
    : assignments!.map((a) => ({
        grade: a.grade,
        classNumber: a.classNumber,
      }));

  // Prisma 관계 필터로 1회 쿼리로 통합
  const whereCondition: Record<string, unknown> = {
    student: {
      isActive: true,
      ...(classConditions ? { OR: classConditions } : {}),
    },
  };

  if (statusFilter && ["pending", "approved", "rejected"].includes(statusFilter)) {
    whereCondition.status = statusFilter;
  }

  const requests = await prisma.absenceRequest.findMany({
    where: whereCondition,
    include: {
      student: {
        select: {
          id: true,
          name: true,
          grade: true,
          classNumber: true,
          studentNumber: true,
        },
      },
      reviewer: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = requests.map((r) => ({
    id: r.id,
    student: r.student,
    sessionType: r.sessionType,
    date: r.date.toISOString().split("T")[0],
    reasonType: r.reasonType,
    detail: r.detail,
    status: r.status,
    reviewer: r.reviewer,
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({ requests: result });
});

// POST /api/homeroom/absence-requests - 담임이 학생 대신 불참 신청을 승인 상태로 등록
// Body: { studentId, date, sessionTypes: SessionType[], reasonType, detail? } — 블록마다 신청 1건
// 같은 학생·날짜·블록에 대기·반려 건이 있으면 새 사유로 덮어쓰고 승인한다. 이미 승인된 건은 건드리지 않는다.
export const POST = withAuth(["homeroom", "admin"], async (req: Request, user) => {
  const isAdmin = user.roles?.includes("admin");
  const assignments = user.homeroomAssignments ?? [];
  if (!isAdmin && assignments.length === 0) {
    return NextResponse.json({ error: "담임 배정이 없습니다." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const studentId = body?.studentId;
  const date = body?.date;
  const sessionTypes = body?.sessionTypes;
  const reasonType = body?.reasonType;
  const detail = typeof body?.detail === "string" && body.detail.trim() !== "" ? body.detail.trim() : null;

  if (typeof studentId !== "number" || !Number.isInteger(studentId)) {
    return NextResponse.json({ error: "학생을 선택하세요." }, { status: 400 });
  }
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "날짜는 YYYY-MM-DD 형식이어야 합니다." }, { status: 400 });
  }
  if (!Array.isArray(sessionTypes) || sessionTypes.length === 0) {
    return NextResponse.json({ error: "자습 시간을 하나 이상 선택하세요." }, { status: 400 });
  }
  const uniqueSessionTypes: SessionType[] = [];
  for (const value of sessionTypes) {
    if (!isSessionType(value)) {
      return NextResponse.json({ error: "유효하지 않은 자습 시간입니다." }, { status: 400 });
    }
    if (!uniqueSessionTypes.includes(value)) uniqueSessionTypes.push(value);
  }
  if (!isReasonType(reasonType)) {
    return NextResponse.json({ error: "올바른 사유 유형을 선택하세요." }, { status: 400 });
  }
  if (detail && detail.length > 500) {
    return NextResponse.json({ error: "상세 사유는 500자까지 입력할 수 있습니다." }, { status: 400 });
  }

  // 담임은 자기 반 학생만, 담임 배정이 없는 관리자는 모든 학생
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      isActive: true,
      ...(assignments.length > 0
        ? { OR: assignments.map((a) => ({ grade: a.grade, classNumber: a.classNumber })) }
        : {}),
    },
    select: { id: true },
  });
  if (!student) {
    return NextResponse.json({ error: "자기 반 학생을 찾을 수 없습니다." }, { status: 404 });
  }

  const targetDate = new Date(`${date}T00:00:00.000Z`);
  const counts = { created: 0, updated: 0, skipped: 0 };

  await prisma.$transaction(async (tx) => {
    for (const sessionType of uniqueSessionTypes) {
      const key = { studentId_sessionType_date: { studentId, sessionType, date: targetDate } };
      const existing = await tx.absenceRequest.findUnique({ where: key, select: { status: true } });
      if (existing?.status === "approved") {
        counts.skipped += 1;
        continue;
      }

      const approval = { reasonType, detail, status: "approved" as const, reviewedBy: user.userId, reviewedAt: new Date() };
      await tx.absenceRequest.upsert({
        where: key,
        update: approval,
        create: { studentId, sessionType, date: targetDate, ...approval },
      });
      if (existing) counts.updated += 1;
      else counts.created += 1;

      // 승인과 같은 처리: 그 블록을 결석으로 기록하고 사유를 남긴다 ([id] PUT 의 승인 트랜잭션과 같은 규칙)
      const attendance = await tx.attendance.upsert({
        where: key,
        update: { status: "absent", checkedBy: user.userId },
        create: { studentId, sessionType, date: targetDate, status: "absent", checkedBy: user.userId },
      });
      await tx.absenceReason.upsert({
        where: { attendanceId: attendance.id },
        update: { reasonType, detail, registeredBy: user.userId },
        create: { attendanceId: attendance.id, reasonType, detail, registeredBy: user.userId },
      });
    }
  });

  return NextResponse.json(counts, { status: 201 });
});
