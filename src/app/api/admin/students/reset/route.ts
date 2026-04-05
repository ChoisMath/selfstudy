import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

// POST /api/admin/students/reset - 학생 및 관련 데이터 전체 초기화
export const POST = withAuth(["admin"], async () => {
  try {
    // FK 순서에 맞게 학생 관련 테이블 모두 삭제
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        absence_reasons,
        attendance,
        absence_requests,
        participation_days,
        seat_layouts,
        students
      CASCADE
    `);

    return NextResponse.json({
      success: true,
      message: "학생 정보 및 관련 데이터가 초기화되었습니다.",
    });
  } catch (error) {
    console.error("Student reset error:", error);
    return NextResponse.json(
      { error: "학생 초기화에 실패했습니다." },
      { status: 500 }
    );
  }
});
