import { PrismaClient, Role, SessionType } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // ==================== 기존 데이터 삭제 ====================
  console.log("Clearing existing data...");
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE absence_reasons, attendance, absence_requests,
      participation_days, seat_layouts, supervisor_swap_history,
      supervisor_assignments, homeroom_assignments, sub_admin_assignments,
      teacher_roles, rooms, study_sessions, students, teachers
    CASCADE
  `);
  console.log("Existing data cleared.");

  // ==================== 교사 ====================
  const passwordHash = await bcrypt.hash("admin1234", 12);

  const adminTeacher = await prisma.teacher.create({
    data: {
      loginId: "admin",
      passwordHash,
      name: "관리자",
      roles: { create: [{ role: Role.admin }] },
    },
  });

  // 감독교사 + 담임교사 (학년별)
  const teachers: { loginId: string; name: string; roles: Role[]; grade: number; classNumber: number }[] = [
    // 1학년
    { loginId: "teacher1-1", name: "김영희", roles: [Role.homeroom, Role.supervisor], grade: 1, classNumber: 1 },
    { loginId: "teacher1-2", name: "이철수", roles: [Role.homeroom, Role.supervisor], grade: 1, classNumber: 2 },
    { loginId: "teacher1-3", name: "박미영", roles: [Role.homeroom], grade: 1, classNumber: 3 },
    // 2학년
    { loginId: "teacher2-1", name: "정수진", roles: [Role.homeroom, Role.supervisor], grade: 2, classNumber: 1 },
    { loginId: "teacher2-2", name: "홍길동", roles: [Role.homeroom, Role.supervisor], grade: 2, classNumber: 2 },
    { loginId: "teacher2-3", name: "최민수", roles: [Role.homeroom], grade: 2, classNumber: 3 },
    // 3학년
    { loginId: "teacher3-1", name: "강지영", roles: [Role.homeroom, Role.supervisor], grade: 3, classNumber: 1 },
    { loginId: "teacher3-2", name: "윤서준", roles: [Role.homeroom, Role.supervisor], grade: 3, classNumber: 2 },
    { loginId: "teacher3-3", name: "임하늘", roles: [Role.homeroom], grade: 3, classNumber: 3 },
  ];

  for (const t of teachers) {
    const hash = await bcrypt.hash("pass1234", 12);
    await prisma.teacher.create({
      data: {
        loginId: t.loginId,
        passwordHash: hash,
        name: t.name,
        roles: { create: t.roles.map((r) => ({ role: r })) },
        homeroomAssignments: {
          create: [{ grade: t.grade, classNumber: t.classNumber }],
        },
      },
    });
  }

  // 서브관리자 배정: 각 학년 첫 번째 교사
  const subAdminTeachers = await prisma.teacher.findMany({
    where: { loginId: { in: ["teacher1-1", "teacher2-1", "teacher3-1"] } },
  });
  for (const sa of subAdminTeachers) {
    const grade = parseInt(sa.loginId.charAt(7));
    await prisma.subAdminAssignment.create({
      data: { teacherId: sa.id, grade },
    });
  }

  // ==================== 학생 ====================
  const studentNames = [
    ["김서현", "이지우", "박준호", "최하영", "정민서", "강다은", "윤태현", "임수빈", "한소율", "조은별"],
    ["송예진", "장하준", "오시연", "배도윤", "권나윤", "서지민", "류현서", "남채원", "문지후", "황수아"],
    ["신하린", "전도현", "양서윤", "구예준", "노지안", "하민준", "봉유진", "피서연", "진수현", "맹지원"],
  ];

  for (let grade = 1; grade <= 3; grade++) {
    for (let cls = 1; cls <= 3; cls++) {
      const nameSet = studentNames[(grade - 1 + cls - 1) % 3];
      for (let num = 1; num <= 10; num++) {
        const name = nameSet[num - 1];
        const student = await prisma.student.create({
          data: {
            grade,
            classNumber: cls,
            studentNumber: num,
            name,
          },
        });

        // 참여 설정 (기본: 오후 전원 참여, 야간은 일부만)
        await prisma.participationDay.create({
          data: {
            studentId: student.id,
            sessionType: SessionType.afternoon,
            isParticipating: true,
            mon: true, tue: true, wed: true, thu: true, fri: true,
          },
        });

        // 야간: 짝수번 학생만 참여, 월수금만
        const nightParticipating = num % 2 === 0;
        await prisma.participationDay.create({
          data: {
            studentId: student.id,
            sessionType: SessionType.night,
            isParticipating: nightParticipating,
            mon: true, tue: false, wed: true, thu: false, fri: true,
          },
        });
      }
    }
  }

  // ==================== 자습 공간 (실제 도면 기반) ====================
  // 오후자습: 자율관 교실 (16:30-18:20)
  // 야간자습: 미래홀 (19:20-21:00)
  for (let grade = 1; grade <= 3; grade++) {
    // 오후 자습 세션 + 교실 3개 (실제 도면: X-4반, X-5반, X-6반 교실)
    const afternoonSession = await prisma.studySession.create({
      data: {
        type: SessionType.afternoon,
        grade,
        name: `자율관: 교실`,
        timeStart: "16:30",
        timeEnd: "18:20",
      },
    });

    // 실제 도면: 각 반에 분단 3개(2열×3행=6석씩), 반당 18석, 총 54석
    const afternoonRooms = [
      { name: `${grade}-4반 분단1`, cols: 2, rows: 3, sortOrder: 1 },
      { name: `${grade}-4반 분단2`, cols: 2, rows: 3, sortOrder: 2 },
      { name: `${grade}-4반 분단3`, cols: 2, rows: 3, sortOrder: 3 },
      { name: `${grade}-5반 분단1`, cols: 2, rows: 3, sortOrder: 4 },
      { name: `${grade}-5반 분단2`, cols: 2, rows: 3, sortOrder: 5 },
      { name: `${grade}-5반 분단3`, cols: 2, rows: 3, sortOrder: 6 },
      { name: `${grade}-6반 분단1`, cols: 2, rows: 3, sortOrder: 7 },
      { name: `${grade}-6반 분단2`, cols: 2, rows: 3, sortOrder: 8 },
      { name: `${grade}-6반 분단3`, cols: 2, rows: 3, sortOrder: 9 },
    ];

    for (const room of afternoonRooms) {
      await prisma.room.create({
        data: { sessionId: afternoonSession.id, ...room },
      });
    }

    // 2학년: 오후 미래혜윰실 추가 (5열×2행 분단)
    if (grade === 2) {
      const afternoonMiraeRooms = [
        { name: "오후미래혜윰1 분단1", cols: 5, rows: 2, sortOrder: 10 },
        { name: "오후미래혜윰1 분단2", cols: 5, rows: 2, sortOrder: 11 },
        { name: "오후미래혜윰2 분단1", cols: 5, rows: 2, sortOrder: 12 },
        { name: "오후미래혜윰2 분단2", cols: 5, rows: 2, sortOrder: 13 },
        { name: "오후미래혜윰2 분단3", cols: 5, rows: 2, sortOrder: 14 },
      ];
      for (const room of afternoonMiraeRooms) {
        await prisma.room.create({
          data: { sessionId: afternoonSession.id, ...room },
        });
      }
    }

    // 야간 자습 세션 + 미래홀 방 5개 (실제 도면 기반)
    const nightSession = await prisma.studySession.create({
      data: {
        type: SessionType.night,
        grade,
        name: `미래홀`,
        timeStart: "19:20",
        timeEnd: "21:00",
      },
    });

    // 도면 기준 미래홀 방 구성 (2학년은 복도석 추가)
    const nightRooms = [
      ...(grade === 2 ? [{ name: "복도석", cols: 1, rows: 12, sortOrder: 0 }] : []),
      { name: "미래혜윰실2", cols: 5, rows: 4, sortOrder: 1 },   // 20석
      { name: "미래202", cols: 3, rows: 2, sortOrder: 2 },        // 6석
      { name: "미래아띠존", cols: 4, rows: 2, sortOrder: 3 },     // 8석
      { name: "미래201", cols: 3, rows: 2, sortOrder: 4 },        // 6석
      { name: "미래혜윰실1", cols: 5, rows: 10, sortOrder: 5 },   // 50석
    ];

    for (const room of nightRooms) {
      await prisma.room.create({
        data: { sessionId: nightSession.id, ...room },
      });
    }
  }

  // ==================== 좌석 배치 ====================
  for (let grade = 1; grade <= 3; grade++) {
    // 오후 교실별 좌석 배치
    const rooms = await prisma.room.findMany({
      where: { session: { grade, type: SessionType.afternoon } },
      orderBy: { sortOrder: "asc" },
    });

    // 반별로 분단 3개씩 그룹화하여 학생 배정
    // sortOrder 1-3 → 4반, 4-6 → 5반, 7-9 → 6반
    const classRooms = new Map<number, typeof rooms>();
    for (const room of rooms) {
      const classNumber = Math.floor((room.sortOrder - 1) / 3) + 4;
      if (!classRooms.has(classNumber)) classRooms.set(classNumber, []);
      classRooms.get(classNumber)!.push(room);
    }

    for (const [classNumber, cRooms] of classRooms) {
      const students = await prisma.student.findMany({
        where: { grade, classNumber },
        orderBy: { studentNumber: "asc" },
      });

      let idx = 0;
      for (const room of cRooms) {
        for (let row = 0; row < room.rows && idx < students.length; row++) {
          for (let col = 0; col < room.cols && idx < students.length; col++) {
            await prisma.seatLayout.create({
              data: {
                roomId: room.id,
                rowIndex: row,
                colIndex: col,
                studentId: students[idx].id,
              },
            });
            idx++;
          }
        }
      }
    }
  }

  // ==================== 감독 배정 (이번 주) ====================
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const supervisorTeachers = await prisma.teacher.findMany({
    where: { roles: { some: { role: Role.supervisor } } },
    include: { homeroomAssignments: true },
  });

  for (let d = 0; d < 5; d++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + d);

    for (let grade = 1; grade <= 3; grade++) {
      const gradeTeachers = supervisorTeachers.filter(
        (t) => t.homeroomAssignments.some((h) => h.grade === grade)
      );
      if (gradeTeachers.length === 0) continue;
      const teacher = gradeTeachers[d % gradeTeachers.length];

      for (const sessionType of [SessionType.afternoon, SessionType.night]) {
        await prisma.supervisorAssignment.create({
          data: {
            teacherId: teacher.id,
            date,
            grade,
            sessionType,
          },
        });
      }
    }
  }

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
