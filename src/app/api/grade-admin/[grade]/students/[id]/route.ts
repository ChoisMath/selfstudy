import { NextResponse } from "next/server";
import { withGradeAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// PUT: 학생 수정
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
    const body = await req.json();
    const { name, classNumber, studentNumber, isActive } = body;

    // 학생 존재 확인
    const student = await prisma.student.findFirst({
      where: { id, grade },
    });

    if (!student) {
      return NextResponse.json(
        { error: "학생을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const updateData: {
      name?: string;
      classNumber?: number;
      studentNumber?: number;
      isActive?: boolean;
    } = {};

    if (name !== undefined) updateData.name = name.trim();
    if (classNumber !== undefined) updateData.classNumber = parseInt(classNumber, 10);
    if (studentNumber !== undefined) updateData.studentNumber = parseInt(studentNumber, 10);
    if (isActive !== undefined) updateData.isActive = isActive;

    // 반/번호 변경 시 중복 체크
    const newCn = updateData.classNumber ?? student.classNumber;
    const newSn = updateData.studentNumber ?? student.studentNumber;

    if (newCn !== student.classNumber || newSn !== student.studentNumber) {
      const existing = await prisma.student.findUnique({
        where: {
          grade_classNumber_studentNumber: {
            grade,
            classNumber: newCn,
            studentNumber: newSn,
          },
        },
      });

      if (existing && existing.id !== id) {
        return NextResponse.json(
          { error: "이미 등록된 학생입니다 (학년-반-번호 중복)." },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.student.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ student: updated });
  })(req);
}

// DELETE: 학생 소프트 삭제 (isActive = false)
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
    const student = await prisma.student.findFirst({
      where: { id, grade },
    });

    if (!student) {
      return NextResponse.json(
        { error: "학생을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const updated = await prisma.student.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ student: updated });
  })(req);
}
