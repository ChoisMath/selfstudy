import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withGradeAuth } from "@/lib/api-auth";
import ExcelJS from "exceljs";

const REASON_KO: Record<string, string> = {
  academy: "학원", afterschool: "방과후", illness: "질병", custom: "기타",
};

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

    const dates: string[] = [];
    const d = new Date(startDate);
    while (d <= endDate) {
      if (d.getDay() >= 1 && d.getDay() <= 5) {
        dates.push(d.toISOString().split("T")[0]);
      }
      d.setDate(d.getDate() + 1);
    }

    const students = await prisma.student.findMany({
      where: { grade, isActive: true },
      orderBy: [{ classNumber: "asc" }, { studentNumber: "asc" }],
      include: {
        attendances: {
          where: { date: { gte: startDate, lte: endDate } },
          include: { absenceReason: { select: { reasonType: true, detail: true } } },
        },
      },
    });

    try {
      const workbook = new ExcelJS.Workbook();
      const sheetName = `${grade}학년 월간출결`;
      const sheet = workbook.addWorksheet(sheetName);

      const headerRow1 = ["반", "번호", "이름"];
      const headerRow2 = ["", "", ""];
      for (const date of dates) {
        const dayName = ["일", "월", "화", "수", "목", "금", "토"][new Date(date).getDay()];
        headerRow1.push(`${date.slice(5)} (${dayName})`, "");
        headerRow2.push("오후", "야간");
      }

      sheet.addRow(headerRow1);
      sheet.addRow(headerRow2);

      for (let i = 0; i < dates.length; i++) {
        const col = 4 + i * 2;
        sheet.mergeCells(1, col, 1, col + 1);
        const cell = sheet.getCell(1, col);
        cell.alignment = { horizontal: "center" };
      }

      sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
      });
      sheet.getRow(2).eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center" };
      });

      const evenClassFill: ExcelJS.Fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF0F7FF" },
      };

      let prevClassNumber = -1;
      for (const student of students) {
        const attMap = new Map<string, typeof student.attendances[0]>();
        for (const a of student.attendances) {
          attMap.set(`${a.date.toISOString().split("T")[0]}-${a.sessionType}`, a);
        }

        const showClass = student.classNumber !== prevClassNumber;
        prevClassNumber = student.classNumber;

        const row: string[] = [
          showClass ? String(student.classNumber) : "",
          String(student.studentNumber),
          student.name,
        ];

        for (const date of dates) {
          const afternoon = attMap.get(`${date}-afternoon`);
          const night = attMap.get(`${date}-night`);

          const statusSymbol = (a: typeof afternoon) => {
            if (!a) return "-";
            if (a.status === "present") return "O";
            if (a.status === "absent") {
              const reason = a.absenceReason;
              if (reason) {
                const label = REASON_KO[reason.reasonType] || reason.reasonType;
                return reason.detail ? `△(${label}: ${reason.detail})` : `△(${label})`;
              }
              return "X";
            }
            return "-";
          };

          row.push(statusSymbol(afternoon), statusSymbol(night));
        }

        const excelRow = sheet.addRow(row);

        if (student.classNumber % 2 === 0) {
          excelRow.eachCell((cell) => {
            cell.fill = evenClassFill;
          });
        }
      }

      sheet.getColumn(1).width = 5;
      sheet.getColumn(2).width = 6;
      sheet.getColumn(3).width = 10;
      for (let i = 0; i < dates.length; i++) {
        sheet.getColumn(4 + i * 2).width = 14;
        sheet.getColumn(5 + i * 2).width = 14;
      }

      const uint8 = new Uint8Array(await workbook.xlsx.writeBuffer());
      const filename = `${grade}학년_월간출결_${year}-${String(monthIdx + 1).padStart(2, "0")}.xlsx`;
      const encodedFilename = encodeURIComponent(filename);

      return new Response(uint8, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="attendance.xlsx"; filename*=UTF-8''${encodedFilename}`,
        },
      });
    } catch (error) {
      console.error("Grade attendance Excel generation error:", error);
      return NextResponse.json({ error: "엑셀 생성에 실패했습니다." }, { status: 500 });
    }
  })(req);
}
