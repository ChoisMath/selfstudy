import { NextResponse } from "next/server";
import type { SessionType } from "@/generated/prisma/client";
import {
  approvePendingAbsenceRequestsForSupervisor,
  BulkAbsenceApprovalError,
} from "@/lib/absence-request-bulk-approval";
import { withAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const POST = withAuth(["teacher"], async (req: Request, user) => {
  try {
    const body = await req.json();
    const grade = Number(body.grade);
    const date = String(body.date ?? "");
    const sessionType = body.sessionType as SessionType;

    const result = await approvePendingAbsenceRequestsForSupervisor({
      prisma,
      teacherId: user.userId,
      grade,
      date,
      sessionType,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BulkAbsenceApprovalError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "일괄승인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
});
