import { NextResponse } from "next/server";
import { withGradeAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

type FailedRow = { row: number; reason: string };

export async function POST(
  req: Request,
  { params }: { params: Promise<{ grade: string }> }
) {
  const { grade: gradeStr } = await params;
  const grade = parseInt(gradeStr, 10);

  if (isNaN(grade) || grade < 1 || grade > 3) {
    return NextResponse.json({ error: "잘못된 학년입니다." }, { status: 400 });
  }

  return withGradeAuth(grade, async (req) => {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "파일이 필요합니다." },
          { status: 400 }
        );
      }

      // 파일을 Buffer로 변환
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Excel 파싱
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
        grade: number;
        classNumber: number;
        studentNumber: number;
        name: string;
      }[] = [];

      // 행 순회 (첫 번째 행은 헤더이므로 2번째부터)
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // 헤더 건너뛰기

        const gradeVal = Number(row.getCell(1).value);
        const classNum = Number(row.getCell(2).value);
        const studentNum = Number(row.getCell(3).value);
        const nameVal = row.getCell(4).value?.toString().trim();

        // 빈 행 건너뛰기
        if (!row.getCell(1).value && !row.getCell(2).value && !row.getCell(3).value && !nameVal) {
          return;
        }

        // 필수값 체크
        if (!gradeVal || !classNum || !studentNum || !nameVal) {
          failed.push({
            row: rowNumber,
            reason: "필수값(학년, 반, 번호, 이름)이 누락되었습니다.",
          });
          return;
        }

        // 학년 형식 검증
        if (!Number.isInteger(gradeVal) || gradeVal < 1 || gradeVal > 3) {
          failed.push({
            row: rowNumber,
            reason: `학년은 1~3 사이의 정수여야 합니다. (입력값: ${gradeVal})`,
          });
          return;
        }

        // 반 형식 검증
        if (!Number.isInteger(classNum) || classNum < 1 || classNum > 99) {
          failed.push({
            row: rowNumber,
            reason: `반은 1~99 사이의 정수여야 합니다. (입력값: ${classNum})`,
          });
          return;
        }

        // 번호 형식 검증
        if (!Number.isInteger(studentNum) || studentNum < 1 || studentNum > 99) {
          failed.push({
            row: rowNumber,
            reason: `번호는 1~99 사이의 정수여야 합니다. (입력값: ${studentNum})`,
          });
          return;
        }

        // URL의 grade와 파일 내 학년 일치 검증
        if (gradeVal !== grade) {
          failed.push({
            row: rowNumber,
            reason: `파일의 학년(${gradeVal})이 현재 관리 학년(${grade})과 일치하지 않습니다.`,
          });
          return;
        }

        validRows.push({
          row: rowNumber,
          grade: gradeVal,
          classNumber: classNum,
          studentNumber: studentNum,
          name: nameVal,
        });
      });

      // 파일 내 중복 체크
      const seenKeys = new Map<string, number>();
      const deduplicatedRows: typeof validRows = [];

      for (const r of validRows) {
        const key = `${r.grade}-${r.classNumber}-${r.studentNumber}`;
        if (seenKeys.has(key)) {
          failed.push({
            row: r.row,
            reason: `파일 내 중복: ${r.grade}학년 ${r.classNumber}반 ${r.studentNumber}번 (${seenKeys.get(key)}행과 중복)`,
          });
        } else {
          seenKeys.set(key, r.row);
          deduplicatedRows.push(r);
        }
      }

      if (deduplicatedRows.length === 0) {
        return NextResponse.json({
          success: 0,
          failed,
        });
      }

      // DB 기존 학생 조회 (활성 학생만)
      const existingStudents = await prisma.student.findMany({
        where: {
          grade,
          isActive: true,
          OR: deduplicatedRows.map((r) => ({
            classNumber: r.classNumber,
            studentNumber: r.studentNumber,
          })),
        },
        select: {
          id: true,
          grade: true,
          classNumber: true,
          studentNumber: true,
          name: true,
        },
      });

      const existingMap = new Map(
        existingStudents.map((s) => [
          `${s.grade}-${s.classNumber}-${s.studentNumber}`,
          s,
        ])
      );

      // 기존 학생 비활성화 + 새 학생 생성 (배치 처리)
      let successCount = 0;
      if (deduplicatedRows.length > 0) {
        // 비활성화 대상 기존 학생 ID 수집
        const toDeactivate: { id: number }[] = [];
        for (const r of deduplicatedRows) {
          const key = `${r.grade}-${r.classNumber}-${r.studentNumber}`;
          const existing = existingMap.get(key);
          if (existing) toDeactivate.push({ id: existing.id });
        }

        await prisma.$transaction(async (tx) => {
          // 1단계: 기존 학생 개별 비활성화 (studentNumber를 -(id)로 변경하여 unique 충돌 방지)
          if (toDeactivate.length > 0) {
            await Promise.all(
              toDeactivate.map((s) =>
                tx.student.update({
                  where: { id: s.id },
                  data: { isActive: false, studentNumber: -(s.id) },
                })
              )
            );
          }

          // 2단계: 새 학생 일괄 생성
          await tx.student.createMany({
            data: deduplicatedRows.map((r) => ({
              grade: r.grade,
              classNumber: r.classNumber,
              studentNumber: r.studentNumber,
              name: r.name,
            })),
          });
          successCount = deduplicatedRows.length;
        });
      }

      // 실패 목록을 행 번호 순으로 정렬
      failed.sort((a, b) => a.row - b.row);

      return NextResponse.json({
        success: successCount,
        failed,
      });
    } catch (error) {
      console.error("Bulk upload error:", error);
      return NextResponse.json(
        { error: "파일 처리 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }
  })(req);
}
