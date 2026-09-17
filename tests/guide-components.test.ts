import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const GUIDE = "src/components/guide";

for (const name of ["GuideArticle", "GuideToc", "GuideChapter", "GuideStep", "GuideNotice", "GuideVideo", "GuideHelpButton"]) {
  const path = `${GUIDE}/${name}.tsx`;
  assert.ok(existsSync(join(root, path)), `${path} 없음`);
  const source = read(path);
  assert.ok(!source.includes('"use client"'), `${name}: MDX 서버 렌더와 클라이언트 레이아웃 양쪽에서 쓰므로 "use client" 금지`);
  assert.doesNotMatch(source, /break-words|break-all/, `${name}: 단어 중간 줄바꿈 금지`);
}

const button = read(`${GUIDE}/GuideHelpButton.tsx`);
assert.match(button, /aria-label="사용 가이드"/);
assert.match(button, /\bmin-h-11\b/);
assert.match(button, /\bmin-w-11\b/);
assert.match(button, /target="_blank"/, "감독 중 출석부·저장 전 좌석 편집을 잃지 않도록 새 탭");
assert.match(button, /rel="noopener"/);

const video = read(`${GUIDE}/GuideVideo.tsx`);
assert.match(video, /if \(!video\.id\) return null;/, "id 가 빈 영상은 카드를 그리지 않음");
assert.match(video, /youtube-nocookie\.com\/embed\//);

const step = read(`${GUIDE}/GuideStep.tsx`);
assert.match(step, /whitespace-nowrap/);
assert.match(step, /break-keep/);
assert.match(step, /unoptimized/, "스틸은 이미 1280px WebP 로 최적화됨");

const toc = read(`${GUIDE}/GuideToc.tsx`);
assert.match(toc, /href=\{`#guide-\$\{item\.id\}`\}/);
assert.match(toc, /\bmin-h-11\b/);
assert.match(read(`${GUIDE}/GuideChapter.tsx`), /id=\{`guide-\$\{id\}`\}/);

const videos = read(`${GUIDE}/videos.ts`);
for (const key of ["teacher", "student", "gradeAdmin"]) assert.match(videos, new RegExp(`\\b${key}: \\{ id: "`));

const layout = read("src/app/help/layout.tsx");
assert.match(layout, /min-h-dvh/);
assert.match(layout, /사용설명서/);
assert.match(layout, /px-2/, "모바일 바깥 여백 p-2 이하");

const hub = read("src/app/help/page.tsx");
assert.doesNotMatch(hub, /<header/, "헤더는 help/layout.tsx 로 이동");
assert.match(hub, /<HelpContent\s*\/>/);

// 말줄임 제목은 잘린 원문을 title 로 보여준다(반응형 규칙 §2).
assert.match(read(`${GUIDE}/GuideChapter.tsx`), /<h2 title=\{title\}/);
assert.match(read(`${GUIDE}/GuideStep.tsx`), /<span title=\{title\}/);
assert.match(read(`${GUIDE}/GuideNotice.tsx`), /<h2 title=\{title\}/);
// 폰 스크린샷 3장이 데스크톱 카드 안에 가로 스크롤 없이 들어간다.
assert.match(read(`${GUIDE}/GuideStep.tsx`), /lg:w-\[290px\]/);
// 가로 스틸은 폰 폭으로 줄이면 글자를 읽을 수 없어 최소 폭을 주고 가로 스크롤한다.
assert.match(read(`${GUIDE}/GuideStep.tsx`), /min-w-\[640px\]/);
assert.match(read(`${GUIDE}/GuideStep.tsx`), /w-\[min\(320px,80vw\)\]/);
// 가로 스틸 여러 장은 데스크톱에서는 카드 폭에 맞춰 세로로 쌓고, 모바일에서만 가로로 스크롤한다.
assert.match(read(`${GUIDE}/GuideStep.tsx`), /lg:flex-col/);
assert.match(read(`${GUIDE}/GuideStep.tsx`), /lg:overflow-visible/);
assert.match(read(`${GUIDE}/GuideStep.tsx`), /lg:min-w-0/);
// 태블릿 바깥 여백은 8~12px(§1): sm:px-6 을 쓰지 않는다.
assert.doesNotMatch(read("src/app/help/layout.tsx"), /sm:px-6/);

console.log("guide-components checks passed");
