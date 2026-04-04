import { NextResponse } from "next/server";
import { withGradeAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET: 학년별 학생 목록 조회
export async function GET(
  req: Request,
  { params }: { params: Promise<{ grade: string }> }
) {
  const { grade: gradeStr } = await params;
  const grade = parseInt(gradeStr, 10);

  if (isNaN(grade) || grade < 1 || grade > 3) {
    return NextResponse.json({ error: "잘못된 학년입니다." }, { status: 400 });
  }

  return withGradeAuth(grade, async (req, user) => {
    const { searchParams } = new URL(req.url);
    const classFilter = searchParams.get("class");

    const where: { grade: number; classNumber?: number } = { grade };
    if (classFilter) {
      const cn = parseInt(classFilter, 10);
      if (!isNaN(cn)) {
        where.classNumber = cn;
      }
    }

    const students = await prisma.student.findMany({
      where,
      orderBy: [{ classNumber: "asc" }, { studentNumber: "asc" }],
    });

    return NextResponse.json({ students });
  })(req);
}

// POST: 학생 등록
export async function POST(
  req: Request,
  { params }: { params: Promise<{ grade: string }> }
) {
  const { grade: gradeStr } = await params;
  const grade = parseInt(gradeStr, 10);

  if (isNaN(grade) || grade < 1 || grade > 3) {
    return NextResponse.json({ error: "잘못된 학년입니다." }, { status: 400 });
  }

  return withGradeAuth(grade, async (req, user) => {
    const body = await req.json();
    const { name, classNumber, studentNumber } = body;

    if (!name || !classNumber || !studentNumber) {
      return NextResponse.json(
        { error: "이름, 반, 번호는 필수 항목입니다." },
        { status: 400 }
      );
    }

    const cn = parseInt(classNumber, 10);
    const sn = parseInt(studentNumber, 10);

    if (isNaN(cn) || isNaN(sn) || cn < 1 || sn < 1) {
      return NextResponse.json(
        { error: "반과 번호는 1 이상의 숫자여야 합니다." },
        { status: 400 }
      );
    }

    // 중복 체크
    const existing = await prisma.student.findUnique({
      where: {
        grade_classNumber_studentNumber: {
          grade,
          classNumber: cn,
          studentNumber: sn,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "이미 등록된 학생입니다 (학년-반-번호 중복)." },
        { status: 409 }
      );
    }

    const student = await prisma.student.create({
      data: {
        name: name.trim(),
        grade,
        classNumber: cn,
        studentNumber: sn,
      },
    });

    return NextResponse.json({ student }, { status: 201 });
  })(req);
}
