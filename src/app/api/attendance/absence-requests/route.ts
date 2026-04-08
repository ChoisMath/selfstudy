import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

// GET /api/attendance/absence-requests?grade=1&status=pending
export const GET = withAuth(["teacher"], async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const grade = searchParams.get("grade");
  const statusFilter = searchParams.get("status");

  if (!grade) {
    return NextResponse.json({ error: "grade 파라미터가 필요합니다." }, { status: 400 });
  }

  const gradeNum = parseInt(grade);
  if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 3) {
    return NextResponse.json({ error: "유효하지 않은 학년입니다." }, { status: 400 });
  }

  const whereCondition: Record<string, unknown> = {
    student: {
      isActive: true,
      grade: gradeNum,
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
