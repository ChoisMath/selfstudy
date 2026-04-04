import { NextResponse } from "next/server";
import { withGradeAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// PUT: 좌석 배치 기간 수정
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ grade: string; id: string }> }
) {
  const { grade: gradeStr, id: idStr } = await params;
  const grade = parseInt(gradeStr, 10);
  const id = parseInt(idStr, 10);

  if (isNaN(grade) || isNaN(id)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  return withGradeAuth(grade, async (req, user) => {
    const period = await prisma.seatingPeriod.findFirst({
      where: { id, grade },
    });

    if (!period) {
      return NextResponse.json(
        { error: "배치 기간을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, startDate, endDate, isActive } = body;

    const updateData: {
      name?: string;
      startDate?: Date;
      endDate?: Date;
      isActive?: boolean;
    } = {};

    if (name !== undefined) updateData.name = name.trim();
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (isActive !== undefined) updateData.isActive = isActive;

    // 날짜 유효성 검사
    const newStart = updateData.startDate ?? period.startDate;
    const newEnd = updateData.endDate ?? period.endDate;
    if (newStart > newEnd) {
      return NextResponse.json(
        { error: "시작일이 종료일보다 늦을 수 없습니다." },
        { status: 400 }
      );
    }

    const updated = await prisma.seatingPeriod.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ period: updated });
  })(req);
}

// DELETE: 좌석 배치 기간 삭제
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ grade: string; id: string }> }
) {
  const { grade: gradeStr, id: idStr } = await params;
  const grade = parseInt(gradeStr, 10);
  const id = parseInt(idStr, 10);

  if (isNaN(grade) || isNaN(id)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  return withGradeAuth(grade, async (req, user) => {
    const period = await prisma.seatingPeriod.findFirst({
      where: { id, grade },
    });

    if (!period) {
      return NextResponse.json(
        { error: "배치 기간을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 연관된 좌석 레이아웃도 함께 삭제
    await prisma.seatLayout.deleteMany({
      where: { periodId: id },
    });

    await prisma.seatingPeriod.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  })(req);
}
