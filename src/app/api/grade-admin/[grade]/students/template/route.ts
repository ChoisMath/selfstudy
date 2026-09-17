import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { withGradeAuth } from "@/lib/api-auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ grade: string }> }
) {
  const { grade: gradeStr } = await params;
  const grade = parseInt(gradeStr, 10);

  if (isNaN(grade) || grade < 1 || grade > 3) {
    return NextResponse.json({ error: "잘못된 학년입니다." }, { status: 400 });
  }

  return withGradeAuth(grade, async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("학생 목록");

    sheet.columns = [
      { header: "학년", key: "grade", width: 10 },
      { header: "반", key: "classNumber", width: 10 },
      { header: "번호", key: "studentNumber", width: 10 },
      { header: "이름", key: "name", width: 20 },
    ];

    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE2E8F0" },
      };
      cell.border = {
        bottom: { style: "thin" },
      };
    });

    sheet.addRow({ grade, classNumber: 1, studentNumber: 1, name: "홍길동" });

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="student_template.xlsx"',
      },
    });
  })(req);
}
