import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import { buildSupervisorWorkbook } from "@/lib/excel/supervisor-export";

export const GET = withAuth(["admin"], async (req, _user) => {
  const url = new URL(req.url);
  const monthStr = url.searchParams.get("month");

  let year: number, monthIdx: number;
  if (monthStr) {
    const parts = monthStr.split("-").map(Number);
    if (
      parts.length !== 2 ||
      isNaN(parts[0]) ||
      isNaN(parts[1]) ||
      parts[1] < 1 ||
      parts[1] > 12
    ) {
      return NextResponse.json(
        { error: "잘못된 월 형식입니다. (YYYY-MM)" },
        { status: 400 }
      );
    }
    [year, monthIdx] = [parts[0], parts[1] - 1];
  } else {
    const now = new Date();
    year = now.getFullYear();
    monthIdx = now.getMonth();
  }

  // Month range
  const monthStart = new Date(year, monthIdx, 1);
  const monthEnd = new Date(year, monthIdx + 1, 0);
  monthStart.setHours(0, 0, 0, 0);
  monthEnd.setHours(23, 59, 59, 999);

  // School year range
  const actualMonth = monthIdx + 1; // 1-based
  let syStart: Date, syEnd: Date;
  if (actualMonth >= 3) {
    syStart = new Date(year, 2, 1); // March 1
    syEnd = new Date(year + 1, 1, 28); // Feb 28 next year
  } else {
    syStart = new Date(year - 1, 2, 1);
    syEnd = new Date(year, 1, 28);
  }
  syStart.setHours(0, 0, 0, 0);
  syEnd.setHours(23, 59, 59, 999);

  try {
    const [assignmentsInMonth, assignmentsInSchoolYear, teachers] =
      await Promise.all([
        prisma.supervisorAssignment.findMany({
          where: {
            sessionType: "afternoon",
            date: { gte: monthStart, lte: monthEnd },
          },
          select: { date: true, grade: true, teacherId: true },
        }),
        prisma.supervisorAssignment.findMany({
          where: {
            sessionType: "afternoon",
            date: { gte: syStart, lte: syEnd },
          },
          select: { date: true, grade: true, teacherId: true },
        }),
        prisma.teacher.findMany({
          select: { id: true, name: true, primaryGrade: true },
          orderBy: { name: "asc" },
        }),
      ]);

    const workbook = buildSupervisorWorkbook({
      mode: "all",
      year,
      monthIdx,
      assignmentsInMonth,
      assignmentsInSchoolYear,
      teachers,
    });

    const uint8 = new Uint8Array(await workbook.xlsx.writeBuffer());
    const monthDisplay = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
    const filename = `감독배정_전학년_${monthDisplay}.xlsx`;
    const encodedFilename = encodeURIComponent(filename);

    return new Response(uint8, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="supervisor.xlsx"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    console.error("Supervisor assignment Excel generation error:", error);
    return NextResponse.json(
      { error: "엑셀 생성에 실패했습니다." },
      { status: 500 }
    );
  }
});
