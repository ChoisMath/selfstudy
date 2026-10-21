import styles from "./login-scene.module.css";

/**
 * 로그인 화면 모션그래픽 — 왼쪽은 책상에서 필기하는 학생, 오른쪽은 태블릿 좌석표를 눌러 출석을 확인하는 교사.
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

type Props = {
  /** true 면 모든 애니메이션을 멈춘다 (사용자 토글) */
  paused?: boolean;
  className?: string;
};

export function LoginScene({ paused = false, className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 480 236"
      role="img"
      aria-label="학생이 책상에서 노트에 필기하고, 교사가 태블릿의 좌석표를 눌러 출석을 확인하는 장면"
      className={`${styles.scene} ${paused ? styles.paused : ""} ${className}`.trim()}
      data-paused={paused ? "true" : undefined}
    >
      {/* ───── 학생: 책상 · 스탠드 · 노트 필기 ───── */}
      <g transform="translate(16 16)">
        {/* 벽시계 */}
        <circle cx={30} cy={60} r={14} fill="#fff" stroke="var(--color-navy-soft)" strokeWidth={2} />
        <rect x={29.25} y={53} width={1.5} height={7} rx={0.75} fill="var(--color-ink)" />
        <rect x={29.25} y={49} width={1.5} height={11} rx={0.75} fill="var(--color-navy-soft)" className={styles.clockHand} />
        <circle cx={30} cy={60} r={1.5} fill="var(--color-ink)" />

        {/* 스탠드 불빛 (책상 위에 먼저 깔림) */}
        <ellipse cx={128} cy={150} rx={62} ry={24} fill="var(--color-lamp)" className={styles.glow} />

        {/* 학생 몸통·머리 */}
        <path d="M70 172 C 74 128, 128 128, 132 172 Z" fill="var(--color-navy-soft)" />
        <circle cx={101} cy={106} r={17} fill="var(--color-navy-soft)" />
        <path d="M84 104 C 86 90, 116 90, 118 104 L 118 100 C 112 92, 90 92, 84 100 Z" fill="var(--color-navy-deep)" />

        {/* 왼팔 (고정) */}
        <path d="M82 142 L 70 160" stroke="var(--color-navy-soft)" strokeWidth={5.5} strokeLinecap="round" fill="none" />

        {/* 책상 */}
        <rect x={0} y={168} width={200} height={9} rx={2.5} fill="var(--color-navy-deep)" />
        <rect x={12} y={177} width={5} height={28} fill="var(--color-navy-deep)" />
        <rect x={183} y={177} width={5} height={28} fill="var(--color-navy-deep)" />

        {/* 스탠드 */}
        <rect x={160} y={98} width={3} height={70} fill="var(--color-navy-soft)" />
        <rect x={150} y={164} width={23} height={4} rx={2} fill="var(--color-navy-soft)" />
        <path d="M138 100 H 182 L 176 86 H 144 Z" fill="var(--color-navy-deep)" />

        {/* 노트 — 왼쪽 면은 이미 쓴 글, 오른쪽 면은 지금 쓰는 중 */}
        <rect x={52} y={138} width={96} height={34} rx={3} fill="#fff" stroke="var(--color-line)" strokeWidth={1.5} />
        <rect x={99.25} y={140} width={1.5} height={30} fill="var(--color-line)" />
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
            fill="var(--color-navy-soft)"
            className={lineClass(k)}
          />
        ))}

        {/* 오른팔 — 어깨·팔꿈치 2관절. 보이지 않는 원이 각 회전축을 fill-box 중심에 고정한다 */}
        <g transform={`translate(${SHOULDER.x} ${SHOULDER.y})`}>
          <g className={styles.upperArm}>
            <circle r={UPPER_ARM + FOREARM + 20} fill="none" stroke="none" />
            <path d={`M0 0 L ${UPPER_ARM} 0`} stroke="var(--color-navy-soft)" strokeWidth={5.5} strokeLinecap="round" fill="none" />
            <g transform={`translate(${UPPER_ARM} 0)`}>
              <g className={styles.forearm}>
                <circle r={FOREARM + 20} fill="none" stroke="none" />
                <path d={`M0 0 L ${FOREARM} 0`} stroke="var(--color-navy-soft)" strokeWidth={5.5} strokeLinecap="round" fill="none" />
                <circle cx={FOREARM} cy={0} r={4} fill="var(--color-navy-deep)" />
                {/* 연필: 끝이 손끝(= 노트 위 글자 위치) */}
                <path d={`M ${FOREARM} 0 L ${FOREARM + 5} -16 L ${FOREARM + 9.5} -13.5 Z`} fill="#f59e0b" />
                <path d={`M ${FOREARM} 0 L ${FOREARM + 1.4} -4.4 L ${FOREARM + 2.7} -3.7 Z`} fill="var(--color-ink)" />
              </g>
            </g>
          </g>
        </g>
      </g>

      {/* ───── 교사: 태블릿 좌석표를 눌러 출석 확인 ───── */}
      <g transform="translate(268 16)">
        <path d="M14 176 C 18 128, 66 128, 70 176 Z" fill="var(--color-navy-soft)" />
        <circle cx={42} cy={106} r={16} fill="var(--color-navy-soft)" />
        <path d="M26 104 C 28 90, 56 90, 58 104 L 58 99 C 52 92, 32 92, 26 99 Z" fill="var(--color-navy-deep)" />
        <path d="M60 140 L 86 126" stroke="var(--color-navy-soft)" strokeWidth={7} strokeLinecap="round" fill="none" />

        {/* 태블릿 = 실제 출석부 화면의 축소판 */}
        <g transform="translate(52 100)">
          <rect x={0} y={0} width={156} height={108} rx={7} fill="#fff" stroke="var(--color-line)" strokeWidth={1.5} />
          <text x={10} y={12} fontSize={7} fontWeight={700} fill="var(--color-ink)" fontFamily="inherit">
            오늘 출석
          </text>
          <rect x={96} y={6.5} width={50} height={4} rx={2} fill="var(--color-line)" />
          <rect x={96} y={6.5} width={50} height={4} rx={2} fill="var(--color-ok)" className={styles.progress} />

          <g transform="translate(9 24)">
            {SEATS.map(({ i, x, y }) => (
              <g key={i} transform={`translate(${x} ${y})`}>
                <rect width={SEAT_W} height={SEAT_H} rx={3} stroke="#bfdbfe" strokeWidth={1} className={seatClass(i)} />
                <rect x={5} y={5} width={13} height={2} rx={1} fill="#64748b" opacity={0.55} />
                <path
                  d="M11 12.5 l3.5 3.5 l6.5 -7"
                  fill="none"
                  stroke="var(--color-ok)"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={checkClass(i)}
                />
              </g>
            ))}

            {/* 손끝 포인터 + 탭 물결 */}
            <g className={styles.pointer}>
              <circle r={9} fill="none" stroke="var(--color-navy)" strokeWidth={2} className={styles.ripple} />
              <circle r={4.5} fill="var(--color-navy-deep)" />
              <circle r={4.5} fill="none" stroke="#fff" strokeWidth={1.5} />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
