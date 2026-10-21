import styles from "./login-scene.module.css";

/**
 * 로그인 화면 모션그래픽 — 왼쪽은 책상에서 필기하는 학생, 오른쪽은 태블릿 좌석표를 눌러 출석을 확인하는 교사.
 * 밝고 따뜻한 톤(크림·피치·민트·하늘)과 둥근 캐릭터로 "자습하러 가고 싶은" 분위기를 낸다.
 * 움직임은 전부 login-scene.module.css(생성기 scripts/login-scene-css.mjs)의 transform/opacity/fill 키프레임이다.
 * 아래 좌표 상수는 생성기와 같아야 한다. prefers-reduced-motion 또는 paused 면 완료 상태의 정지 화면이 보인다.
 */

const SEAT_COLS = 4;
const SEAT_ROWS = 3;
const SEAT_W = 30;
const SEAT_H = 22;
const SEAT_GAP = 6;

const LINE_X0 = 96;
const LINE_X1 = 136;
const LINE_Y = [147, 152, 157, 162, 167];

const SHOULDER = { x: 126, y: 131 };
const UPPER_ARM = 24;
const FOREARM = 24;

const SEATS = Array.from({ length: SEAT_COLS * SEAT_ROWS }, (_, i) => ({
  i,
  x: (i % SEAT_COLS) * (SEAT_W + SEAT_GAP),
  y: Math.floor(i / SEAT_COLS) * (SEAT_H + SEAT_GAP),
}));

const seatClass = (i: number) => styles[`seat${i}` as keyof typeof styles];
const checkClass = (i: number) => styles[`check${i}` as keyof typeof styles];
const lineClass = (k: number) => styles[`line${k}` as keyof typeof styles];
const steamClass = (k: number) => styles[`steam${k}` as keyof typeof styles];

type Props = {
  /** true 면 모든 애니메이션을 멈춘다 (사용자 토글) */
  paused?: boolean;
  className?: string;
};

