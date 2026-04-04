import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import bcrypt from "bcryptjs";

// POST /api/auth/change-password - 비밀번호 변경
export const POST = withAuth(
  ["admin", "homeroom", "supervisor"],
  async (req: Request, user) => {
    if (user.userType !== "teacher") {
      return NextResponse.json(
        { error: "교사만 비밀번호를 변경할 수 있습니다." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "현재 비밀번호와 새 비밀번호를 입력하세요." },
        { status: 400 }
      );
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: "새 비밀번호는 4자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: user.userId },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "교사 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const valid = await bcrypt.compare(currentPassword, teacher.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "현재 비밀번호가 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await prisma.teacher.update({
      where: { id: user.userId },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ success: true, message: "비밀번호가 변경되었습니다." });
  }
);
