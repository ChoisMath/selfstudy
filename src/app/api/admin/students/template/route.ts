import { withAuth } from "@/lib/api-auth";
import ExcelJS from "exceljs";

export async function GET(req: Request) {
  return withAuth(["admin", "sub_admin"], async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("학생 목록");

    // 컬럼 정의
    sheet.columns = [
      { header: "학년", key: "grade", width: 10 },
      { header: "반", key: "classNumber", width: 10 },
      { header: "번호", key: "studentNumber", width: 10 },
      { header: "이름", key: "name", width: 20 },
    ];

    // 헤더 스타일
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

    // 예시 데이터
    sheet.addRow({ grade: 1, classNumber: 1, studentNumber: 1, name: "홍길동" });

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="student_template.xlsx"',
      },
    });
  })(req);
}
