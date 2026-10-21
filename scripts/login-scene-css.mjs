// 로그인 장면 키프레임 생성기 — 12초 루프. 좌표는 src/app/login/LoginScene.tsx 의 SVG 와 맞춘다.
// 사용: node scripts/login-scene-css.mjs > src/app/login/login-scene.module.css
const LOOP = 12; // s
const pct = (t) => `${((t / LOOP) * 100).toFixed(2)}%`;
const deg = (r) => `${((r * 180) / Math.PI).toFixed(2)}deg`;
const RESET = 10.6; // 모든 요소가 처음 상태로 돌아가는 시각

let css = `/* 자동 생성: scripts/login-scene-css.mjs (node scripts/login-scene-css.mjs > src/app/login/login-scene.module.css) — 손으로 고치지 말고 생성기를 수정한다 */\n`;
css += `.scene { --seat-blank: var(--color-seat-blank); --seat-present: var(--color-seat-present); }\n`;

/* ---------- 교사: 태블릿 좌석표 4열 x 3행 (셀 30x22, 간격 6) ---------- */
const COLS = 4, ROWS = 3, CW = 30, CH = 22, GAP = 6;
const seats = [];
for (let i = 0; i < COLS * ROWS; i++) {
  const col = i % COLS, row = Math.floor(i / COLS);
  seats.push({ i, cx: col * (CW + GAP) + CW / 2, cy: row * (CH + GAP) + CH / 2 });
}
const T0 = 1.0, STEP = 0.55, PRESS = 0.2, HOLD = 0.35, REST = { x: 150, y: 100 };
const lastLeave = T0 + STEP * (seats.length - 1) + HOLD;

// 쉬는 동안(태블릿 바깥)에는 투명하게 두어 떠 있는 점으로 보이지 않게 한다
let pk = `@keyframes pointerPath {\n  0%, ${pct(T0 - 0.6)} { transform: translate(${REST.x}px, ${REST.y}px); opacity: 0; }\n`;
seats.forEach(({ i, cx, cy }) => {
  const arrive = T0 + STEP * i;
  pk += `  ${pct(arrive)}, ${pct(arrive + HOLD)} { transform: translate(${cx}px, ${cy}px); opacity: 1; }\n`;
});
pk += `  ${pct(lastLeave + 0.5)}, 100% { transform: translate(${REST.x}px, ${REST.y}px); opacity: 0; }\n}\n`;
css += pk;
css += `.pointer { opacity: 0; transform: translate(${REST.x}px, ${REST.y}px); animation: pointerPath ${LOOP}s cubic-bezier(.4,0,.2,1) infinite; }\n`;

let rk = `@keyframes tapRipple {\n  0% { transform: scale(.4); opacity: 0; }\n`;
seats.forEach(({ i }) => {
  const t = T0 + STEP * i + PRESS;
  rk += `  ${pct(t - 0.02)} { transform: scale(.4); opacity: .8; }\n  ${pct(t + 0.28)} { transform: scale(1.6); opacity: 0; }\n`;
});
rk += `  100% { transform: scale(.4); opacity: 0; }\n}\n`;
css += rk;
css += `.ripple { opacity: 0; transform-box: fill-box; transform-origin: center; animation: tapRipple ${LOOP}s ease-out infinite; }\n`;

// 좌석 색·체크 표시. 기본(정적) 상태는 "출석 완료"라 감속 모션·일시정지에서도 완성된 화면이 보인다.
seats.forEach(({ i }) => {
  const t = T0 + STEP * i + PRESS;
  css += `@keyframes seat${i} { 0%, ${pct(t)} { fill: var(--seat-blank); } ${pct(t + 0.12)}, ${pct(RESET)} { fill: var(--seat-present); } ${pct(RESET + 0.3)}, 100% { fill: var(--seat-blank); } }\n`;
  css += `.seat${i} { fill: var(--seat-present); animation: seat${i} ${LOOP}s linear infinite; }\n`;
  css += `@keyframes check${i} { 0%, ${pct(t)} { opacity: 0; transform: scale(.5); } ${pct(t + 0.18)}, ${pct(RESET)} { opacity: 1; transform: scale(1); } ${pct(RESET + 0.3)}, 100% { opacity: 0; transform: scale(.5); } }\n`;
  css += `.check${i} { transform-box: fill-box; transform-origin: center; animation: check${i} ${LOOP}s cubic-bezier(.34,1.56,.64,1) infinite; }\n`;
});

css += `@keyframes progressFill { 0%, ${pct(T0)} { transform: scaleX(0); } ${pct(lastLeave)}, ${pct(RESET)} { transform: scaleX(1); } ${pct(RESET + 0.3)}, 100% { transform: scaleX(0); } }\n`;
css += `.progress { transform-box: fill-box; transform-origin: left center; animation: progressFill ${LOOP}s linear infinite; }\n`;

