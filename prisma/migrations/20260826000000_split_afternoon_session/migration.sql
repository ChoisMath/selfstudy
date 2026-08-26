-- 1. 좌석 전용 enum
CREATE TYPE "SeatSessionType" AS ENUM ('afternoon', 'night');
ALTER TABLE "study_sessions"
  ALTER COLUMN "type" TYPE "SeatSessionType" USING ("type"::text::"SeatSessionType");

-- 2. 출석 블록 enum 재생성 (afternoon → afternoon1)
CREATE TYPE "SessionType_new" AS ENUM ('afternoon1', 'afternoon2', 'night');
ALTER TABLE "attendance" ALTER COLUMN "session_type" TYPE "SessionType_new"
  USING (CASE "session_type"::text WHEN 'afternoon' THEN 'afternoon1' ELSE "session_type"::text END)::"SessionType_new";
ALTER TABLE "absence_requests" ALTER COLUMN "session_type" TYPE "SessionType_new"
  USING (CASE "session_type"::text WHEN 'afternoon' THEN 'afternoon1' ELSE "session_type"::text END)::"SessionType_new";
ALTER TABLE "participation_days" ALTER COLUMN "session_type" TYPE "SessionType_new"
  USING (CASE "session_type"::text WHEN 'afternoon' THEN 'afternoon1' ELSE "session_type"::text END)::"SessionType_new";
ALTER TABLE "attendance_notes" ALTER COLUMN "session_type" TYPE "SessionType_new"
  USING (CASE "session_type"::text WHEN 'afternoon' THEN 'afternoon1' ELSE "session_type"::text END)::"SessionType_new";
ALTER TABLE "supervisor_assignments" ALTER COLUMN "session_type" TYPE "SessionType_new"
  USING (CASE "session_type"::text WHEN 'afternoon' THEN 'afternoon1' ELSE "session_type"::text END)::"SessionType_new";
ALTER TYPE "SessionType" RENAME TO "SessionType_old";
ALTER TYPE "SessionType_new" RENAME TO "SessionType";
DROP TYPE "SessionType_old";

-- 3. afternoon1 → afternoon2 복제 (과거 오후 100분 = 50 + 50)
INSERT INTO "participation_days" (student_id, session_type, is_participating, mon, tue, wed, thu, fri,
  after_school_mon, after_school_tue, after_school_wed, after_school_thu, after_school_fri)
SELECT student_id, 'afternoon2', is_participating, mon, tue, wed, thu, fri,
  after_school_mon, after_school_tue, after_school_wed, after_school_thu, after_school_fri
FROM "participation_days" WHERE session_type = 'afternoon1';

-- duration_minutes: NULL 이면 NULL(→ 기본 50), 값이 있으면 반분해 합을 보존
INSERT INTO "attendance" (student_id, session_type, date, status, checked_by, created_at, updated_at,
  duration_minutes, duration_note)
SELECT student_id, 'afternoon2', date, status, checked_by, created_at, updated_at,
  CASE WHEN duration_minutes IS NULL THEN NULL ELSE duration_minutes - duration_minutes / 2 END, duration_note
FROM "attendance" WHERE session_type = 'afternoon1';
UPDATE "attendance" SET duration_minutes = duration_minutes / 2
WHERE session_type = 'afternoon1' AND duration_minutes IS NOT NULL;

-- absence_reasons 는 attendance 1:1 → 새 afternoon2 행에 맞춰 복제
INSERT INTO "absence_reasons" (attendance_id, reason_type, detail, registered_by, created_at)
SELECT a2.id, r.reason_type, r.detail, r.registered_by, r.created_at
FROM "absence_reasons" r
JOIN "attendance" a1 ON a1.id = r.attendance_id AND a1.session_type = 'afternoon1'
JOIN "attendance" a2 ON a2.student_id = a1.student_id AND a2.date = a1.date AND a2.session_type = 'afternoon2';

INSERT INTO "absence_requests" (student_id, session_type, date, reason_type, detail, status, reviewed_by, reviewed_at, created_at)
SELECT student_id, 'afternoon2', date, reason_type, detail, status, reviewed_by, reviewed_at, created_at
FROM "absence_requests" WHERE session_type = 'afternoon1';

INSERT INTO "attendance_notes" (student_id, session_type, date, note, created_by, created_at, updated_at)
SELECT student_id, 'afternoon2', date, note, created_by, created_at, updated_at
FROM "attendance_notes" WHERE session_type = 'afternoon1';

INSERT INTO "supervisor_assignments" (teacher_id, date, grade, session_type, created_at)
SELECT teacher_id, date, grade, 'afternoon2', created_at
FROM "supervisor_assignments" WHERE session_type = 'afternoon1';
-- supervisor_swap_history 는 기존(afternoon1) 행을 계속 참조한다.
