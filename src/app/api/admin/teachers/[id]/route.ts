import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import bcrypt from "bcryptjs";

export const PUT = withAuth(["admin"], async (req: Request, user) => {
  const url = new URL(req.url);
  const id = parseInt(url.pathname.split("/").pop()!);
  const body = await req.json();
  const { name, loginId, roles, password } = body;

  const updateData: Record<string, unknown> = {};
  if (name) updateData.name = name;
  if (loginId) updateData.loginId = loginId;
  if (password) updateData.passwordHash = await bcrypt.hash(password, 12);

  const teacher = await prisma.teacher.update({
    where: { id },
    data: updateData,
  });

  // 역할 업데이트 (전체 교체)
  if (roles) {
    await prisma.teacherRole.deleteMany({ where: { teacherId: id } });
    await prisma.teacherRole.createMany({
      data: roles.map((r: string) => ({ teacherId: id, role: r })),
    });
  }

  return NextResponse.json({ teacher: { ...teacher, passwordHash: undefined } });
});

export const DELETE = withAuth(["admin"], async (req: Request) => {
  const url = new URL(req.url);
  const id = parseInt(url.pathname.split("/").pop()!);

  await prisma.teacher.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
