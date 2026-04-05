import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const sessions = await prisma.studySession.findMany({ include: { rooms: true }, orderBy: [{ grade: "asc" }, { type: "asc" }] });
  for (const s of sessions) {
    console.log(`${s.grade}학년 ${s.type} (${s.name}) - rooms: ${s.rooms.length}`);
    for (const r of s.rooms) console.log(`  ${r.name} ${r.cols}x${r.rows}`);
  }
  const layouts = await prisma.seatLayout.count();
  console.log(`Total seat layouts: ${layouts}`);
  await prisma.$disconnect();
}
main();
