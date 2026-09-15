-- 1. enum
CREATE TYPE "CorridorSide" AS ENUM ('left', 'right');
CREATE TYPE "ClassroomLayoutType" AS ENUM ('division', 'single');

-- 2. classrooms
CREATE TABLE "classrooms" (
  "id" SERIAL NOT NULL,
  "session_id" INTEGER NOT NULL,
  "class_number" INTEGER NOT NULL,
  "corridor_side" "CorridorSide" NOT NULL DEFAULT 'right',
  "layout_type" "ClassroomLayoutType" NOT NULL DEFAULT 'division',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "classrooms_session_id_class_number_key" ON "classrooms"("session_id", "class_number");
CREATE INDEX "classrooms_session_id_sort_order_idx" ON "classrooms"("session_id", "sort_order");
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "study_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. rooms.classroom_id
ALTER TABLE "rooms" ADD COLUMN "classroom_id" INTEGER;
CREATE INDEX "rooms_classroom_id_idx" ON "rooms"("classroom_id");
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. 백필: 기존 시드 이름 "N-M반 분단K" 인 오후 Room 을 학급으로 묶는다 (좌석 배정은 그대로)
INSERT INTO "classrooms" ("session_id", "class_number", "sort_order")
SELECT DISTINCT
  r."session_id",
  (regexp_match(r."name", '^[0-9]+-([0-9]+)반 분단[0-9]+$'))[1]::integer,
  (regexp_match(r."name", '^[0-9]+-([0-9]+)반 분단[0-9]+$'))[1]::integer
FROM "rooms" r
JOIN "study_sessions" s ON s."id" = r."session_id"
WHERE s."type" = 'afternoon'
  AND r."name" ~ '^[0-9]+-[0-9]+반 분단[0-9]+$';

UPDATE "rooms" r SET "classroom_id" = c."id"
FROM "classrooms" c
JOIN "study_sessions" s ON s."id" = c."session_id"
WHERE r."session_id" = c."session_id"
  AND s."type" = 'afternoon'
  AND r."name" ~ '^[0-9]+-[0-9]+반 분단[0-9]+$'
  AND c."class_number" = (regexp_match(r."name", '^[0-9]+-([0-9]+)반 분단[0-9]+$'))[1]::integer;
