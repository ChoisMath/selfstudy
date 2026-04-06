import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import ExcelJS from "exceljs";

// GET /api/homeroom/export-attendance?month=2026-04
export const GET = withAuth(["homeroom", "admin"], async (req: Request, user) => {
  const assignments = user.homeroomAssignments;
  if (!assignments || assignments.length === 0) {
    return NextResponse.json({ error: "담임 배정이 없습니다." }, { status: 403 });
  }

  const url = new URL(req.url);
  const monthStr = url.searchParams.get("month");

  let year: number, monthIdx: number;
  if (monthStr) {
    [year, monthIdx] = monthStr.split("-").map(Number);
    monthIdx -= 1;
  } else {
    const now = new Date();
    year = now.getFullYear();
    monthIdx = now.getMonth();
  }

  const startDate = new Date(year, monthIdx, 1);
  const endDate = new Date(year, monthIdx + 1, 0);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  // 평일 날짜 배열
  const dates: string[] = [];
  const d = new Date(startDate);
  while (d <= endDate) {
    if (d.getDay() >= 1 && d.getDay() <= 5) {
      dates.push(d.toISOString().split("T")[0]);
    }
    d.setDate(d.getDate() + 1);
  }

  const classConditions = assignments.map((a) => ({
    grade: a.grade,
    classNumber: a.classNumber,
  }));

  const students = await prisma.student.findMany({
    where: { isActive: true, OR: classConditions },
    orderBy: [{ grade: "asc" }, { classNumber: "asc" }, { studentNumber: "asc" }],
    include: {
      attendances: {
        where: { date: { gte: startDate, lte: endDate } },
        include: { absenceReason: { select: { reasonType: true } } },
      },
    },
  });

  try {
    const workbook = new ExcelJS.Workbook();
    const displayMonth = `${year}년 ${monthIdx + 1}월`;

    // 학급별로 사전 그룹화 (O(N) Map)
    const studentsByClass = new Map<string, typeof students>();
    for (const s of students) {
      const key = `${s.grade}-${s.classNumber}`;
      const arr = studentsByClass.get(key) || [];
      arr.push(s);
      studentsByClass.set(key, arr);
    }

    const classesSorted = [...assignments].sort(
      (a, b) => a.grade - b.grade || a.classNumber - b.classNumber
    );

    for (const cls of classesSorted) {
      const sheetName = `${cls.grade}-${cls.classNumber}반`;
      const sheet = workbook.addWorksheet(sheetName);

      const classStudents = studentsByClass.get(`${cls.grade}-${cls.classNumber}`) || [];

      // 헤더 행 1: 이름, 번호, 날짜별(2칸씩)
      const headerRow1 = ["이름", "번호"];
      const headerRow2 = ["", ""];
      for (const date of dates) {
        const dayName = ["일", "월", "화", "수", "목", "금", "토"][new Date(date).getDay()];
        headerRow1.push(`${date.slice(5)} (${dayName})`, "");
        headerRow2.push("오후", "야간");
      }

      sheet.addRow(headerRow1);
      sheet.addRow(headerRow2);

      // 날짜 헤더 셀 병합
      for (let i = 0; i < dates.length; i++) {
        const col = 3 + i * 2; // 1-based, 이름/번호 다음
        sheet.mergeCells(1, col, 1, col + 1);
        const cell = sheet.getCell(1, col);
        cell.alignment = { horizontal: "center" };
      }

      // 헤더 스타일
      sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
      });
      sheet.getRow(2).eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center" };
      });

      // 데이터 행
      for (const student of classStudents) {
        // O(1) 룩업을 위한 Map 변환
        const attMap = new Map<string, typeof student.attendances[0]>();
        for (const a of student.attendances) {
          attMap.set(`${a.date.toISOString().split("T")[0]}-${a.sessionType}`, a);
        }
        const row: string[] = [student.name, String(student.studentNumber)];

        for (const date of dates) {
          const afternoon = attMap.get(`${date}-afternoon`);
          const night = attMap.get(`${date}-night`);

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

      // 열 너비
      sheet.getColumn(1).width = 10;
      sheet.getColumn(2).width = 6;
      for (let i = 0; i < dates.length; i++) {
        sheet.getColumn(3 + i * 2).width = 8;
        sheet.getColumn(4 + i * 2).width = 8;
      }
    }

    const uint8 = new Uint8Array(await workbook.xlsx.writeBuffer());
    const filename = `${displayMonth}_출결.xlsx`;
    const encodedFilename = encodeURIComponent(filename);

    return new Response(uint8, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="attendance.xlsx"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    console.error("Attendance Excel generation error:", error);
    return NextResponse.json({ error: "엑셀 생성에 실패했습니다." }, { status: 500 });
  }
});
