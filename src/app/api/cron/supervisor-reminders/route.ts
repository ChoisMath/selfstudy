import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getKstTodayString } from "@/lib/calendar";
import {
  planReminders,
  reminderKey,
  type ReminderAssignment,
} from "@/lib/push/reminder-logic";
import { sendToTeacher } from "@/lib/push/send";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = getKstTodayString();
  const dateObj = new Date(today + "T00:00:00.000Z");

  const assignments = await prisma.supervisorAssignment.findMany({
    where: { date: dateObj },
    include: { teacher: { select: { id: true, name: true } } },
  });

  const reminderAssignments: ReminderAssignment[] = assignments.map((a) => ({
    teacherId: a.teacherId,
    grade: a.grade,
    teacherName: a.teacher.name,
  }));

  const existingLogs = await prisma.supervisorReminderLog.findMany({
    where: { date: dateObj },
    select: { teacherId: true, grade: true },
  });
  const alreadySent = new Set(
    existingLogs.map((l) => reminderKey(l.teacherId, l.grade))
  );

  const planned = planReminders(reminderAssignments, today, alreadySent);

  let sent = 0;
  for (const p of planned) {
    await sendToTeacher(p.teacherId, {
      title: "자율학습 감독 안내",
      body: p.message,
      url: "/attendance",
    });
    await prisma.supervisorReminderLog.create({
      data: { teacherId: p.teacherId, grade: p.grade, date: dateObj },
    });
    sent++;
  }

  return NextResponse.json({
    processed: reminderAssignments.length,
    planned: planned.length,
    sent,
  });
}
