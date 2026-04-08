import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import type { SessionType, ReasonType } from "@/generated/prisma/client";

// GET /api/student/batch-absence
// 도우미 학생이 같은 반 학생들의 오늘 참여 정보를 조회
export const GET = withAuth(["student"], async (_req: Request, user) => {
  // 도우미 여부 확인
  const student = await prisma.student.findUnique({
    where: { id: user.userId },
    select: { isHelper: true, grade: true, classNumber: true },
  });
  if (!student?.isHelper) {
    return NextResponse.json(
      { error: "도우미 학생만 이용할 수 있습니다." },
      { status: 403 }
    );
  }

  // 오늘 KST 날짜 계산
  const kstNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })
  );
  const today = `${kstNow.getFullYear()}-${String(kstNow.getMonth() + 1).padStart(2, "0")}-${String(kstNow.getDate()).padStart(2, "0")}`;
  const todayDate = new Date(today + "T00:00:00Z");
  const dayIndex = new Date(today + "T12:00:00+09:00").getDay();
  const dayFields = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  const todayField = dayFields[dayIndex] as
    | "mon"
    | "tue"
    | "wed"
    | "thu"
    | "fri"
    | undefined;

  // 같은 학년+반의 활성 학생 목록 조회 (참여요일 포함)
  const classmates = await prisma.student.findMany({
    where: {
      grade: student.grade,
      classNumber: student.classNumber,
      isActive: true,
    },
    orderBy: [{ studentNumber: "asc" }],
    include: { participationDays: true },
  });

  // 오늘 해당 학생들의 기존 불참신청 조회
  const existingRequests = await prisma.absenceRequest.findMany({
    where: {
      date: todayDate,
      studentId: { in: classmates.map((s) => s.id) },
    },
    select: { studentId: true, sessionType: true, status: true },
  });

  // 학생별 기존 신청 맵 구성
  const requestMap = new Map<number, Record<string, string>>();
  for (const req of existingRequests) {
    const existing = requestMap.get(req.studentId) ?? {};
    existing[req.sessionType] = req.status;
    requestMap.set(req.studentId, existing);
  }

  // 학생별 오늘 참여 여부 계산 및 응답 구성
  const students = classmates.map((s) => {
    const afternoonDay = s.participationDays.find(
      (pd) => pd.sessionType === "afternoon"
    );
    const nightDay = s.participationDays.find(
      (pd) => pd.sessionType === "night"
    );

    const isAfternoon =
      !!afternoonDay &&
      afternoonDay.isParticipating &&
      !!todayField &&
      !!afternoonDay[todayField];

    const isNight =
      !!nightDay &&
      nightDay.isParticipating &&
      !!todayField &&
      !!nightDay[todayField];

    return {
      id: s.id,
      studentNumber: s.studentNumber,
      name: s.name,
      afternoon: isAfternoon,
      night: isNight,
      existingRequests: requestMap.get(s.id) ?? {},
    };
  });

  return NextResponse.json({ students, today });
});

// POST /api/student/batch-absence
// 도우미 학생이 같은 반 학생들의 불참신청을 일괄 등록
export const POST = withAuth(["student"], async (req: Request, user) => {
  // 도우미 여부 확인
  const student = await prisma.student.findUnique({
    where: { id: user.userId },
    select: { isHelper: true, grade: true, classNumber: true },
  });
  if (!student?.isHelper) {
    return NextResponse.json(
      { error: "도우미 학생만 이용할 수 있습니다." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { requests } = body as {
    requests: {
      studentId: number;
      sessionType: string;
      reasonType: string;
      detail?: string;
    }[];
  };

  // 유효성 검사
  if (!Array.isArray(requests) || requests.length === 0) {
    return NextResponse.json(
      { error: "requests 배열이 비어있습니다." },
      { status: 400 }
    );
  }

  const validSessionTypes = ["afternoon", "night"];
  const validReasonTypes = ["academy", "afterschool", "illness", "custom"];

  for (const r of requests) {
    if (!validSessionTypes.includes(r.sessionType)) {
      return NextResponse.json(
        { error: "세션은 afternoon 또는 night만 가능합니다." },
        { status: 400 }
      );
    }
    if (!validReasonTypes.includes(r.reasonType)) {
      return NextResponse.json(
        { error: "유효하지 않은 사유타입입니다." },
        { status: 400 }
      );
    }
  }

  // 대상 학생이 같은 학년+반인지 확인
  const targetStudentIds = [...new Set(requests.map((r) => r.studentId))];
  const targetStudents = await prisma.student.findMany({
    where: {
      id: { in: targetStudentIds },
      grade: student.grade,
      classNumber: student.classNumber,
      isActive: true,
    },
    select: { id: true },
  });

  const validStudentIdSet = new Set(targetStudents.map((s) => s.id));
  const validRequests = requests.filter((r) =>
    validStudentIdSet.has(r.studentId)
  );

  if (validRequests.length === 0) {
    return NextResponse.json(
      { error: "유효한 대상 학생이 없습니다." },
      { status: 400 }
    );
  }

  // 오늘 KST 날짜 계산
  const kstNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })
  );
  const today = `${kstNow.getFullYear()}-${String(kstNow.getMonth() + 1).padStart(2, "0")}-${String(kstNow.getDate()).padStart(2, "0")}`;
  const todayDate = new Date(today + "T00:00:00Z");

  // 일괄 생성 (중복 스킵)
  const result = await prisma.absenceRequest.createMany({
    data: validRequests.map((r) => ({
      studentId: r.studentId,
      sessionType: r.sessionType as SessionType,
      date: todayDate,
      reasonType: r.reasonType as ReasonType,
      detail: r.detail || null,
    })),
    skipDuplicates: true,
  });

  return NextResponse.json(
    {
      created: result.count,
      total: validRequests.length,
      skipped: validRequests.length - result.count,
    },
    { status: 201 }
  );
});
