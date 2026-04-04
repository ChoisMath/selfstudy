import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import bcrypt from "bcryptjs";

export const GET = withAuth(["admin"], async () => {
  const teachers = await prisma.teacher.findMany({
    include: {
      roles: true,
      homeroomAssignments: true,
      subAdminAssignments: true,
    },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({
    teachers: teachers.map((t) => ({
      id: t.id,
      loginId: t.loginId,
      name: t.name,
      googleId: t.googleId,
      roles: t.roles.map((r) => r.role),
      homeroomAssignments: t.homeroomAssignments,
      subAdminGrades: t.subAdminAssignments.map((s) => s.grade),
      createdAt: t.createdAt,
    })),
  });
});

export const POST = withAuth(["admin"], async (req: Request) => {
  const body = await req.json();
  const { loginId, name, password, roles } = body;

  if (!loginId || !name || !password) {
    return NextResponse.json({ error: "필수 항목을 입력하세요." }, { status: 400 });
  }

  const existing = await prisma.teacher.findUnique({ where: { loginId } });
  if (existing) {
    return NextResponse.json({ error: "이미 사용 중인 ID입니다." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const teacher = await prisma.teacher.create({
    data: {
      loginId,
      name,
      passwordHash,
      roles: {
        create: (roles || []).map((r: string) => ({ role: r })),
      },
    },
    include: { roles: true },
  });

  return NextResponse.json({ teacher: { ...teacher, passwordHash: undefined } }, { status: 201 });
});
