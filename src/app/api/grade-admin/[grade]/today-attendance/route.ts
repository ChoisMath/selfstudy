import { NextResponse } from "next/server";
import { withGradeAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const DAY_FIELDS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const AFTER_SCHOOL_FIELDS = [
  "", "afterSchoolMon", "afterSchoolTue", "afterSchoolWed", "afterSchoolThu", "afterSchoolFri", "",
] as const;
const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

type SessionStats = {
  supervisor: string | null;
  total: number;
  present: number;
  absent: number;
  excusedAbsent: number;
  afterSchool: number;
};

function emptyStats(): SessionStats {
  return { supervisor: null, total: 0, present: 0, absent: 0, excusedAbsent: 0, afterSchool: 0 };
}

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
    const now = new Date();
    const kstOffset = now.getTime() + 9 * 60 * 60 * 1000;
    const kst = new Date(kstOffset);
    const y = kst.getUTCFullYear();
    const m = kst.getUTCMonth();
    const d = kst.getUTCDate();
    const dayOfWeek = kst.getUTCDay();
    const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json({
        date: dateStr,
        dayOfWeek: DAY_NAMES[dayOfWeek],
        isWeekend: true,
        afternoon: emptyStats(),
        night: emptyStats(),
      });
    }

    const dayField = DAY_FIELDS[dayOfWeek] as "mon" | "tue" | "wed" | "thu" | "fri";
    const afterSchoolField = AFTER_SCHOOL_FIELDS[dayOfWeek];
    const dateObj = new Date(dateStr + "T00:00:00Z");

    const [students, attendances, supervisorAssignments] = await Promise.all([
      prisma.student.findMany({
        where: { grade, isActive: true },
        include: { participationDays: true },
      }),
      prisma.attendance.findMany({
        where: { date: dateObj, student: { grade } },
        include: { absenceReason: { select: { reasonType: true } } },
      }),
      prisma.supervisorAssignment.findMany({
        where: { date: dateObj, grade },
        include: { teacher: { select: { name: true } } },
      }),
    ]);

    const attMap = new Map<string, typeof attendances[0]>();
    for (const a of attendances) {
      attMap.set(`${a.studentId}-${a.sessionType}`, a);
    }

    const supervisorMap = new Map<string, string>();
    for (const sa of supervisorAssignments) {
      supervisorMap.set(sa.sessionType, sa.teacher.name);
    }

    function calcStats(sessionType: "afternoon" | "night"): SessionStats {
      const stats = emptyStats();
      stats.supervisor = supervisorMap.get(sessionType) ?? null;

      for (const student of students) {
        const part = student.participationDays.find((p) => p.sessionType === sessionType);
        if (!part || !part.isParticipating || !part[dayField]) continue;

        stats.total++;

        if (afterSchoolField && part[afterSchoolField as keyof typeof part]) {
          stats.afterSchool++;
        }

        const att = attMap.get(`${student.id}-${sessionType}`);
        if (!att || att.status === "unchecked") continue;

        if (att.status === "present") {
          stats.present++;
        } else if (att.status === "absent") {
          if (att.absenceReason) {
            stats.excusedAbsent++;
          } else {
            stats.absent++;
          }
        }
      }

      return stats;
    }

    return NextResponse.json({
      date: dateStr,
      dayOfWeek: DAY_NAMES[dayOfWeek],
      isWeekend: false,
      afternoon: calcStats("afternoon"),
      night: calcStats("night"),
    });
  })(req);
}
