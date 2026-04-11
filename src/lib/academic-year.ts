import { prisma } from "./prisma";

export function getAcademicYearRange(now: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const y = now.getMonth() >= 2 ? now.getFullYear() : now.getFullYear() - 1;
  const start = new Date(y, 2, 1, 0, 0, 0, 0);
  const end = new Date(y + 1, 2, 1, 0, 0, 0, 0);
  return { start, end };
}

export type RankingResult = {
  rank: number;
  totalRanked: number;
  topPercent: number;
  minutes: number;
};

type GroupRow = { studentId: number; minutes: bigint | number };

export async function computeGradeStudyRanking(
  grade: number,
  targetStudentId: number,
  now: Date = new Date(),
): Promise<RankingResult | null> {
  const { start, end } = getAcademicYearRange(now);

  const rows = await prisma.$queryRaw<GroupRow[]>`
    SELECT
      a."studentId" AS "studentId",
      SUM(COALESCE(a."durationMinutes", 100))::int AS minutes
    FROM "Attendance" a
    INNER JOIN "Student" s ON s.id = a."studentId"
    WHERE s.grade = ${grade}
      AND s."isActive" = true
      AND a.status = 'present'::"AttendanceStatus"
      AND a.date >= ${start}
      AND a.date < ${end}
    GROUP BY a."studentId"
    HAVING SUM(COALESCE(a."durationMinutes", 100)) > 0
  `;

  if (rows.length === 0) return null;

  const normalized = rows.map((r) => ({
    studentId: r.studentId,
    minutes: typeof r.minutes === "bigint" ? Number(r.minutes) : r.minutes,
  }));
  normalized.sort((a, b) => b.minutes - a.minutes);

  // 표준 경쟁 순위
  let rank = 0;
  let prevMinutes = -1;
  let targetRank: number | null = null;
  let targetMinutes = 0;
  for (let i = 0; i < normalized.length; i++) {
    const r = normalized[i];
    if (r.minutes !== prevMinutes) {
      rank = i + 1;
      prevMinutes = r.minutes;
    }
    if (r.studentId === targetStudentId) {
      targetRank = rank;
      targetMinutes = r.minutes;
      break;
    }
  }

  if (targetRank === null) return null;

  const totalRanked = normalized.length;
  const topPercent = Math.ceil((targetRank / totalRanked) * 100);

  return {
    rank: targetRank,
    totalRanked,
    topPercent,
    minutes: targetMinutes,
  };
}
