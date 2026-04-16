import ExcelJS from "exceljs";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type SupervisorAssignmentLite = {
  date: Date;
  grade: number;
  teacherId: number;
};

export type TeacherLite = {
  id: number;
  name: string;
  primaryGrade: number | null;
};

export type BuildOptions = {
  mode: "grade" | "all";
  year: number;
  monthIdx: number; // 0-based
  grade?: number; // required when mode === "grade"
  assignmentsInMonth: SupervisorAssignmentLite[];
  assignmentsInSchoolYear: SupervisorAssignmentLite[];
  teachers: TeacherLite[];
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const DAY_HEADERS = ["일", "월", "화", "수", "목", "금", "토"];

const GRAY_BG: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE2E8F0" },
};

const THIN_GRAY_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFD0D5DD" } },
  bottom: { style: "thin", color: { argb: "FFD0D5DD" } },
  left: { style: "thin", color: { argb: "FFD0D5DD" } },
  right: { style: "thin", color: { argb: "FFD0D5DD" } },
};

/** Date key string "YYYY-MM-DD" from UTC fields of a Date (Prisma stores at midnight UTC). */
function dateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Date key string from explicit year/month/day (already local values matching DB). */
function localDateKey(year: number, monthIdx: number, day: number): string {
  const m = String(monthIdx + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

/** Korean collator for name sorting. */
const koCollator = new Intl.Collator("ko");

/**
 * Build school-year month list (3월~익년 2월) containing only months
 * that have at least one assignment. Returns sorted array of {year, monthIdx}.
 */
function getSchoolYearMonths(
  assignments: SupervisorAssignmentLite[]
): { year: number; monthIdx: number }[] {
  const set = new Set<string>();
  for (const a of assignments) {
    const y = a.date.getUTCFullYear();
    const m = a.date.getUTCMonth();
    set.add(`${y}-${m}`);
  }

  const months: { year: number; monthIdx: number; order: number }[] = [];
  for (const key of set) {
    const [y, m] = key.split("-").map(Number);
    // School year order: 3월=0, 4월=1, ..., 12월=9, 1월=10, 2월=11
    const order = (m - 2 + 12) % 12; // March(2)→0, April(3)→1, ..., Feb(1)→11
    months.push({ year: y, monthIdx: m, order });
  }

  months.sort((a, b) => {
    // Sort by school year then order within year
    const aSchoolYear = a.monthIdx >= 2 ? a.year : a.year - 1;
    const bSchoolYear = b.monthIdx >= 2 ? b.year : b.year - 1;
    if (aSchoolYear !== bSchoolYear) return aSchoolYear - bSchoolYear;
    return a.order - b.order;
  });

  return months.map(({ year, monthIdx }) => ({ year, monthIdx }));
}

/* ------------------------------------------------------------------ */
/*  Month sheet                                                        */
/* ------------------------------------------------------------------ */

function buildMonthSheet(wb: ExcelJS.Workbook, opts: BuildOptions): void {
  const { mode, year, monthIdx, grade, assignmentsInMonth, teachers } = opts;
  const colWidth = mode === "all" ? 18 : 14;
  const rowHeight = mode === "all" ? 80 : 40;

  const teacherMap = new Map<number, TeacherLite>();
  for (const t of teachers) teacherMap.set(t.id, t);

  // Build lookup: dateKey → grade → teacherName
  const dayTeachers = new Map<string, Map<number, string>>();
  for (const a of assignmentsInMonth) {
    const dk = dateKey(a.date);
    let gradeMap = dayTeachers.get(dk);
    if (!gradeMap) {
      gradeMap = new Map();
      dayTeachers.set(dk, gradeMap);
    }
    const teacher = teacherMap.get(a.teacherId);
    if (teacher) {
      gradeMap.set(a.grade, teacher.name);
    }
  }

  const monthLabel =
    mode === "all"
      ? `${year}년 ${monthIdx + 1}월 감독배정`
      : `${year}년 ${monthIdx + 1}월 ${grade}학년 감독배정`;
  const sheet = wb.addWorksheet(monthLabel);

  // Header row: 일 월 화 수 목 금 토
  const headerRow = sheet.addRow(DAY_HEADERS);
  headerRow.eachCell((cell, colNumber) => {
    cell.font = {
      bold: true,
      color: {
        argb:
          colNumber === 1
            ? "FFFF0000" // 일: red
            : colNumber === 7
              ? "FF0000FF" // 토: blue
              : "FF000000",
      },
    };
    cell.fill = GRAY_BG;
    cell.alignment = { horizontal: "center", vertical: "top", wrapText: true };
    cell.border = THIN_GRAY_BORDER;
  });

  // Set column widths
  for (let c = 1; c <= 7; c++) {
    sheet.getColumn(c).width = colWidth;
  }

  // Calendar grid
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  // Day-of-week for the 1st (0=Sun, 1=Mon, ..., 6=Sat)
  const firstDow = new Date(year, monthIdx, 1).getDay();

  let currentDay = 1;
  let started = false;

  while (currentDay <= daysInMonth) {
    const rowValues: string[] = [];
    const cellMeta: { isWeekend: boolean; isEmpty: boolean }[] = [];

    for (let col = 0; col < 7; col++) {
      if (!started && col < firstDow) {
        // Empty cell before month start
        rowValues.push("");
        cellMeta.push({ isWeekend: false, isEmpty: true });
      } else if (currentDay > daysInMonth) {
        // Empty cell after month end
        rowValues.push("");
        cellMeta.push({ isWeekend: false, isEmpty: true });
      } else {
        const dayNum = currentDay;
        const dow = col; // 0=Sun, 6=Sat
        const isWeekend = dow === 0 || dow === 6;
        const dk = localDateKey(year, monthIdx, dayNum);

        let cellText = String(dayNum);

        if (!isWeekend) {
          const gradeMap = dayTeachers.get(dk);
          if (mode === "grade" && grade !== undefined) {
            const name = gradeMap?.get(grade);
            if (name) cellText = `${dayNum}\n${name}`;
          } else if (mode === "all") {
            const lines: string[] = [];
            for (let g = 1; g <= 3; g++) {
              const name = gradeMap?.get(g);
              lines.push(`${g}: ${name ?? ""}`);
            }
            cellText = `${dayNum}\n${lines.join("\n")}`;
          }
        }

        rowValues.push(cellText);
        cellMeta.push({ isWeekend, isEmpty: false });
        currentDay++;
      }
    }
    if (!started) started = true;

    const row = sheet.addRow(rowValues);
    row.height = rowHeight;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const meta = cellMeta[colNumber - 1];
      if (!meta) return;

      cell.alignment = { horizontal: "center", vertical: "top", wrapText: true };
      cell.border = THIN_GRAY_BORDER;

      if (meta.isEmpty || meta.isWeekend) {
        cell.fill = GRAY_BG;
      }
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Summary sheet                                                      */
/* ------------------------------------------------------------------ */

function buildSummarySheet(wb: ExcelJS.Workbook, opts: BuildOptions): void {
  const { mode, grade, assignmentsInSchoolYear, teachers } = opts;

  const sheet = wb.addWorksheet("누계");

  // Determine which teachers to include and sort order
  let filteredTeachers: TeacherLite[];
  if (mode === "grade" && grade !== undefined) {
    filteredTeachers = teachers
      .filter((t) => t.primaryGrade === grade)
      .sort((a, b) => koCollator.compare(a.name, b.name));
  } else {
    filteredTeachers = [...teachers].sort((a, b) => {
      const ga = a.primaryGrade ?? 999;
      const gb = b.primaryGrade ?? 999;
      if (ga !== gb) return ga - gb;
      return koCollator.compare(a.name, b.name);
    });
  }

  const teacherIds = new Set(filteredTeachers.map((t) => t.id));

  // Filter assignments to relevant teachers only
  const relevantAssignments = assignmentsInSchoolYear.filter((a) =>
    teacherIds.has(a.teacherId)
  );

  // Get month columns
  const months = getSchoolYearMonths(relevantAssignments);

  // Count assignments per teacher per month
  // key: `${teacherId}-${year}-${monthIdx}`
  const countMap = new Map<string, number>();
  for (const a of relevantAssignments) {
    const y = a.date.getUTCFullYear();
    const m = a.date.getUTCMonth();
    const key = `${a.teacherId}-${y}-${m}`;
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }

  // Header row
  const headerCells: string[] =
    mode === "all"
      ? ["교사명", "담당학년"]
      : ["교사명"];

  for (const mo of months) {
    headerCells.push(`${mo.monthIdx + 1}월`);
  }
  headerCells.push("총계");

  const headerRow = sheet.addRow(headerCells);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = GRAY_BG;
    cell.alignment = { horizontal: "center" };
  });

  // Data rows
  for (const teacher of filteredTeachers) {
    const rowValues: (string | number)[] =
      mode === "all"
        ? [teacher.name, teacher.primaryGrade != null ? `${teacher.primaryGrade}학년` : ""]
        : [teacher.name];

    let total = 0;
    for (const mo of months) {
      const key = `${teacher.id}-${mo.year}-${mo.monthIdx}`;
      const count = countMap.get(key) ?? 0;
      rowValues.push(count);
      total += count;
    }
    rowValues.push(total);

    const row = sheet.addRow(rowValues);

    // Bold the total cell
    const totalCell = row.getCell(rowValues.length);
    totalCell.font = { bold: true };
  }

  // Auto-width columns (reasonable defaults)
  const nameColWidth = 12;
  sheet.getColumn(1).width = nameColWidth;
  let colStart = 2;
  if (mode === "all") {
    sheet.getColumn(2).width = 10;
    colStart = 3;
  }
  for (let i = colStart; i <= headerCells.length; i++) {
    sheet.getColumn(i).width = 8;
  }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function buildSupervisorWorkbook(opts: BuildOptions): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  buildMonthSheet(wb, opts);
  buildSummarySheet(wb, opts);
  return wb;
}
