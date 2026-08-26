import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import type { ReasonType } from "@/generated/prisma/client";
import { isSessionType, type SessionType } from "@/lib/sessions";
import { REASON_TYPES } from "@/lib/absence-reasons";

// GET /api/student/absence-requests
export const GET = withAuth(["student"], async (_req: Request, user) => {
  const studentId = user.userId;

  const requests = await prisma.absenceRequest.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    requests: requests.map((r) => ({
      id: r.id,
      date: r.date.toISOString().split("T")[0],
      sessionType: r.sessionType,
      reasonType: r.reasonType,
      detail: r.detail,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

// POST /api/student/absence-requests
// Body: { date, sessionTypes: SessionType[], reasonType, detail? } — 블록마다 신청 1건
export const POST = withAuth(["student"], async (req: Request, user) => {
  const studentId = user.userId;
  const body = await req.json();
  const { date, sessionTypes, reasonType, detail } = body as {
    date: string;
    sessionTypes: unknown;
    reasonType: ReasonType;
    detail?: string;
  };

  if (!date || !Array.isArray(sessionTypes) || sessionTypes.length === 0 || !reasonType) {
    return NextResponse.json(
      { error: "날짜, 자습 시간, 사유타입은 필수입니다." },
      { status: 400 }
    );
  }

  const uniqueSessionTypes: SessionType[] = [];
  for (const value of sessionTypes) {
    if (!isSessionType(value)) {
      return NextResponse.json({ error: "유효하지 않은 자습 시간입니다." }, { status: 400 });
    }
    if (!uniqueSessionTypes.includes(value)) uniqueSessionTypes.push(value);
  }

  if (!(REASON_TYPES as readonly string[]).includes(reasonType)) {
    return NextResponse.json(
      { error: "유효하지 않은 사유타입입니다." },
      { status: 400 }
    );
  }

  const dateObj = new Date(date + "T00:00:00Z");

  // 과거 날짜 검사
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (dateObj < today) {
    return NextResponse.json(
      { error: "과거 날짜에는 불참 신청을 할 수 없습니다." },
      { status: 400 }
    );
  }

  const result = await prisma.absenceRequest.createMany({
    data: uniqueSessionTypes.map((sessionType) => ({
      studentId,
      sessionType,
      date: dateObj,
      reasonType,
      detail: detail || null,
    })),
    skipDuplicates: true,
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "이미 해당 날짜/시간에 불참 신청이 있습니다." },
      { status: 409 }
    );
  }

  return NextResponse.json(
    { created: result.count, skipped: uniqueSessionTypes.length - result.count },
    { status: 201 }
  );
});
