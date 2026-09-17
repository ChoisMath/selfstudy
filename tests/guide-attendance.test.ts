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

assert.match(read(LAYOUT), new RegExp(`<GuideHelpButton href="/help/${PAGE}" />`), "화면 ? 버튼이 안내 페이지를 가리킴");
assert.match(read("src/app/help/content.mdx"), new RegExp(`\\(/help/${PAGE}\\)`), "도움말 허브에서 링크");

console.log(`guide-${PAGE} checks passed`);
