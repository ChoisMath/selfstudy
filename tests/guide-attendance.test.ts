import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const PAGE = "attendance";
const LAYOUT = "src/app/attendance/layout.tsx";

const page = read(`src/app/help/${PAGE}/page.tsx`);
assert.ok(!page.includes('"use client"'), "안내 페이지는 서버 컴포넌트");
assert.match(page, /import Content from "\.\/content\.mdx"/);
assert.match(page, /<GuideArticle>\s*<Content \/>\s*<\/GuideArticle>/);
assert.match(page, /export const metadata/);

const mdx = read(`src/app/help/${PAGE}/content.mdx`);
for (const block of ["GuideToc", "GuideChapter", "GuideStep", "GuideNotice", "GuideVideo"]) {
  assert.match(mdx, new RegExp(`import \\{[^}]*\\b${block}\\b[^}]*\\} from "@/components/guide/${block}"`), `${block} import`);
}
const images = [...mdx.matchAll(new RegExp(`/guide/${PAGE}/([\\w-]+\\.webp)`, "g"))].map((m) => m[1]);
assert.ok(images.length >= 9, "스틸 이미지를 단계마다 사용");
for (const file of images) assert.ok(existsSync(join(root, "public/guide", PAGE, file)), `이미지 없음: ${file}`);
assert.ok((mdx.match(/<GuideStep\b/g) ?? []).length <= 9, "단계 9개 이하");

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
  const isPhone = size.width === PHONE_STILL.width && size.height === PHONE_STILL.height;
  assert.equal(/tall: true/.test(props), isPhone, `${file}: tall 은 폰 스틸에만`);
}

assert.match(read(LAYOUT), new RegExp(`<GuideHelpButton href="/help/${PAGE}" />`), "화면 ? 버튼이 안내 페이지를 가리킴");
assert.match(read("src/app/help/content.mdx"), new RegExp(`\\(/help/${PAGE}\\)`), "도움말 허브에서 링크");

console.log(`guide-${PAGE} checks passed`);
