import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const PAGE = "student";
const LAYOUT = "src/app/student/layout.tsx";

const page = read(`src/app/help/${PAGE}/page.tsx`);
assert.ok(!page.includes('"use client"'), "안내 페이지는 서버 컴포넌트");
assert.match(page, /import Content from "\.\/content\.mdx"/);
assert.match(page, /<GuideArticle>\s*<Content \/>\s*<\/GuideArticle>/);
assert.match(page, /export const metadata/);

const mdx = read(`src/app/help/${PAGE}/content.mdx`);
for (const block of ["GuideToc", "GuideChapter", "GuideStep", "GuideNotice", "GuideVideo"]) {
  assert.match(mdx, new RegExp(`import \\{[^}]*\\b${block}\\b[^}]*\\} from "@/components/guide/${block}"`), `${block} import`);
}
assert.match(mdx, /<GuideVideo videoKey="student"/, "학생 영상 자리");
assert.equal((mdx.match(/<GuideChapter\b/g) ?? []).length, 3, "챕터 3개");
for (const id of ["check", "apply", "helper"]) {
  assert.match(mdx, new RegExp(`<GuideChapter id="${id}"`), `${id} 챕터`);
  assert.match(mdx, new RegExp(`id: "${id}"`), `${id} 목차 항목`);
}

const images = [...mdx.matchAll(new RegExp(`/guide/${PAGE}/([\\w-]+\\.webp)`, "g"))].map((m) => m[1]);
assert.ok(images.length >= 8, "스틸 이미지를 단계마다 사용");
for (const file of images) assert.ok(existsSync(join(root, "public/guide", PAGE, file)), `이미지 없음: ${file}`);
assert.equal((mdx.match(/<GuideStep\b/g) ?? []).length, 8, "단계 8개");

// 출결기록 스틸에는 O·X·- 를 설명하는 확대 카드가 폰 크롭 밖이라 담기지 않는다 — 본문이 대신 뜻을 적어야 한다.
for (const meaning of [/O는 출석/, /X는 결석/, /줄표는 [^.]*자습하지 않는 날/]) {
  assert.match(mdx, meaning, `출결 표 기호 설명: ${meaning}`);
}

// 금요일 열의 파란·회색 주석 링도 설명이 폰 크롭 밖이라, 본문이 그 표시를 짚어야 오늘 열과 혼동하지 않는다.
assert.match(mdx, /금요일 열에 덧그린 표시/, "참여일정 그림의 주석 표시 설명");

assert.match(mdx, /<GuideNotice\s+tone="yellow"/, "알아 둘 점은 yellow");
for (const item of [
  '["본인 신청", "불참 신청은 되도록 본인이 직접 하고, 어쩔 수 없을 때만 학급 도우미에게 부탁하세요."]',
  '["지난 날짜", "이미 지난 날짜에는 신청할 수 없습니다."]',
  '["취소", "낸 신청은 학생이 취소할 수 없으니 잘못 신청했다면 담임 선생님께 말씀드리세요."]',
]) {
  assert.ok(mdx.includes(item), `GuideNotice 항목 누락: ${item}`);
}

// 스틸 파이프라인은 lossy WebP(VP8)만 만든다. 헤더 뒤 14비트 두 개가 실제 픽셀 크기다.
function pixelSize(file: string) {
  const buf = readFileSync(join(root, "public/guide", PAGE, file));
  assert.equal(buf.toString("ascii", 12, 16), "VP8 ", `${file}: lossy WebP 가 아님`);
  return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
}

const PHONE_STILL = { width: 640, height: 1342 };
const declared = [...mdx.matchAll(new RegExp(`\\{\\s*src: "/guide/${PAGE}/([\\w-]+\\.webp)"([^}]*)\\}`, "g"))];
assert.equal(declared.length, images.length, "모든 이미지가 width·height 를 지정");
for (const [, file, props] of declared) {
  const size = { width: Number(/width: (\d+)/.exec(props)?.[1]), height: Number(/height: (\d+)/.exec(props)?.[1]) };
  assert.deepEqual(size, pixelSize(file), `${file}: 지정한 width·height 가 실제 크기와 다름`);
  // 학생 편 스틸은 전부 폰 크롭이므로 모두 tall 이어야 한다.
  assert.deepEqual(size, PHONE_STILL, `${file}: 폰 스틸 크기가 아님`);
  assert.ok(/tall: true/.test(props), `${file}: 폰 스틸은 tall: true`);
}

assert.match(read(LAYOUT), new RegExp(`<GuideHelpButton href="/help/${PAGE}" />`), "화면 ? 버튼이 안내 페이지를 가리킴");
assert.match(read("src/app/help/content.mdx"), new RegExp(`\\(/help/${PAGE}\\)`), "도움말 허브에서 링크");

console.log(`guide-${PAGE} checks passed`);
