import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import type { SessionType, ReasonType } from "@/generated/prisma/client";

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
export const POST = withAuth(["student"], async (req: Request, user) => {
  const studentId = user.userId;
  const body = await req.json();
  const { date, sessionType, reasonType, detail } = body as {
    date: string;
    sessionType: SessionType;
    reasonType: ReasonType;
    detail?: string;
  };

  if (!date || !sessionType || !reasonType) {
    return NextResponse.json(
      { error: "날짜, 세션, 사유타입은 필수입니다." },
      { status: 400 }
    );
  }

  // 유효한 enum 값 검사
  if (!["afternoon", "night"].includes(sessionType)) {
    return NextResponse.json(
      { error: "세션은 afternoon 또는 night만 가능합니다." },
      { status: 400 }
    );
  }

  if (!["academy", "afterschool", "illness", "custom"].includes(reasonType)) {
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

  // 중복 신청 검사
  const existing = await prisma.absenceRequest.findUnique({
    where: {
      studentId_sessionType_date: {
        studentId,
        sessionType,
        date: dateObj,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "이미 해당 날짜/세션에 불참 신청이 있습니다." },
      { status: 409 }
    );
  }

  const request = await prisma.absenceRequest.create({
    data: {
      studentId,
      sessionType,
      date: dateObj,
      reasonType,
      detail: detail || null,
    },
  });

  return NextResponse.json(
    {
      request: {
        id: request.id,
        date: request.date.toISOString().split("T")[0],
        sessionType: request.sessionType,
        reasonType: request.reasonType,
        detail: request.detail,
        status: request.status,
        createdAt: request.createdAt.toISOString(),
      },
    },
    { status: 201 }
  );
});
