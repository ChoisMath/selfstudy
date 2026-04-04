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

  const assignment = await prisma.homeroomAssignment.upsert({
    where: { grade_classNumber: { grade, classNumber } },
    update: { teacherId },
    create: { teacherId, grade, classNumber },
    include: { teacher: { select: { id: true, name: true, loginId: true } } },
  });

  return NextResponse.json({ assignment });
});

export const DELETE = withAuth(["admin"], async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "");

  if (!id) {
    return NextResponse.json({ error: "ID가 필요합니다." }, { status: 400 });
  }

  await prisma.homeroomAssignment.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
