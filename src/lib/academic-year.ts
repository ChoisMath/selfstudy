import { prisma } from "./prisma";

export function getAcademicYearRange(now: Date = new Date()): {
  start: Date;
  end: Date;
} {
  // 프로젝트는 날짜를 UTC로 저장하므로 학년도 경계도 UTC 기준으로 계산
  const y = now.getUTCMonth() >= 2 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const start = new Date(Date.UTC(y, 2, 1));
  const end = new Date(Date.UTC(y + 1, 2, 1));
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

  // 테이블/컬럼은 prisma @@map/@map 에 의해 snake_case (attendance, students, student_id, ...)
  const rows = await prisma.$queryRaw<GroupRow[]>`
    SELECT
      a.student_id AS "studentId",
      SUM(COALESCE(a.duration_minutes, 100))::int AS minutes
    FROM attendance a
    INNER JOIN students s ON s.id = a.student_id
    WHERE s.grade = ${grade}
      AND s.is_active = true
      AND a.status::text = 'present'
      AND a.date >= ${start}
      AND a.date < ${end}
    GROUP BY a.student_id
    HAVING SUM(COALESCE(a.duration_minutes, 100)) > 0
  `;

  if (rows.length === 0) return null;

  const normalized = rows.map((r) => ({
    studentId: r.studentId,
    minutes: typeof r.minutes === "bigint" ? Number(r.minutes) : r.minutes,
  }));
  normalized.sort((a, b) => b.minutes - a.minutes);

  // 표준 경쟁 순위 (1224): 같은 minutes = 같은 rank, 다음 순위는 N+k로 점프.
  // 대상 학생을 찾는 즉시 break — 이후 레코드는 대상 순위에 영향 없음.
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