/** 둥근 얼굴 (피부·머리·눈·볼터치·미소). 눈은 깜빡임 클래스를 받는다 */
function Face({ cx, cy, r, blinkClass, bun = false }: { cx: number; cy: number; r: number; blinkClass: string; bun?: boolean }) {
  const eyeY = cy + r * 0.08;
  const eyeDx = r * 0.36;
  return (
    <g>
      {bun && <circle cx={cx + r * 0.75} cy={cy - r * 0.8} r={r * 0.32} fill="var(--color-cocoa)" />}
      <circle cx={cx} cy={cy} r={r} fill="var(--color-skin)" />
      {/* 머리: 윗부분을 덮는 반원 + 옆머리 */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} L ${cx + r} ${cy - r * 0.2} Q ${cx} ${cy - r * 0.62} ${cx - r} ${cy - r * 0.2} Z`}
        fill="var(--color-cocoa)"
      />
      <circle cx={cx - eyeDx} cy={eyeY} r={r * 0.09} fill="var(--color-cocoa)" className={blinkClass} />
      <circle cx={cx + eyeDx} cy={eyeY} r={r * 0.09} fill="var(--color-cocoa)" className={blinkClass} />
      <circle cx={cx - r * 0.58} cy={cy + r * 0.38} r={r * 0.16} fill="var(--color-blush)" opacity={0.85} />
      <circle cx={cx + r * 0.58} cy={cy + r * 0.38} r={r * 0.16} fill="var(--color-blush)" opacity={0.85} />
      <path
        d={`M ${cx - r * 0.2} ${cy + r * 0.5} Q ${cx} ${cy + r * 0.68} ${cx + r * 0.2} ${cy + r * 0.5}`}
        stroke="var(--color-cocoa)"
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
      />
    </g>
  );
}

export function LoginScene({ paused = false, className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 480 236"
      role="img"
      aria-label="학생이 책상에서 노트에 필기하고, 교사가 태블릿의 좌석표를 눌러 출석을 확인하는 장면"
      className={`${styles.scene} ${paused ? styles.paused : ""} ${className}`.trim()}
      data-paused={paused ? "true" : undefined}
    >
      {/* 배경 장식: 햇살, 작은 반짝임 */}
      <circle cx={238} cy={26} r={30} fill="var(--color-sunny)" opacity={0.28} />
      <circle cx={238} cy={26} r={18} fill="var(--color-sunny)" opacity={0.45} />
      <path d="M58 24 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill="var(--color-sunny)" opacity={0.8} />
      <path d="M428 60 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5 Z" fill="var(--color-primary-soft)" opacity={0.9} />

      {/* ───── 학생: 책상 · 스탠드 · 노트 필기 · 머그컵 ───── */}
      <g transform="translate(16 16)">
        {/* 벽시계 */}
        <circle cx={180} cy={58} r={14} fill="#fff" stroke="var(--color-primary-soft)" strokeWidth={2.5} />
        <rect x={179.25} y={51} width={1.5} height={7} rx={0.75} fill="var(--color-cocoa)" />
        <rect x={179.25} y={47} width={1.5} height={11} rx={0.75} fill="var(--color-primary)" className={styles.clockHand} />
        <circle cx={180} cy={58} r={1.6} fill="var(--color-cocoa)" />

        {/* 스탠드 불빛 (책상 위에 먼저 깔림) */}
        <ellipse cx={104} cy={152} rx={64} ry={22} fill="var(--color-sunny)" className={styles.glow} />

        {/* 학생 몸통(민트 후드) · 얼굴 */}
        <path d="M68 172 C 72 134, 132 134, 136 172 Z" fill="var(--color-mint)" />
        <path d="M90 136 Q 101 146 112 136" stroke="#fff" strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.7} />
        <Face cx={101} cy={104} r={21} blinkClass={styles.blink} />

        {/* 왼팔 (고정) */}
        <path d="M80 144 L 66 160" stroke="var(--color-mint)" strokeWidth={6} strokeLinecap="round" fill="none" />
        <circle cx={66} cy={160} r={4} fill="var(--color-skin)" />

        {/* 책상 */}
        <rect x={0} y={168} width={200} height={9} rx={3} fill="var(--color-wood)" />
        <rect x={12} y={177} width={5} height={28} rx={1} fill="var(--color-wood-deep)" />
        <rect x={183} y={177} width={5} height={28} rx={1} fill="var(--color-wood-deep)" />

        {/* 스탠드 (왼쪽) */}
        <rect x={44} y={98} width={3} height={70} fill="var(--color-wood-deep)" />
        <rect x={34} y={164} width={23} height={4} rx={2} fill="var(--color-wood-deep)" />
        <path d="M22 100 H 68 L 61 86 H 29 Z" fill="var(--color-primary-soft)" />

        {/* 머그컵 + 김 */}
        <rect x={158} y={155} width={13} height={13} rx={3} fill="var(--color-primary-soft)" />
        <path d="M171 158 q6 0 6 4.5 q0 4.5 -6 4.5" stroke="var(--color-primary-soft)" strokeWidth={2.2} fill="none" />
        {[161, 164.5, 168].map((x, k) => (
          <path
            key={x}
            d={`M ${x} 152 q 2 -2.5 0 -5`}
            stroke="var(--color-ink-muted)"
            strokeWidth={1.3}
            strokeLinecap="round"
            fill="none"
            className={steamClass(k)}
          />
        ))}

        {/* 노트 — 왼쪽 면은 이미 쓴 글, 오른쪽 면은 지금 쓰는 중 */}
        <rect x={52} y={138} width={96} height={34} rx={4} fill="#fff" stroke="var(--color-line)" strokeWidth={1.5} />
        <rect x={99.25} y={140} width={1.5} height={30} fill="var(--color-line)" />
        {[60, 70, 80, 90].map((x) => (
          <circle key={x} cx={x} cy={138} r={1.6} fill="var(--color-primary-soft)" />
        ))}
        {LINE_Y.map((y) => (
          <rect key={`done-${y}`} x={60} y={y - 1} width={32} height={2} rx={1} fill="var(--color-line)" />
        ))}
        {LINE_Y.map((y, k) => (
          <rect
            key={`line-${y}`}
            x={LINE_X0}
            y={y - 1}
            width={LINE_X1 - LINE_X0}
            height={2}
            rx={1}
            fill="var(--color-cocoa)"
            className={lineClass(k)}
          />
        ))}

        {/* 오른팔 — 어깨·팔꿈치 2관절. 보이지 않는 원이 각 회전축을 fill-box 중심에 고정한다 */}
        <g transform={`translate(${SHOULDER.x} ${SHOULDER.y})`}>
          <g className={styles.upperArm}>
            <circle r={UPPER_ARM + FOREARM + 20} fill="none" stroke="none" />
            <path d={`M0 0 L ${UPPER_ARM} 0`} stroke="var(--color-mint)" strokeWidth={6} strokeLinecap="round" fill="none" />
            <g transform={`translate(${UPPER_ARM} 0)`}>
              <g className={styles.forearm}>
                <circle r={FOREARM + 20} fill="none" stroke="none" />
                <path d={`M0 0 L ${FOREARM} 0`} stroke="var(--color-mint)" strokeWidth={6} strokeLinecap="round" fill="none" />
                {/* 연필: 끝이 손끝(= 노트 위 글자 위치) */}
                <path d={`M ${FOREARM} 0 L ${FOREARM + 5} -17 L ${FOREARM + 9.5} -14.5 Z`} fill="var(--color-sunny)" />
                <path d={`M ${FOREARM + 5} -17 L ${FOREARM + 9.5} -14.5 L ${FOREARM + 8.5} -11 L ${FOREARM + 4.2} -13.6 Z`} fill="var(--color-blush)" />
                <path d={`M ${FOREARM} 0 L ${FOREARM + 1.5} -5 L ${FOREARM + 3} -4.2 Z`} fill="var(--color-cocoa)" />
                <circle cx={FOREARM} cy={0} r={4.2} fill="var(--color-skin)" />
              </g>
            </g>
          </g>
        </g>
      </g>

      {/* ───── 교사: 태블릿 좌석표를 눌러 출석 확인 ───── */}
      <g transform="translate(268 16)">
        <path d="M12 176 C 16 136, 68 136, 72 176 Z" fill="var(--color-sky)" />
        <path d="M34 138 Q 42 148 50 138" stroke="#fff" strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.8} />
        <Face cx={42} cy={106} r={20} blinkClass={styles.blinkLate} bun />
        <path d="M60 142 L 84 126" stroke="var(--color-sky)" strokeWidth={6} strokeLinecap="round" fill="none" />
        <circle cx={84} cy={126} r={4} fill="var(--color-skin)" />

        {/* 태블릿 = 실제 출석부 화면의 축소판 */}
        <g transform="translate(52 100)">
          <rect x={0} y={0} width={156} height={108} rx={9} fill="#fff" stroke="var(--color-line)" strokeWidth={2} />
          <text x={10} y={12.5} fontSize={7} fontWeight={700} fill="var(--color-primary)" fontFamily="inherit">
            오늘 출석
          </text>
          <rect x={96} y={6.5} width={50} height={4} rx={2} fill="var(--color-line)" />
          <rect x={96} y={6.5} width={50} height={4} rx={2} fill="var(--color-ok)" className={styles.progress} />

          <g transform="translate(9 24)">
            {SEATS.map(({ i, x, y }) => (
              <g key={i} transform={`translate(${x} ${y})`}>
                <rect width={SEAT_W} height={SEAT_H} rx={5} stroke="#bfdbfe" strokeWidth={1} className={seatClass(i)} />
                <rect x={5} y={5} width={13} height={2} rx={1} fill="#64748b" opacity={0.5} />
                <path
                  d="M11 12.5 l3.5 3.5 l6.5 -7"
                  fill="none"
                  stroke="var(--color-check)"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={checkClass(i)}
                />
              </g>
            ))}

            {/* 손끝 포인터 + 탭 물결 */}
            <g className={styles.pointer}>
              <circle r={9} fill="none" stroke="var(--color-primary)" strokeWidth={2} className={styles.ripple} />
              <circle r={5} fill="var(--color-skin)" stroke="var(--color-primary)" strokeWidth={1.5} />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
