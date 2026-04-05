import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import bcrypt from "bcryptjs";

export const PUT = withAuth(["admin"], async (req: Request, user) => {
  try {
    const url = new URL(req.url);
    const id = parseInt(url.pathname.split("/").pop()!, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }
    const body = await req.json();
    const { name, loginId, roles, password, primaryGrade } = body;

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (loginId) updateData.loginId = loginId;
    if (password) updateData.passwordHash = await bcrypt.hash(password, 12);
    if (primaryGrade !== undefined) {
      updateData.primaryGrade = (primaryGrade === "" || primaryGrade === null)
        ? null
        : Number(primaryGrade);
    }

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
  } catch (error) {
    console.error("Teacher update error:", error);
    return NextResponse.json({ error: "교사 정보 수정에 실패했습니다." }, { status: 500 });
  }
});

export const DELETE = withAuth(["admin"], async (req: Request) => {
  try {
    const url = new URL(req.url);
    const id = parseInt(url.pathname.split("/").pop()!, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }

    const teacher = await prisma.teacher.findUnique({ where: { id } });
    if (!teacher) {
      return NextResponse.json({ error: "교사를 찾을 수 없습니다." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. 감독교체이력 삭제 (SupervisorAssignment, Teacher 삭제 전에 먼저)
      await tx.supervisorSwapHistory.deleteMany({
        where: {
          OR: [
            { originalTeacherId: id },
            { replacementTeacherId: id },
            { assignment: { teacherId: id } },
          ],
        },
      });

      // 2. 교사 소유 배정 데이터 삭제
      await tx.teacherRole.deleteMany({ where: { teacherId: id } });
      await tx.homeroomAssignment.deleteMany({ where: { teacherId: id } });
      await tx.subAdminAssignment.deleteMany({ where: { teacherId: id } });
      await tx.supervisorAssignment.deleteMany({ where: { teacherId: id } });

      // 3. 학생 소유 데이터 처리
      await tx.attendance.updateMany({
        where: { checkedBy: id },
        data: { checkedBy: null },
      });
      await tx.absenceReason.deleteMany({
        where: { registeredBy: id },
      });
      await tx.absenceRequest.updateMany({
        where: { reviewedBy: id },
        data: { reviewedBy: null },
      });

      // 4. 교사 삭제
      await tx.teacher.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Teacher delete error:", error);
    return NextResponse.json({ error: "교사 삭제에 실패했습니다." }, { status: 500 });
  }
});
