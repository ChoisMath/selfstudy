import { formatDateWithWeekday } from "@/lib/calendar";

export type ReminderAssignment = {
  teacherId: number;
  grade: number;
  teacherName: string;
};

export type PlannedReminder = {
  teacherId: number;
  grade: number;
  message: string;
};

export function reminderKey(teacherId: number, grade: number): string {
  return `${teacherId}-${grade}`;
}

export function buildReminderMessage(name: string, date: string, grade: number): string {
  return `${name}선생님, ${formatDateWithWeekday(date)} 에 ${grade}학년 자율학습 감독교사 이십니다. 잘 부탁드립니다.`;
}

export function planReminders(
  assignments: ReminderAssignment[],
  date: string,
  alreadySent: Set<string>
): PlannedReminder[] {
  const seen = new Set<string>();
  const result: PlannedReminder[] = [];
  for (const a of assignments) {
    const key = reminderKey(a.teacherId, a.grade);
    if (seen.has(key)) continue; // 오후+야간 2행 → 1건
    seen.add(key);
    if (alreadySent.has(key)) continue; // 이미 발송됨
    result.push({
      teacherId: a.teacherId,
      grade: a.grade,
      message: buildReminderMessage(a.teacherName, date, a.grade),
    });
  }
  return result;
}
