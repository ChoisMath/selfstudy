-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'supervisor', 'homeroom');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('afternoon', 'night');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('unchecked', 'present', 'absent');

-- CreateEnum
CREATE TYPE "ReasonType" AS ENUM ('academy', 'afterschool', 'illness', 'custom');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "students" (
    "id" SERIAL NOT NULL,
    "grade" INTEGER NOT NULL,
    "class_number" INTEGER NOT NULL,
    "student_number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teachers" (
    "id" SERIAL NOT NULL,
    "login_id" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "google_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_roles" (
    "id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "teacher_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homeroom_assignments" (
    "id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "grade" INTEGER NOT NULL,
    "class_number" INTEGER NOT NULL,

    CONSTRAINT "homeroom_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_admin_assignments" (
    "id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "grade" INTEGER NOT NULL,

    CONSTRAINT "sub_admin_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervisor_assignments" (
    "id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "grade" INTEGER NOT NULL,
    "session_type" "SessionType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supervisor_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervisor_swap_history" (
    "id" SERIAL NOT NULL,
    "assignment_id" INTEGER NOT NULL,
    "original_teacher_id" INTEGER NOT NULL,
    "replacement_teacher_id" INTEGER NOT NULL,
    "reason" TEXT,
    "is_cross_grade" BOOLEAN NOT NULL DEFAULT false,
    "swapped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supervisor_swap_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_sessions" (
    "id" SERIAL NOT NULL,
    "type" "SessionType" NOT NULL,
    "grade" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "time_start" TEXT NOT NULL,
    "time_end" TEXT NOT NULL,

    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "cols" INTEGER NOT NULL,
    "rows" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seating_periods" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "grade" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seating_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seat_layouts" (
    "id" SERIAL NOT NULL,
    "period_id" INTEGER NOT NULL,
    "room_id" INTEGER NOT NULL,
    "row_index" INTEGER NOT NULL,
    "col_index" INTEGER NOT NULL,
    "student_id" INTEGER,

    CONSTRAINT "seat_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "session_type" "SessionType" NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'unchecked',
    "checked_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absence_reasons" (
    "id" SERIAL NOT NULL,
    "attendance_id" INTEGER NOT NULL,
    "reason_type" "ReasonType" NOT NULL,
    "detail" TEXT,
    "registered_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "absence_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participation_days" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "session_type" "SessionType" NOT NULL,
    "is_participating" BOOLEAN NOT NULL DEFAULT true,
    "mon" BOOLEAN NOT NULL DEFAULT true,
    "tue" BOOLEAN NOT NULL DEFAULT true,
    "wed" BOOLEAN NOT NULL DEFAULT true,
    "thu" BOOLEAN NOT NULL DEFAULT true,
    "fri" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "participation_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absence_requests" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "session_type" "SessionType" NOT NULL,
    "date" DATE NOT NULL,
    "reason_type" "ReasonType" NOT NULL,
    "detail" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "absence_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "students_name_idx" ON "students"("name");

-- CreateIndex
CREATE UNIQUE INDEX "students_grade_class_number_student_number_key" ON "students"("grade", "class_number", "student_number");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_login_id_key" ON "teachers"("login_id");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_google_id_key" ON "teachers"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_roles_teacher_id_role_key" ON "teacher_roles"("teacher_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "homeroom_assignments_grade_class_number_key" ON "homeroom_assignments"("grade", "class_number");

-- CreateIndex
CREATE UNIQUE INDEX "sub_admin_assignments_teacher_id_grade_key" ON "sub_admin_assignments"("teacher_id", "grade");

-- CreateIndex
CREATE INDEX "supervisor_assignments_teacher_id_date_idx" ON "supervisor_assignments"("teacher_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "supervisor_assignments_date_grade_session_type_key" ON "supervisor_assignments"("date", "grade", "session_type");

-- CreateIndex
CREATE UNIQUE INDEX "study_sessions_type_grade_key" ON "study_sessions"("type", "grade");

-- CreateIndex
CREATE INDEX "seat_layouts_room_id_period_id_idx" ON "seat_layouts"("room_id", "period_id");

-- CreateIndex
CREATE UNIQUE INDEX "seat_layouts_period_id_room_id_row_index_col_index_key" ON "seat_layouts"("period_id", "room_id", "row_index", "col_index");

-- CreateIndex
CREATE INDEX "attendance_date_session_type_idx" ON "attendance"("date", "session_type");

-- CreateIndex
CREATE INDEX "attendance_student_id_date_idx" ON "attendance"("student_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_student_id_session_type_date_key" ON "attendance"("student_id", "session_type", "date");

-- CreateIndex
CREATE UNIQUE INDEX "absence_reasons_attendance_id_key" ON "absence_reasons"("attendance_id");

-- CreateIndex
CREATE UNIQUE INDEX "participation_days_student_id_session_type_key" ON "participation_days"("student_id", "session_type");

-- CreateIndex
CREATE UNIQUE INDEX "absence_requests_student_id_session_type_date_key" ON "absence_requests"("student_id", "session_type", "date");

-- AddForeignKey
ALTER TABLE "teacher_roles" ADD CONSTRAINT "teacher_roles_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homeroom_assignments" ADD CONSTRAINT "homeroom_assignments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_admin_assignments" ADD CONSTRAINT "sub_admin_assignments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisor_assignments" ADD CONSTRAINT "supervisor_assignments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisor_swap_history" ADD CONSTRAINT "supervisor_swap_history_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "supervisor_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisor_swap_history" ADD CONSTRAINT "supervisor_swap_history_original_teacher_id_fkey" FOREIGN KEY ("original_teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisor_swap_history" ADD CONSTRAINT "supervisor_swap_history_replacement_teacher_id_fkey" FOREIGN KEY ("replacement_teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "study_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_layouts" ADD CONSTRAINT "seat_layouts_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "seating_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_layouts" ADD CONSTRAINT "seat_layouts_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_layouts" ADD CONSTRAINT "seat_layouts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_checked_by_fkey" FOREIGN KEY ("checked_by") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absence_reasons" ADD CONSTRAINT "absence_reasons_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absence_reasons" ADD CONSTRAINT "absence_reasons_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participation_days" ADD CONSTRAINT "participation_days_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absence_requests" ADD CONSTRAINT "absence_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absence_requests" ADD CONSTRAINT "absence_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
