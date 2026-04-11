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
type RankingMap = Map<number, RankingResult>;

type CacheEntry = { map: RankingMap; computedAt: number };
const rankingCache = new Map<string, CacheEntry>();
const RANKING_TTL_MS = 60_000;

function buildRankingMap(rows: GroupRow[]): RankingMap {
  const normalized = rows.map((r) => ({
    studentId: r.studentId,
    minutes: typeof r.minutes === "bigint" ? Number(r.minutes) : r.minutes,
  }));
  normalized.sort((a, b) => b.minutes - a.minutes);

  const totalRanked = normalized.length;
  const map: RankingMap = new Map();

  // 표준 경쟁 순위 (1224): 같은 minutes = 같은 rank, 다음 순위는 N+k로 점프.
  let rank = 0;
  let prevMinutes = -1;
  for (let i = 0; i < normalized.length; i++) {
    const row = normalized[i];
    if (row.minutes !== prevMinutes) {
      rank = i + 1;
      prevMinutes = row.minutes;
    }
    const topPercent = Math.ceil((rank / totalRanked) * 100);
    map.set(row.studentId, {
      rank,
      totalRanked,
      topPercent,
      minutes: row.minutes,
    });
  }

  return map;
}

/**
 * 학년 내 학년도 자습시간 누계 랭킹 맵을 반환한다.
 * - 모듈 레벨 인메모리 캐시(TTL 60초)로 동일 학년의 연속 요청을 1회 DB 호출로 합침
 * - 결과 Map: studentId → RankingResult (누계 0 학생은 포함되지 않음)
 */
export async function getGradeRankingMap(
  grade: number,
  now: Date = new Date(),
): Promise<RankingMap> {
  const { start, end } = getAcademicYearRange(now);
  const cacheKey = `${grade}|${start.toISOString()}`;
  const cached = rankingCache.get(cacheKey);
  if (cached && now.getTime() - cached.computedAt < RANKING_TTL_MS) {
    return cached.map;
  }

  // 테이블/컬럼은 prisma @@map/@map 에 의해 snake_case (attendance, students, student_id, ...)
  // `a.status = 'present'::"AttendanceStatus"` 형태로 enum 비교 → (date, status) 인덱스 활용 가능
  const rows = await prisma.$queryRaw<GroupRow[]>`
    SELECT
      a.student_id AS "studentId",
      SUM(COALESCE(a.duration_minutes, 100))::int AS minutes
    FROM attendance a
    INNER JOIN students s ON s.id = a.student_id
    WHERE s.grade = ${grade}
      AND s.is_active = true
      AND a.status = 'present'::"AttendanceStatus"
      AND a.date >= ${start}
      AND a.date < ${end}
    GROUP BY a.student_id
    HAVING SUM(COALESCE(a.duration_minutes, 100)) > 0
  `;

  const map = buildRankingMap(rows);
  rankingCache.set(cacheKey, { map, computedAt: now.getTime() });
  return map;
}

export async function computeGradeStudyRanking(
  grade: number,
  targetStudentId: number,
  now: Date = new Date(),
): Promise<RankingResult | null> {
  const map = await getGradeRankingMap(grade, now);
  return map.get(targetStudentId) ?? null;
}
