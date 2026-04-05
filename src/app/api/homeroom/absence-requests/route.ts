import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

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

  // 학생 ID 조회 (admin은 전체)
  const students = await prisma.student.findMany({
    where: {
      isActive: true,
      ...(classConditions ? { OR: classConditions } : {}),
    },
    select: { id: true },
  });
  const studentIds = students.map((s) => s.id);

  const whereCondition: Record<string, unknown> = {
    studentId: { in: studentIds },
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
