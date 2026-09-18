import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const PAGE = "seats";
// 좌석 편집기는 학년관리 탭 하나이자 관리자 화면에서도 쓰이는 컴포넌트라 ? 버튼이 제목 줄에 붙는다.
const HOST = "src/components/seats/SeatingEditor.tsx";

const page = read(`src/app/help/${PAGE}/page.tsx`);
assert.ok(!page.includes('"use client"'), "안내 페이지는 서버 컴포넌트");
assert.match(page, /import Content from "\.\/content\.mdx"/);
assert.match(page, /<GuideArticle>\s*<Content \/>\s*<\/GuideArticle>/);
assert.match(page, /export const metadata/);

const mdx = read(`src/app/help/${PAGE}/content.mdx`);
for (const block of ["GuideToc", "GuideChapter", "GuideStep", "GuideNotice", "GuideVideo"]) {
  assert.match(mdx, new RegExp(`import \\{[^}]*\\b${block}\\b[^}]*\\} from "@/components/guide/${block}"`), `${block} import`);
}
assert.equal((mdx.match(/<GuideChapter\b/g) ?? []).length, 2, "챕터 2개");
for (const id of ["layout", "print"]) {
  assert.match(mdx, new RegExp(`<GuideChapter id="${id}"`), `${id} 챕터`);
  assert.match(mdx, new RegExp(`id: "${id}"`), `${id} 목차 항목`);
}

const images = [...mdx.matchAll(new RegExp(`/guide/${PAGE}/([\\w-]+\\.webp)`, "g"))].map((m) => m[1]);
assert.equal(images.length, 5, "스틸 5장을 단계마다 사용");
for (const file of images) assert.ok(existsSync(join(root, "public/guide", PAGE, file)), `이미지 없음: ${file}`);
assert.equal((mdx.match(/<GuideStep\b/g) ?? []).length, 5, "단계 5개");

// --- 영상 시작 초: 좌석 장면(SeatsTour)이 시작하는 지점이어야 한다 ---
// GradeAdminGuide 는 TransitionSeries 라 장면 N 의 절대 시작 = 앞 장면 길이 합 - N×TRANSITION_FRAMES.
const VIDEO = "demo-video/src";
const num = (source: string, pattern: RegExp, what: string) => {
  const found = pattern.exec(source)?.[1];
  assert.ok(found, `${what} 을(를) 찾지 못함`);
  return Number(found);
};
const guideTiming = read(`${VIDEO}/guide/timing.ts`);
const fps = num(read(`${VIDEO}/theme.ts`), /export const FPS = (\d+)/, "FPS");
const lead = num(guideTiming, /export const LEAD_FRAMES = (\d+)/, "LEAD_FRAMES");
const tail = num(guideTiming, /export const TAIL_FRAMES = (\d+)/, "TAIL_FRAMES");
const transition = num(read(`${VIDEO}/scenes.ts`), /export const TRANSITION_FRAMES = (\d+)/, "TRANSITION_FRAMES");

