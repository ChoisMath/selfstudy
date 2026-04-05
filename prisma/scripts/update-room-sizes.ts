import { PrismaClient, SessionType } from "../../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== Room Size Migration ===\n");

  // Part 1: 오후 교실 → 분단 9개로 변경 (기존 3개 방 삭제 → 새 9개 방 생성)
  console.log("Part 1: 오후 자습 교실 구조 변경...");

  for (let grade = 1; grade <= 3; grade++) {
    const session = await prisma.studySession.findUnique({
      where: { type_grade: { type: SessionType.afternoon, grade } },
    });
    if (!session) {
      console.log(`  Grade ${grade} afternoon session not found, skipping.`);
      continue;
    }

    // 기존 방의 좌석 삭제 + 방 삭제
    const oldRooms = await prisma.room.findMany({
      where: { sessionId: session.id },
    });
    for (const room of oldRooms) {
      await prisma.seatLayout.deleteMany({ where: { roomId: room.id } });
      await prisma.room.delete({ where: { id: room.id } });
    }
    console.log(`  Grade ${grade}: ${oldRooms.length}개 기존 방 삭제`);

    // 새 9개 방 생성 (각 반에 분단 3개씩)
    const newRooms = [
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

    for (const room of newRooms) {
      await prisma.room.create({
        data: { sessionId: session.id, ...room },
      });
    }
    console.log(`  Grade ${grade}: ${newRooms.length}개 새 방 생성 완료`);
  }

  // Part 2: 야간 방 이름 변경 + 크기 수정
  console.log("\nPart 2: 야간 미래홀 방 이름/크기 변경...");

  // 미래예술실2 → 미래혜윰실2 (cols: 5, rows: 4)
  const updated1 = await prisma.room.updateMany({
    where: { name: "미래예술실2" },
    data: { name: "미래혜윰실2", cols: 5, rows: 4 },
  });
  console.log(`  미래예술실2 → 미래혜윰실2 (5×4): ${updated1.count}개 업데이트`);

  // 미래혜윰실2: row_index >= 4인 좌석 삭제 (rows 5→4)
  const hyeyum2Rooms = await prisma.room.findMany({
    where: { name: "미래혜윰실2" },
  });
  for (const room of hyeyum2Rooms) {
    const deleted = await prisma.seatLayout.deleteMany({
      where: { roomId: room.id, rowIndex: { gte: 4 } },
    });
    if (deleted.count > 0) {
      console.log(`  미래혜윰실2 (id: ${room.id}): ${deleted.count}개 범위 밖 좌석 삭제`);
    }
  }

  // 미래예술실1 → 미래혜윰실1
  const updated2 = await prisma.room.updateMany({
    where: { name: "미래예술실1" },
    data: { name: "미래혜윰실1" },
  });
  console.log(`  미래예술실1 → 미래혜윰실1: ${updated2.count}개 업데이트`);

  // Part 3: 2학년 야간에 복도석 추가
  console.log("\nPart 3: 2학년 야간 복도석 추가...");

  const nightSession2 = await prisma.studySession.findUnique({
    where: { type_grade: { type: SessionType.night, grade: 2 } },
  });

  if (nightSession2) {
    const existing = await prisma.room.findFirst({
      where: { sessionId: nightSession2.id, name: "복도석" },
    });
    if (existing) {
      console.log("  복도석 이미 존재, 건너뜀");
    } else {
      await prisma.room.create({
        data: {
          sessionId: nightSession2.id,
          name: "복도석",
          cols: 1,
          rows: 12,
          sortOrder: 0,
        },
      });
      console.log("  복도석 (1×12) 생성 완료");
    }
  } else {
    console.log("  2학년 야간 세션을 찾을 수 없음");
  }

  console.log("\n=== Migration Complete ===");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
