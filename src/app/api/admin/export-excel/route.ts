import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import ExcelJS from "exceljs";

// GET /api/admin/export-excel?from=2026-04-01&to=2026-04-05&grade=2
export const GET = withAuth(["admin"], async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const grade = searchParams.get("grade");

  if (!from || !to || !grade) {
    return NextResponse.json({ error: "from, to, grade 파라미터가 필요합니다." }, { status: 400 });
  }

  const gradeNum = parseInt(grade);
  const fromDate = new Date(from + "T00:00:00Z");
  const toDate = new Date(to + "T00:00:00Z");

  const students = await prisma.student.findMany({
    where: { grade: gradeNum, isActive: true },
    orderBy: [{ classNumber: "asc" }, { studentNumber: "asc" }],
  });

  const attendances = await prisma.attendance.findMany({
    where: {
      studentId: { in: students.map((s) => s.id) },
      date: { gte: fromDate, lte: toDate },
    },
    include: { absenceReason: true },
  });

  // 날짜 범위 (평일만)
  const dates: string[] = [];
  const d = new Date(fromDate);
  while (d <= toDate) {
    if (d.getDay() >= 1 && d.getDay() <= 5) {
      dates.push(d.toISOString().split("T")[0]);
    }
    d.setDate(d.getDate() + 1);
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(`${gradeNum}학년 출결`);

  // 헤더: 이름, 반, 번호, 날짜별(오후/야간)
  const headerRow1 = ["이름", "반", "번호"];
  const headerRow2 = ["", "", ""];
  for (const date of dates) {
    const dayName = ["일", "월", "화", "수", "목", "금", "토"][new Date(date).getDay()];
    headerRow1.push(`${date.slice(5)} (${dayName})`, "");
    headerRow2.push("오후", "야간");
  }

  sheet.addRow(headerRow1);
  sheet.addRow(headerRow2);

  // 데이터 행
  for (const student of students) {
    const row: string[] = [student.name, String(student.classNumber), String(student.studentNumber)];

    for (const date of dates) {
      const afternoon = attendances.find(
        (a) => a.studentId === student.id && a.date.toISOString().split("T")[0] === date && a.sessionType === "afternoon"
      );
      const night = attendances.find(
        (a) => a.studentId === student.id && a.date.toISOString().split("T")[0] === date && a.sessionType === "night"
      );

      const statusSymbol = (a: typeof afternoon) => {
        if (!a) return "-";
        if (a.status === "present") return "O";
        if (a.status === "absent") {
          const reason = a.absenceReason?.reasonType;
          if (reason) return `X(${reason})`;
          return "X";
        }
        return "-";
      };

      row.push(statusSymbol(afternoon), statusSymbol(night));
    }

    sheet.addRow(row);
  }

  // 열 너비 조정
  sheet.getColumn(1).width = 10;
  sheet.getColumn(2).width = 5;
  sheet.getColumn(3).width = 5;

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${gradeNum}학년_출결_${from}_${to}.xlsx"`,
    },
  });
});