/* ---------- 학생: 노트 5줄 필기 + 2관절 팔 (역기구학) ---------- */
const LINES = 5, LT0 = 0.6, LDUR = 1.0, LSTEP = 1.35;
const LINE_X0 = 96, LINE_X1 = 136, LINE_Y = [147, 152, 157, 162, 167];
for (let k = 0; k < LINES; k++) {
  const s = LT0 + LSTEP * k, e = s + LDUR;
  css += `@keyframes line${k} { 0%, ${pct(s)} { transform: scaleX(0); } ${pct(e)}, ${pct(RESET)} { transform: scaleX(1); } ${pct(RESET + 0.3)}, 100% { transform: scaleX(0); } }\n`;
  css += `.line${k} { transform-box: fill-box; transform-origin: left center; animation: line${k} ${LOOP}s linear infinite; }\n`;
}

// 어깨 S 에서 손끝(연필 끝) H 까지 상완 L1·전완 L2. LoginScene.tsx 의 상수와 같아야 한다.
const S = { x: 126, y: 131 }, L1 = 24, L2 = 24;
function ik(h) {
  const dx = h.x - S.x, dy = h.y - S.y;
  const d = Math.min(Math.hypot(dx, dy), L1 + L2 - 0.01);
  const a = Math.atan2(dy, dx);
  const beta = Math.acos((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d));
  const elbowInner = Math.acos((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2));
  // 두 해 중 팔꿈치가 몸 바깥(화면 기준 x 큰 쪽)으로 나가는 해를 고른다
  const cands = [a - beta, a + beta].map((t1) => {
    const ey = S.y + L1 * Math.sin(t1);
    const t2rel = Math.PI - elbowInner; // 전완의 상대 회전 크기
    // 전완 절대각: 손끝으로 향하도록 부호 결정
    const ex = S.x + L1 * Math.cos(t1);
    const t2abs = Math.atan2(h.y - ey, h.x - ex);
    let rel = t2abs - t1;
    while (rel > Math.PI) rel -= 2 * Math.PI;
    while (rel < -Math.PI) rel += 2 * Math.PI;
    return { t1, rel, ex, ey, t2rel };
  });
  return cands.sort((p, q) => q.ex - p.ex)[0];
}
const HAND_REST = { x: 142, y: 158 };
const poses = []; // [time, point]
poses.push([0, HAND_REST]);
for (let k = 0; k < LINES; k++) {
  const s = LT0 + LSTEP * k, e = s + LDUR, y = LINE_Y[k];
  poses.push([s, { x: LINE_X0, y }]);
  for (let q = 1; q <= 3; q++) {
    poses.push([s + (LDUR * q) / 4, { x: LINE_X0 + ((LINE_X1 - LINE_X0) * q) / 4, y: y + (q % 2 ? -0.8 : 0.8) }]);
  }
  poses.push([e, { x: LINE_X1, y }]);
}
const penEnd = LT0 + LSTEP * (LINES - 1) + LDUR;
poses.push([penEnd + 0.6, HAND_REST]);
poses.push([RESET, HAND_REST]);
poses.push([LOOP, HAND_REST]);

let ua = `@keyframes upperArm {\n`, fa = `@keyframes forearm {\n`;
for (const [t, h] of poses) {
  const { t1, rel } = ik(h);
  const p = t >= LOOP ? "100%" : pct(t);
  ua += `  ${p} { transform: rotate(${deg(t1)}); }\n`;
  fa += `  ${p} { transform: rotate(${deg(rel)}); }\n`;
}
ua += `}\n`; fa += `}\n`;
const rest = ik(HAND_REST);
css += ua + fa;
css += `.upperArm { transform-box: fill-box; transform-origin: center; transform: rotate(${deg(rest.t1)}); animation: upperArm ${LOOP}s cubic-bezier(.4,0,.2,1) infinite; }\n`;
css += `.forearm { transform-box: fill-box; transform-origin: center; transform: rotate(${deg(rest.rel)}); animation: forearm ${LOOP}s cubic-bezier(.4,0,.2,1) infinite; }\n`;

/* ---------- 벽시계 초침, 스탠드 불빛 ---------- */
css += `@keyframes clockHand { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }\n`;
css += `.clockHand { transform-box: fill-box; transform-origin: 50% 100%; animation: clockHand ${LOOP}s linear infinite; }\n`;
css += `@keyframes lampGlow { from { opacity: .28; } to { opacity: .5; } }\n`;
css += `.glow { opacity: .4; animation: lampGlow 3.2s ease-in-out infinite alternate; }\n`;

/* ---------- 일시정지·감속 모션: 정지하면 기본(완료) 상태가 보인다 ---------- */
css += `.paused, .paused * { animation-play-state: paused; }\n`;
css += `@media (prefers-reduced-motion: reduce) {\n  .scene, .scene * { animation: none !important; }\n}\n`;

process.stdout.write(css);
