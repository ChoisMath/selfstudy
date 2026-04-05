-- 활성 기간의 SeatLayout만 보존하기 위한 임시 테이블
CREATE TEMP TABLE active_layouts AS
SELECT sl.room_id, sl.row_index, sl.col_index, sl.student_id
FROM seat_layouts sl
JOIN seating_periods sp ON sl.period_id = sp.id
WHERE sp.is_active = true;

-- 기존 테이블 삭제
DROP TABLE "seat_layouts";
DROP TABLE "seating_periods";

-- 새 seat_layouts 생성 (period_id 없음)
CREATE TABLE "seat_layouts" (
    "id" SERIAL NOT NULL,
    "room_id" INTEGER NOT NULL,
    "row_index" INTEGER NOT NULL,
    "col_index" INTEGER NOT NULL,
    "student_id" INTEGER,
    CONSTRAINT "seat_layouts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "seat_layouts_room_id_row_index_col_index_key" ON "seat_layouts"("room_id", "row_index", "col_index");
CREATE INDEX "seat_layouts_room_id_idx" ON "seat_layouts"("room_id");

ALTER TABLE "seat_layouts" ADD CONSTRAINT "seat_layouts_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "seat_layouts" ADD CONSTRAINT "seat_layouts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 활성 기간 데이터 복원
INSERT INTO seat_layouts (room_id, row_index, col_index, student_id)
SELECT room_id, row_index, col_index, student_id
FROM active_layouts;

DROP TABLE IF EXISTS active_layouts;
