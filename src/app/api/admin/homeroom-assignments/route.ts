import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(["admin"], async () => {
  const assignments = await prisma.homeroomAssignment.findMany({
    include: { teacher: { select: { id: true, name: true, loginId: true } } },
    orderBy: [{ grade: "asc" }, { classNumber: "asc" }],
  });

  return NextResponse.json({ assignments });
});

export const POST = withAuth(["admin"], async (req: Request) => {
  const body = await req.json();
  const { teacherId, grade, classNumber } = body;

  if (!teacherId || !grade || !classNumber) {
    return NextResponse.json({ error: "교사, 학년, 반을 선택하세요." }, { status: 400 });
  }

  // 기존 배정 조회 (이전 교사 확인)
  const previous = await prisma.homeroomAssignment.findUnique({
    where: { grade_classNumber: { grade, classNumber } },
    select: { teacherId: true },
  });

  const assignment = await prisma.homeroomAssignment.upsert({
    where: { grade_classNumber: { grade, classNumber } },
    update: { teacherId },
    create: { teacherId, grade, classNumber },
    include: { teacher: { select: { id: true, name: true, loginId: true } } },
  });

  // 새 교사에게 "homeroom" 역할 자동 부여
  await prisma.teacherRole.upsert({
    where: { teacherId_role: { teacherId, role: "homeroom" } },
    update: {},
    create: { teacherId, role: "homeroom" },
  });

  // 이전 교사가 다르면: 남은 담임 배정 확인 → 0개면 역할 삭제
  if (previous && previous.teacherId !== teacherId) {
    const remaining = await prisma.homeroomAssignment.count({
      where: { teacherId: previous.teacherId },
    });
    if (remaining === 0) {
      await prisma.teacherRole.deleteMany({
        where: { teacherId: previous.teacherId, role: "homeroom" },
      });
    }
  }

  return NextResponse.json({ assignment });
});

export const DELETE = withAuth(["admin"], async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "");

  if (!id) {
    return NextResponse.json({ error: "ID가 필요합니다." }, { status: 400 });
  }

  // 삭제 전에 교사 ID 조회
  const assignment = await prisma.homeroomAssignment.findUnique({
    where: { id },
    select: { teacherId: true },
  });

  await prisma.homeroomAssignment.delete({ where: { id } });

  // 해당 교사의 남은 담임 배정 확인 → 0개면 역할 삭제
  if (assignment) {
    const remaining = await prisma.homeroomAssignment.count({
      where: { teacherId: assignment.teacherId },
    });
    if (remaining === 0) {
      await prisma.teacherRole.deleteMany({
        where: { teacherId: assignment.teacherId, role: "homeroom" },
      });
    }
  }

  return NextResponse.json({ success: true });
});
