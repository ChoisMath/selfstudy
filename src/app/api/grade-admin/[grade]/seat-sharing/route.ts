import { NextResponse } from "next/server";
import { withGradeAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// PUT: 오후 자율학습이 야간 자율학습 좌석 배치를 함께 쓸지 켜고 끈다.
// 오후 세션의 학급 교실·배정은 건드리지 않는다 — 끄면 그대로 돌아온다.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ grade: string }> }
) {
  const { grade: gradeStr } = await params;
  const grade = parseInt(gradeStr, 10);
  if (isNaN(grade) || grade < 1 || grade > 3) {
    return NextResponse.json({ error: "잘못된 학년입니다." }, { status: 400 });
  }

  return withGradeAuth(grade, async (req) => {
    const body: unknown = await req.json().catch(() => null);
    const sharesNightLayout =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>).sharesNightLayout
        : undefined;
    if (typeof sharesNightLayout !== "boolean") {
      return NextResponse.json({ error: "sharesNightLayout 은 true 또는 false 여야 합니다." }, { status: 400 });
    }

    const sessions = await prisma.studySession.findMany({
      where: { grade },
      select: { id: true, type: true },
    });
    const afternoon = sessions.find((session) => session.type === "afternoon");
    if (!afternoon) {
      return NextResponse.json({ error: "오후 자율학습 세션이 없습니다." }, { status: 404 });
    }
    if (sharesNightLayout && !sessions.some((session) => session.type === "night")) {
      return NextResponse.json({ error: "야간 자율학습 좌석 배치가 없습니다." }, { status: 409 });
    }

    await prisma.studySession.update({
      where: { id: afternoon.id },
      data: { sharesNightLayout },
    });

    return NextResponse.json({ sharesNightLayout });
  })(req);
}
