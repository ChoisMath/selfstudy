import { PrismaClient, SessionType } from "../../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== 2학년 오후자습 미래혜윰실 추가 ===\n");

  // 2학년 오후자습 세션 찾기
  const session = await prisma.studySession.findUnique({
    where: { type_grade: { type: SessionType.afternoon, grade: 2 } },
  });
  if (!session) {
    console.error("2학년 오후자습 세션을 찾을 수 없습니다.");
    process.exit(1);
  }
  console.log(`세션 발견: id=${session.id}, name=${session.name}`);

  // 이미 존재하는지 확인
  const existing = await prisma.room.findFirst({
    where: { sessionId: session.id, name: { startsWith: "오후미래혜윰" } },
  });
  if (existing) {
    console.log("이미 오후미래혜윰 방이 존재합니다. 스킵합니다.");
    await prisma.$disconnect();
    return;
  }

  // 5개 방 추가
  const newRooms = [
    { name: "오후미래혜윰1 분단1", cols: 5, rows: 2, sortOrder: 10 },
    { name: "오후미래혜윰1 분단2", cols: 5, rows: 2, sortOrder: 11 },
    { name: "오후미래혜윰2 분단1", cols: 5, rows: 2, sortOrder: 12 },
    { name: "오후미래혜윰2 분단2", cols: 5, rows: 2, sortOrder: 13 },
    { name: "오후미래혜윰2 분단3", cols: 5, rows: 2, sortOrder: 14 },
  ];

  for (const room of newRooms) {
    const created = await prisma.room.create({
      data: { sessionId: session.id, ...room },
    });
    console.log(`  생성: ${room.name} (id=${created.id}, ${room.cols}×${room.rows})`);
  }

  console.log("\n완료: 5개 방 추가 (총 50석)");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