const sceneOrder = [...read(`${VIDEO}/grade-admin/scenes.ts`).matchAll(/\{ id: "(\w+)", component:/g)].map((m) => m[1]);
assert.ok(sceneOrder.includes("SeatsTour"), "SeatsTour 장면이 GRADE_ADMIN_SCENES 에 없음");
const durations = JSON.parse(read(`${VIDEO}/grade-admin/narration-durations.json`)) as Record<string, { total: number }>;

let frames = 0;
for (const [index, id] of sceneOrder.entries()) {
  if (id === "SeatsTour") {
    frames -= index * transition;
    break;
  }
  frames += lead + Math.round(durations[id].total * fps) + tail;
}
// 올림이어야 한다 — 내림하면 앞 장면의 마지막 0.5초(페이드 구간)에 착지한다.
const seatsTourStart = Math.ceil(frames / fps);
assert.match(
  mdx,
  new RegExp(`<GuideVideo videoKey="gradeAdmin" start=\\{${seatsTourStart}\\}`),
  `좌석 장면은 ${seatsTourStart}초에 시작한다 (${frames}프레임 / ${fps}fps)`
);

// 앞 그림(03-assign)과 뒤 그림(04-edit)은 두 학생 자리가 서로 바뀐 상태다 — 본문이 짚어야 오해하지 않는다.
// 바뀐 칸은 각 분단 격자의 첫 줄(RoomGrid 는 row 0 을 맨 위에 그린다)이고, 칠판·교탁은 항상 아래쪽이므로
// (ClassroomConfigModal "칠판·교탁은 항상 아래쪽입니다") 그 줄은 앞자리가 아니라 교실 뒷자리다.
assert.match(mdx, /앞 그림과 견주어 보면 1-1반 분단1 맨 윗줄 왼쪽 자리는 김도현에서 장서아로, 분단3 맨 윗줄 왼쪽 자리는 장서아에서 김도현으로 맞바뀌었습니다/, "두 그림의 좌석 교환 비교");
assert.match(mdx, /칠판과 교탁이 아래쪽이므로 두 자리 모두 교실 뒷자리입니다/, "교환된 자리의 앞뒤 방향");
assert.doesNotMatch(mdx, /맨 앞자리/, "격자 첫 줄을 앞자리로 잘못 부름 — 칠판이 아래쪽이라 첫 줄은 뒷자리다");
// 미배정 학생 → 이미 찬 좌석은 교환이 아니라 덮어쓰기다 (SeatingEditor 227-238: targetRoomMap.set 만 하고
// 원래 학생은 어느 좌석에도 없어져 unassignedStudents 로 돌아간다). 4단계의 좌석↔좌석 교환과 헷갈리기 쉽다.
assert.match(mdx, /이미 다른 학생이 앉아 있는 좌석에 놓으면 두 자리가 맞바뀌는 것이 아니라, 원래 앉아 있던 학생이 미배정 목록으로 돌아갑니다/, "미배정→찬 좌석 드롭의 결과");
// 미배정 목록은 참여 설정 기준이고 오후·야간 기준이 다르다 (src/lib/seats/seat-participation.ts)
assert.match(mdx, /오후는 오후1이나 오후2 중 하나라도 참가하는 학생, 야간은 야간에 참가하는 학생입니다/, "미배정 목록의 오후·야간 기준");
// 좌석 변경은 dirty 상태로만 남고 저장에서 POST 된다 (SeatingEditor.handleSave)
assert.match(mdx, /여기까지는 화면에서만 바뀐 상태이고 저장을 눌러야 반영되며/, "저장을 눌러야 반영");
// 인쇄 미리보기는 API 가 준 저장본만 그린다 (seats/print/page.tsx)
assert.match(mdx, /미리보기에는 저장한 배치만 나오므로/, "인쇄는 저장한 배치만");
// 분단형은 2열이라 좌석 수가 행 수의 두 배다 (COLS_BY_LAYOUT)
assert.match(mdx, /두 명씩 짝으로 앉는 분단형과 한 명씩 앉는 단독형/, "분단형·단독형 뜻");
assert.match(mdx, /3분단에 분단마다 3행이라 짝 좌석까지 세어 총 18석/, "미리보기 좌석 수 계산");
// 교실 구조 설정 버튼은 오후 세션에서만 렌더된다 (SeatingEditor: sessionType === "afternoon")
assert.match(mdx, /교실 구조 설정 버튼은 오후 자율학습에서만 보입니다/, "구조 설정은 오후 전용");

assert.match(mdx, /<GuideNotice\s+tone="yellow"/, "알아 둘 점은 yellow");
for (const item of [
  '["구조 변경", "이미 학생이 배정된 반의 책상 구조를 바꾸거나 교실을 삭제하면 그 반 좌석이 초기화됩니다. 확인 창이 먼저 뜹니다."]',
  '["저장 후 출력", "인쇄 미리보기에는 저장한 배치만 나옵니다. 출력 전에 저장을 먼저 누르세요."]',
  '["미배정 목록", "참여 설정에서 참가로 되어 있는 학생만 나옵니다. 빠진 학생이 있으면 참여 설정을 먼저 확인하세요."]',
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
  // 좌석 편은 전부 PC 브라우저 크롭이라 폰 스틸(tall)이 하나도 없어야 한다.
  assert.deepEqual(size, BROWSER_STILL, `${file}: 브라우저 스틸 크기가 아님`);
  assert.doesNotMatch(props, /tall/, `${file}: 가로 스틸에 tall 이 붙음`);
}

// 제목 줄은 버튼 라벨이 길어 좁은 화면에서 줄을 접어야 ? 버튼이 화면 밖으로 밀리지 않는다.
const host = read(HOST);
assert.match(host, /<GuideHelpButton href="\/help\/seats" \/>/, "좌석 편집기 ? 버튼이 안내 페이지를 가리킴");
assert.match(
  host,
  /<div className="flex flex-wrap items-center justify-between gap-2 mb-4">\s*<div className="flex items-center gap-1">\s*<h2 [^>]*>좌석 편집<\/h2>\s*<GuideHelpButton/,
  "? 버튼이 '좌석 편집' 제목 바로 옆(줄바꿈 가능한 헤더)에 있지 않음"
);
assert.match(host, /<div className="flex flex-wrap items-center gap-2">/, "헤더 버튼 묶음이 좁은 화면에서 줄을 접지 않음");

assert.match(read("src/app/help/content.mdx"), new RegExp(`\\(/help/${PAGE}\\)`), "도움말 허브에서 링크");

console.log(`guide-${PAGE} checks passed`);
