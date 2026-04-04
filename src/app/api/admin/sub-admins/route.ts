import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(["admin"], async () => {
  const assignments = await prisma.subAdminAssignment.findMany({
    include: { teacher: { select: { id: true, name: true, loginId: true } } },
    orderBy: { grade: "asc" },
  });

  return NextResponse.json({ assignments });
});

export const POST = withAuth(["admin"], async (req: Request) => {
  const body = await req.json();
  const { teacherId, grade } = body;

  if (!teacherId || !grade) {
    return NextResponse.json({ error: "교사와 학년을 선택하세요." }, { status: 400 });
  }

  const assignment = await prisma.subAdminAssignment.upsert({
    where: { teacherId_grade: { teacherId, grade } },
    update: {},
    create: { teacherId, grade },
    include: { teacher: { select: { id: true, name: true, loginId: true } } },
  });

  return NextResponse.json({ assignment }, { status: 201 });
});

export const DELETE = withAuth(["admin"], async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "");

  if (!id) {
    return NextResponse.json({ error: "ID가 필요합니다." }, { status: 400 });
  }

  await prisma.subAdminAssignment.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
