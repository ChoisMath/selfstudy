import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";
import bcrypt from "bcryptjs";

type FailedRow = { row: number; reason: string };

export async function POST(req: Request) {
  return withAuth(["admin"], async (req) => {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "파일이 필요합니다." },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const workbook = new ExcelJS.Workbook();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await workbook.xlsx.load(buffer as any);

      const sheet = workbook.worksheets[0];
      if (!sheet) {
        return NextResponse.json(
          { error: "워크시트를 찾을 수 없습니다." },
          { status: 400 }
        );
      }

      const failed: FailedRow[] = [];
      const validRows: {
        row: number;
        name: string;
        loginId: string;
        password: string;
      }[] = [];

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const nameVal = row.getCell(1).value?.toString().trim();
        const loginIdVal = row.getCell(2).value?.toString().trim();
        const passwordVal = row.getCell(3).value?.toString().trim();

        // 빈 행 건너뛰기
        if (!row.getCell(1).value && !row.getCell(2).value && !row.getCell(3).value) {
          return;
        }

        if (!nameVal || !loginIdVal || !passwordVal) {
          failed.push({
            row: rowNumber,
            reason: "필수값(이름, 아이디, 비밀번호)이 누락되었습니다.",
          });
          return;
        }

        if (passwordVal.length < 4) {
          failed.push({
            row: rowNumber,
            reason: `비밀번호는 4자 이상이어야 합니다. (입력값: ${passwordVal.length}자)`,
          });
          return;
        }

        validRows.push({
          row: rowNumber,
          name: nameVal,
          loginId: loginIdVal,
          password: passwordVal,
        });
      });

      // 파일 내 loginId 중복 체크
      const seenLoginIds = new Map<string, number>();
      const deduplicatedRows: typeof validRows = [];

      for (const r of validRows) {
        if (seenLoginIds.has(r.loginId)) {
          failed.push({
            row: r.row,
            reason: `파일 내 중복 아이디: ${r.loginId} (${seenLoginIds.get(r.loginId)}행과 중복)`,
          });
        } else {
          seenLoginIds.set(r.loginId, r.row);
          deduplicatedRows.push(r);
        }
      }

      if (deduplicatedRows.length === 0) {
        return NextResponse.json({ success: 0, failed });
      }

      // DB 기존 loginId 중복 체크
      const existingTeachers = await prisma.teacher.findMany({
        where: {
          loginId: { in: deduplicatedRows.map((r) => r.loginId) },
        },
        select: { loginId: true },
      });

      const existingLoginIds = new Set(existingTeachers.map((t) => t.loginId));

      const toCreate: typeof deduplicatedRows = [];
      for (const r of deduplicatedRows) {
        if (existingLoginIds.has(r.loginId)) {
          failed.push({
            row: r.row,
            reason: `이미 존재하는 아이디입니다: ${r.loginId}`,
          });
        } else {
          toCreate.push(r);
        }
      }

      // 일괄 생성 (bcrypt 필요하므로 개별 create)
      let successCount = 0;
      if (toCreate.length > 0) {
        await prisma.$transaction(async (tx) => {
          for (const r of toCreate) {
            const passwordHash = await bcrypt.hash(r.password, 12);
            await tx.teacher.create({
              data: {
                loginId: r.loginId,
                name: r.name,
                passwordHash,
              },
            });
            successCount++;
          }
        });
      }

      failed.sort((a, b) => a.row - b.row);

      return NextResponse.json({ success: successCount, failed });
    } catch (error) {
      console.error("Teacher bulk upload error:", error);
      return NextResponse.json(
        { error: "파일 처리 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }
  })(req);
}
