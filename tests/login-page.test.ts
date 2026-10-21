import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

const page = read("../src/app/login/page.tsx");
const scene = read("../src/app/login/LoginScene.tsx");
const sceneCss = read("../src/app/login/login-scene.module.css");
const globals = read("../src/app/globals.css");

// 로그인 기능·로고는 그대로 유지한다
assert.match(page, /from "\.\/actions"/, "서버 액션 import 누락");
assert.match(page, /loginTeacher/, "교사 로그인 액션 미사용");
assert.match(page, /loginStudent/, "학생 로그인 액션 미사용");
assert.match(page, /src="\/posan\.svg"/, "포산고 로고 누락");
for (const name of ['name="loginId"', 'name="password"', 'name="name"', 'name="studentCode"']) {
  assert.match(page, new RegExp(name), `${name} 입력칸 누락 — actions.ts 의 formData 키와 일치해야 함`);
}
assert.match(page, /window\.location\.href = "\/"/, "성공 시 전체 새로고침 이동 누락");

// 접근 가능한 인증: 자동완성·비밀번호 표시 토글·오류 알림·라벨
assert.match(page, /autoComplete="username"/, "아이디 autocomplete 누락");
assert.match(page, /autoComplete="current-password"/, "비밀번호 autocomplete 누락");
assert.match(page, /aria-label=\{showPassword \? "비밀번호 숨기기" : "비밀번호 표시"\}/, "비밀번호 표시 토글 라벨 누락");
assert.match(page, /role="alert"/, "오류 메시지 role=alert 누락");
assert.match(page, /role="tablist"/, "역할 탭 tablist 누락");
assert.match(page, /aria-selected=\{selected\}/, "탭 aria-selected 누락");
assert.match(page, /inputMode="numeric"/, "학번 숫자 키패드 누락");
assert.match(page, /pattern="\[0-9\]\{5\}"/, "학번 5자리 패턴 누락");
assert.doesNotMatch(page, /onPaste/, "붙여넣기를 막으면 안 된다 (WCAG 접근 가능한 인증)");
assert.ok(!/min-h-(?:[0-9]|10)\b/.test(page), "44px 미만 터치 영역 사용");

// 모션그래픽: 일시정지 토글 + 감속 모션 존중, transform/opacity/fill 만 애니메이션
assert.match(page, /<LoginScene paused=\{paused\}/, "장면에 paused 전달 누락");
assert.match(page, /aria-pressed=\{paused\}/, "움직임 멈춤 버튼 aria-pressed 누락");
assert.match(scene, /role="img"/, "장면 SVG role=img 누락");
assert.match(scene, /aria-label="학생이 책상에서/, "장면 설명 aria-label 누락");
assert.match(sceneCss, /@media \(prefers-reduced-motion: reduce\)/, "감속 모션 미디어쿼리 누락");
assert.match(sceneCss, /\.paused, \.paused \* \{ animation-play-state: paused; \}/, "일시정지 규칙 누락");
const animatedProps = new Set<string>();
for (const m of sceneCss.matchAll(/\{([^{}]*)\}/g)) {
  for (const decl of m[1].split(";")) {
    const prop = decl.split(":")[0]?.trim();
    if (prop) animatedProps.add(prop);
  }
}
for (const prop of animatedProps) {
  assert.ok(
    ["transform", "opacity", "fill", "animation", "animation-play-state", "transform-box", "transform-origin", "--seat-blank", "--seat-present"].includes(prop),
    `레이아웃을 흔드는 속성 애니메이션: ${prop}`,
  );
}

// 생성기와 산출물이 일치해야 한다 (손으로 고친 CSS 방지)
const generated = execFileSync(process.execPath, [new URL("../scripts/login-scene-css.mjs", import.meta.url).pathname], {
  encoding: "utf8",
});
assert.equal(sceneCss, generated, "login-scene.module.css 가 생성기 출력과 다름 — node scripts/login-scene-css.mjs 로 재생성");

// 장면 컴포넌트의 좌표 상수가 생성기와 같아야 한다
const gen = read("../scripts/login-scene-css.mjs");
assert.match(gen, /const LINE_X0 = 96, LINE_X1 = 136/);
assert.match(scene, /const LINE_X0 = 96;\s*const LINE_X1 = 136;/);
assert.match(gen, /const S = \{ x: 126, y: 131 \}, L1 = 24, L2 = 24;/);
assert.match(scene, /const SHOULDER = \{ x: 126, y: 131 \};\s*const UPPER_ARM = 24;\s*const FOREARM = 24;/);

// 디자인 토큰은 globals 의 static 테마에 있어야 CSS 모듈·SVG 의 var() 가 항상 해석된다
assert.match(globals, /@theme static \{[^}]*--color-seat-present: #bbf7d0;/, "seat-present 토큰 누락");
assert.match(globals, /--color-navy: #1e3a5f;/, "navy 토큰 누락");

console.log("login-page checks passed");
