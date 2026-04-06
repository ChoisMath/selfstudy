import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

// GET /api/attendance/notes?studentId=1&date=2026-04-05
export const GET = withAuth(
  ["teacher"],
  async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const studentId = parseInt(searchParams.get("studentId") || "");
    const dateStr = searchParams.get("date");

    if (!studentId || !dateStr) {
      return NextResponse.json({ error: "studentId와 date가 필요합니다." }, { status: 400 });
    }

    // 해당 주의 월~금 계산
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const weekDates: Date[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDates.push(d);
    }

    const notes = await prisma.attendanceNote.findMany({
      where: {
        studentId,
        date: { gte: weekDates[0], lte: weekDates[4] },
      },
    });

    // { "2026-04-05": { afternoon: "...", night: "..." }, ... }
    const result: Record<string, { afternoon?: string; night?: string }> = {};
    for (const n of notes) {
      const key = n.date.toISOString().split("T")[0];
      if (!result[key]) result[key] = {};
      if (n.sessionType === "afternoon") {
        result[key].afternoon = n.note;
      } else if (n.sessionType === "night") {
        result[key].night = n.note;
      }
    }

    return NextResponse.json({ notes: result });
  }
);

// PUT /api/attendance/notes
// Body: { studentId, sessionType, date, note }
export const PUT = withAuth(
  ["teacher"],
  async (req: Request, user) => {
    const body = await req.json();
    const { studentId, sessionType, date, note } = body;

    if (!studentId || !sessionType || !date) {
      return NextResponse.json(
        { error: "studentId, sessionType, date가 필요합니다." },
        { status: 400 }
      );
    }

    const dateObj = new Date(date + "T00:00:00Z");
    const trimmedNote = (note || "").trim();

    if (trimmedNote === "") {
      await prisma.attendanceNote.deleteMany({
        where: { studentId, sessionType, date: dateObj },
      });
    } else {
      await prisma.attendanceNote.upsert({
        where: {
          studentId_sessionType_date: { studentId, sessionType, date: dateObj },
        },
        update: { note: trimmedNote, createdBy: user.userId },
        create: {
          studentId,
          sessionType,
          date: dateObj,
          note: trimmedNote,
          createdBy: user.userId,
        },
      });
    }

    return NextResponse.json({ ok: true });
  }
);
