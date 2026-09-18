import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const PAGE = "grade-admin";
// ? 버튼은 레이아웃이 아니라 탭 줄에 있다 — 탭 6개가 클라이언트 상태로 전환되는 화면이라 레이아웃이 어느 탭인지 모른다.
const HOST = "src/app/grade-admin/[grade]/page.tsx";

const page = read(`src/app/help/${PAGE}/page.tsx`);
assert.ok(!page.includes('"use client"'), "안내 페이지는 서버 컴포넌트");
assert.match(page, /import Content from "\.\/content\.mdx"/);
assert.match(page, /<GuideArticle>\s*<Content \/>\s*<\/GuideArticle>/);
assert.match(page, /export const metadata/);

const mdx = read(`src/app/help/${PAGE}/content.mdx`);
for (const block of ["GuideToc", "GuideChapter", "GuideStep", "GuideNotice", "GuideVideo"]) {
  assert.match(mdx, new RegExp(`import \\{[^}]*\\b${block}\\b[^}]*\\} from "@/components/guide/${block}"`), `${block} import`);
}
assert.match(mdx, /<GuideVideo videoKey="gradeAdmin"/, "학년관리자 영상 자리");
assert.equal((mdx.match(/<GuideChapter\b/g) ?? []).length, 3, "챕터 3개");
for (const id of ["status", "roster", "operation"]) {
  assert.match(mdx, new RegExp(`<GuideChapter id="${id}"`), `${id} 챕터`);
  assert.match(mdx, new RegExp(`id: "${id}"`), `${id} 목차 항목`);
}

const images = [...mdx.matchAll(new RegExp(`/guide/${PAGE}/([\\w-]+\\.webp)`, "g"))].map((m) => m[1]);
assert.equal(images.length, 9, "스틸 9장을 단계마다 사용");
for (const file of images) assert.ok(existsSync(join(root, "public/guide", PAGE, file)), `이미지 없음: ${file}`);
assert.equal((mdx.match(/<GuideStep\b/g) ?? []).length, 9, "단계 9개");

// 화면만 봐서는 알 수 없고 잘못 알면 데이터를 잃는 동작 — 본문이 반드시 적어야 한다.
// Excel 재업로드는 같은 반·번호라도 기존 학생을 비활성화하고 새 레코드를 만든다
// (src/app/api/grade-admin/[grade]/students/bulk-upload/route.ts: isActive:false + createMany).
// 새 Student.id 라 prisma/schema.prisma 의 Student 관계 다섯 개(seatLayouts·attendances·
// participationDays·absenceRequests·attendanceNotes)와 isHelper 가 전부 새 학생을 따라오지 않는다.
// 손실 범위를 좁게 쓰면 학기 중 재업로드를 안전한 일로 오해하게 되므로 여섯 가지를 모두 적어야 한다.
assert.match(mdx, /이름까지 같더라도 기존 학생이 비활성으로 물러나고 그 자리에 전혀 다른 학생이 새로 등록됩니다/, "Excel 재업로드가 새 학생을 만든다는 설명");
const LOST_ON_REUPLOAD = ["출결 기록", "참여 설정", "좌석 배정", "불참 신청", "출석 비고", "도우미 지정"];
const lossSentence = /그러면 그 학생의 ([^.]+?)이 모두 새 학생으로 따라오지 않고/.exec(mdx)?.[1];
assert.ok(lossSentence, "재업로드로 무엇이 끊기는지 열거한 문장이 없음");
for (const lost of LOST_ON_REUPLOAD) {
  assert.ok(lossSentence.includes(lost), `Excel 재업로드 손실 목록에 빠짐: ${lost}`);
}
assert.match(mdx, /월간출결이 통째로 줄표로 바뀌고/, "학기 중 재업로드의 결과(월간출결이 빈다)");
// GuideNotice 도 같은 여섯 가지를 담아야 한다 — 요약만 읽고 넘어가는 독자가 범위를 좁게 알면 안 된다.
const reuploadNotice = /\["Excel 재업로드", "([^"]+)"\]/.exec(mdx)?.[1];
assert.ok(reuploadNotice, "Excel 재업로드 GuideNotice 항목이 없음");
for (const lost of LOST_ON_REUPLOAD) {
  assert.ok(reuploadNotice.includes(lost), `GuideNotice 손실 목록에 빠짐: ${lost}`);
}
assert.match(reuploadNotice, /학기 중에는 쓰지 말고/, "GuideNotice 가 학기 중 사용을 말리지 않음");
// 삭제는 레코드 삭제가 아니라 비활성 (StudentManagement.handleDelete → PUT/DELETE isActive)
assert.match(mdx, /삭제를 누르면 학생이 지워지는 것이 아니라 상태가 비활성으로 바뀌며/, "삭제=비활성 설명");
// isHelper 는 로그인 때 JWT 에 담긴다 (src/lib/auth.ts) — 지정 즉시 학생 화면에 탭이 생기지 않는다
assert.match(mdx, /다시 로그인하면 학생 화면에 일괄신청 탭이 생겨/, "도우미는 재로그인 후 반영");
// 참여 설정은 저장 버튼이 없다 (ParticipationManagement.handleUpdate 가 onChange 에서 바로 PUT)
assert.match(mdx, /모두 누르는 즉시 저장되고/, "참여 설정 즉시 저장");
// 감독 배정 POST 는 세 블록을 한꺼번에 만든다 (MonthlyCalendar.handleAssign)
assert.match(mdx, /한 번 배정하면 그날 오후1, 오후2, 야간 감독이 모두 그 선생님으로 정해지고/, "감독 1회 배정 = 그날 세 시간");
assert.match(mdx, /교체는 각 선생님이 감독일정 화면에서 직접 합니다/, "교체는 감독일정 화면");
// 월간출결 범례는 스틸에 작게만 담겨 본문이 여섯 기호를 모두 풀어써야 한다 (GradeMonthlyAttendance 범례)
for (const meaning of [
  /O는 출석/,
  /X는 무단결석/,
  /△는 사유결석/,
  /방은 방과후/,
  /줄표는 미확인/,
  /회색 칸은 그 시간에 참여하지 않는 미참가/,
]) {
  assert.match(mdx, meaning, `월간출결 범례 설명: ${meaning}`);
}

