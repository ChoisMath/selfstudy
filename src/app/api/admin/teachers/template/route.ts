import { withAuth } from "@/lib/api-auth";
import ExcelJS from "exceljs";

export async function GET(req: Request) {
  return withAuth(["admin"], async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("교사 목록");

    sheet.columns = [
      { header: "이름", key: "name", width: 20 },
      { header: "아이디", key: "loginId", width: 20 },
      { header: "비밀번호", key: "password", width: 20 },
      { header: "담당학년", key: "primaryGrade", width: 12 },
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

    sheet.addRow({ name: "홍길동", loginId: "teacher01", password: "pass1234", primaryGrade: 1 });

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="teacher_template.xlsx"',
      },
    });
  })(req);
}