assert.match(mdx, /<GuideNotice\s+tone="yellow"/, "알아 둘 점은 yellow");
for (const item of [
  '["Excel 재업로드", "반과 번호가 같으면 새 학생으로 등록되어 출결 기록과 참여 설정, 좌석 배정, 불참 신청, 출석 비고, 도우미 지정이 모두 끊깁니다. 학기 중에는 쓰지 말고 학기 초 명단 등록에만 사용하세요."]',
  '["즉시 저장", "도우미 지정과 참여 설정에는 저장 버튼이 없습니다. 누르는 즉시 저장됩니다."]',
  '["도우미 반영", "도우미로 지정한 학생은 다시 로그인해야 일괄신청 탭이 보입니다."]',
]) {
  assert.ok(mdx.includes(item), `GuideNotice 항목 누락: ${item}`);
}

// 스틸 파이프라인은 lossy WebP(VP8)만 만든다. 헤더 뒤 14비트 두 개가 실제 픽셀 크기다.
function pixelSize(file: string) {
  const buf = readFileSync(join(root, "public/guide", PAGE, file));
  assert.equal(buf.toString("ascii", 12, 16), "VP8 ", `${file}: lossy WebP 가 아님`);
  return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
}

const BROWSER_STILL = { width: 1280, height: 657 };
const declared = [...mdx.matchAll(new RegExp(`\\{\\s*src: "/guide/${PAGE}/([\\w-]+\\.webp)"([^}]*)\\}`, "g"))];
assert.equal(declared.length, images.length, "모든 이미지가 width·height 를 지정");
for (const [, file, props] of declared) {
  const size = { width: Number(/width: (\d+)/.exec(props)?.[1]), height: Number(/height: (\d+)/.exec(props)?.[1]) };
  assert.deepEqual(size, pixelSize(file), `${file}: 지정한 width·height 가 실제 크기와 다름`);
  // 학년관리자 편은 전부 PC 브라우저 크롭이라 폰 스틸(tall)이 하나도 없어야 한다.
  assert.deepEqual(size, BROWSER_STILL, `${file}: 브라우저 스틸 크기가 아님`);
  assert.doesNotMatch(props, /tall/, `${file}: 가로 스틸에 tall 이 붙음`);
}

// ? 버튼은 스크롤되는 탭 줄 바깥에 있어야 좁은 화면에서도 화면 안에 남는다.
const host = read(HOST);
assert.match(host, /<GuideHelpButton href="\/help\/grade-admin" \/>/, "학년관리 화면 ? 버튼이 안내 페이지를 가리킴");
assert.match(
  host,
  /<div className="flex border-b border-gray-200 mb-3">\s*<div className="flex min-w-0 flex-1 overflow-x-auto">/,
  "탭 줄이 ? 버튼을 밖에 둔 채 탭만 가로 스크롤하지 않음"
);
assert.match(read("src/app/help/content.mdx"), new RegExp(`\\(/help/${PAGE}\\)`), "도움말 허브에서 링크");

console.log(`guide-${PAGE} checks passed`);
