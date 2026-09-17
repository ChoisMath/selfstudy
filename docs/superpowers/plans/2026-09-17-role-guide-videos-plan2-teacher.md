# 역할별 안내 영상 — 계획 2: 교사 편 (목업 · 장면 · 영상 · 안내 페이지 2개)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 교사 안내 영상 `TeacherGuide`(21장면)를 렌더하고, 같은 장면 스틸로 `/help/attendance`·`/help/homeroom` 안내 페이지와 출석부·담임 화면의 `?` 버튼을 만든다.

**Architecture:** 먼저 오케스트레이터가 공용 기반(색상표·좌표·타이핑 도우미·가상 데이터·목업 갤러리·장면 스텁·컴포지션 등록)을 한 번에 깔아 **공유 파일을 모두 선점**한다. 그 뒤 목업 5묶음을 병렬 서브에이전트가 각자 파일에만 작성하고, **사용자 음성 청취 승인 후** 장면 4묶음을 병렬로 채운다. 스틸·안내 페이지·렌더는 장면이 끝난 뒤 진행한다.

**Tech Stack:** Remotion 4.0.518(React 19, inline style), Tailwind 4.2.2 색상(oklch), Next.js 16 MDX, `node:assert` 계약 테스트.

**Spec:** `docs/superpowers/specs/2026-09-17-role-guide-videos-design.md` (5절 교사 영상, 4절 구조)
**선행:** 계획 1 완료(`PhoneFrame`·`phone.ts`, `src/components/guide/*`, `teacher/narration.ts`·음성)

## Global Constraints

- **목업 충실도**: 목업마다 지정한 실제 앱 파일을 열어 레이아웃·문구·색·크기를 옮긴다. Tailwind 클래스는 인라인 style로 바꾸고 색은 `src/app-mocks/tw.ts`(앱과 같은 Tailwind 4.2.2 팔레트, oklch 문자열), 간격은 Tailwind 규칙(1 = 4px)을 따른다. 앱에 없는 요소를 지어내지 않는다.
- **색 출처**: 앱 화면 목업 = `tw`(+ 실제 앱 코드에 적힌 hex는 그대로), 영상 장치(배경·자막·주석·배지) = `src/theme.ts`. (규칙 결정 — 태스크 13에서 `.claude/GUIDE_PAGES.md` 6절에 기록)
- **모션(GUIDE_PAGES 6절)**: UI 목업 장면에 그레인·비네트·색 보정·배경 메시·Ken Burns 금지. 트윈은 `src/anim.ts`의 `tween`(easing+clamp)만, 선형 보간 금지. 등장 2~3속성·스태거·퇴장이 등장보다 빠르게. 화면 동작 시점은 `lineAt(scene, line, ratio)`로 잡고 매직 프레임 금지(공용 상수·짧은 트윈 길이는 예외). 공용 코드(`anim.ts`·`components/*`·`guide/*`) 리팩터링 금지.
- **목업 컴포넌트 규칙**: 순수 표시 컴포넌트다. 상태는 props로 받고, 프레임 기반 연출은 `pressAt`·`typeFrom`·`openAt` 같은 **프레임 번호 prop**으로만 받는다(내부에서 `useCurrentFrame` + `tween` 사용 가능). API·전역 상태 없음. 모든 라벨·칩·버튼 텍스트 `whiteSpace: "nowrap"`.
- **좌표**: PC 목업은 논리 뷰포트 1248×570에 그리고 `PcViewport`가 1.25배로 키워 브라우저 본문(1560×712)을 채운다. 폰 목업은 폰 본문 390×752에 1:1. 목업은 커서·주석용 좌표 함수(`<name>Point(key)`·`<name>Rect(key)`, 논리 좌표)를 export하고, 장면이 `pcAbs`/`pcRectAbs`(PC) 또는 `phoneAbs`/`phoneRectAbs`(폰)로 화면 좌표로 바꾼다.
- **데이터**: 가상 데이터는 `src/app-mocks/data.ts` 한 곳(교사 편 범위). 실존 인물 이름 금지(아래 명단 사용).
- **확인 루프**: `cd demo-video && npx remotion still <CompositionId> out/check/<name>.png --frame=<n>` 로 PNG를 뽑아 **Read 도구로 이미지를 직접 보고** 실제 앱 화면 설명과 대조한 뒤 고친다. 렌더 결과(out/)는 커밋하지 않는다.
- **TTS 금지**: 서브에이전트는 `scripts/narrate.mjs`를 실행하지 않는다(로컬 MLX를 오케스트레이터가 단독 사용).
- 검수 명령: demo-video는 `cd demo-video && npm run lint`(eslint+tsc), 앱은 저장소 루트에서 `npx tsx tests/<name>.test.ts`, `npx tsc --noEmit`, `npm run lint`.
- 반응형(앱 코드): 라벨·칩·제목 `whitespace-nowrap`, 문단 `break-keep`, `break-words`/`break-all` 금지, 터치 타겟 `min-h-11`/`min-w-11`, `min-h-screen` 금지.
- **커밋 규칙(병렬)**: `git add <paths> && git commit -m "<message>" -- <paths>`, `index.lock`이면 잠시 후 재시도. `git add -A`/`.`/`commit -a`/`stash`/`reset`/`checkout -- .` 금지. 남의 파일 건드리지 않기. `git push` 금지.
- 커밋 메시지 마지막 줄은 **정확히**: `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

## 병렬 실행 지도

| 단계 | 태스크 | 담당 | 파일(소유) | 선행 |
|---|---|---|---|---|
| 기반 | 1 | 서브에이전트 1(단독) | `scripts/gen-tw-palette.mjs`, `src/app-mocks/{tw.ts,layout.tsx,primitives.tsx,data.ts,gallery/*}`, `src/teacher/{timing.ts,TeacherVideo.tsx,scenes.ts,scenes/*Scene.tsx 스텁}`, `src/Root.tsx` | 계획 1 |
| 목업 | 2 로그인 · 3 출석부 · 4 출석부 패널 · 5 감독일정 · 6 담임 표 · 7 담임 폼 | 병렬 6 | 태스크별 목업 파일 + 자기 `gallery/<group>.tsx` | 1 |
| **게이트** | 사용자 음성 청취 승인 | 오케스트레이터 | `teacher/narration.ts` 수정·재생성 | 계획 1 태스크 6 |
| 장면 | 8 폰 앞 · 9 폰 뒤 · 10 감독일정·담임 메뉴 · 11 담임 탭·마무리 | 병렬 4 | 자기 장면 파일 | 2~7, 게이트 |
| 마무리 | 12 스틸 → 13 안내 페이지 2개·`?` 버튼 → 14 렌더·검수 | 순차 | 아래 각 태스크 | 11 |

---

### Task 1: 목업 공용 기반과 장면 뼈대 (단독 실행)

**Files:**
- Create: `demo-video/scripts/gen-tw-palette.mjs`, `demo-video/scripts/frame-at.mjs`, `demo-video/src/app-mocks/tw.ts`(생성물)
- Create: `demo-video/src/app-mocks/layout.tsx`, `demo-video/src/app-mocks/primitives.tsx`, `demo-video/src/app-mocks/data.ts`
- Create: `demo-video/src/app-mocks/gallery/types.ts`, `gallery/index.ts`, 스텁 `gallery/{login,attendance,attendance-panels,schedule,homeroom-tables,homeroom-forms}.tsx`
- Create: `demo-video/src/teacher/timing.ts`, `demo-video/src/teacher/TeacherVideo.tsx`, `demo-video/src/teacher/scenes.ts`, 스텁 21개 `demo-video/src/teacher/scenes/<SceneId>Scene.tsx`
- Modify: `demo-video/src/Root.tsx`

**Interfaces (Produces):**
- `tw`: `{ [family]: { 50..950: string } , black: string, white: string }` — families: slate gray zinc neutral stone red orange amber yellow lime green emerald teal cyan sky blue indigo violet purple fuchsia pink rose
- `layout.tsx`: `PC_VIEWPORT = { w: 1248, h: 570 }`, `PC_SCALE = 1.25`, `type Point = {x,y}`, `type Rect = {x,y,w,h}`, `pcAbs(p: Point): Point`, `pcRectAbs(r: Rect): { x, y, width, height }`, `PcViewport({ children })`(1248×570 div를 scale 1.25, transformOrigin top left), `PHONE_BODY = { w: 390, h: 752 }`
- `primitives.tsx`: `typedSlice(text, frame, from?)`, `Caret({height?})`, `TypedText({ text, from?, placeholder? })`, `pressScale(frame, pressAt?)` — school_cowork `src/guide/mocks/ModalShell.tsx` 53-102행과 동일 동작, 색은 `tw`
- `gallery/types.ts`: `type GalleryEntry = { id: string; component: React.FC; width: number; height: number; durationInFrames?: number }`; 각 `gallery/<group>.tsx`: `export const ENTRIES: GalleryEntry[] = []`; `gallery/index.ts`: `MOCK_GALLERY = [...login, ...attendance, ...]`
- `Root.tsx`: `<Composition id="TeacherGuide">` + `<Folder name="Teacher">` 장면별 `Teacher-<SceneId>` + `<Folder name="Mocks">` 갤러리 항목별 `Mock-<id>`(fps 30, 기본 90프레임)
- `teacher/timing.ts`: `sceneFrames, lineStart, lineFrames, lineEnd, lineAt, captionsFor` (setup-check/timing.ts와 같은 형태, `TeacherSceneId`)
- `TEACHER_SCENES: SceneDef[]`, `TEACHER_GUIDE_CONFIG: GuideConfig`(`audioDir: "narration/teacher"`, `stepTotal: 19`), `TeacherVideo`
- 스텁 장면: `export const <Id>Scene: React.FC<DemoProps> = () => <GuideScene id="<Id>" step={n} label="<label>"><></></GuideScene>`. Intro·Outro는 step 없음. step/label:

| Scene | step | label | Scene | step | label |
|---|---|---|---|---|---|
| Login | 1 | 로그인 | SwapModal | 11 | 감독 교체 |
| AttendanceTour | 2 | 출석부 화면 | SwapTotals | 12 | 감독 누계 |
| SeatTap | 3 | 출석 체크 | HomeroomTour | 13 | 담임 메뉴 |
| CopySession | 4 | 오후1 복사 | HomeroomWeekly | 14 | 주간 출결 |
| SeatColors | 5 | 좌석 색 | HomeroomMonthly | 15 | 월간출결 |
| LongPress | 6 | 꾹 눌러 활성화 | HomeroomParticipation | 16 | 참여설정 |
| WeeklyInfo | 7 | 주간 정보 | AbsenceReason | 17 | 불참사유등록 |
| AbsenceTab | 8 | 불참신청 승인 | HomeroomRequests | 18 | 불참신청 관리 |
| BulkApprove | 9 | 일괄승인 | Password | 19 | 비밀번호 |
| SwapEntry | 10 | 감독일정 | | | |

- `data.ts` (교사 편 가상 세계 — 아래 값 그대로):
  - `TODAY = "2026-09-17"`, `TODAY_LABEL = "2026.9.17 (목)"`, `GRADE = 1`, `APP_URL = "https://self.posan.kr"`, `APP_HOST = "self.posan.kr"`
  - 교사 `TEACHERS: { id, name, primaryGrade }[]` — 1학년: 박지훈(본인, id 1)·이수민·김하늘·최영호·윤서진 / 2학년: 한도윤·오세린·장민혁 / 3학년: 서지원·문태호·신유나. `ME = { id: 1, name: "박지훈", homeroom: { grade: 1, classNumber: 2 }, loginId: "parkjh01" }`
  - 학생 `STUDENTS: { id, grade: 1, classNumber, number, name }[]` 36명, 반당 12명(번호 1~12 순):
    - 1반: 김도현 이서윤 박지민 최준우 정하은 강민재 조예린 윤시우 장서아 임건우 한지유 오승민
    - 2반: 서하준 신예은 권도윤 황수아 안지호 송채원 류현우 전가은 홍유찬 고나윤 문서진 양태윤
    - 3반: 손하람 배지안 백승현 허다인 남궁민 노은서 하준서 곽유나 성민준 차소율 주원빈 우채아
  - 오후 교실 `AFTERNOON_CLASSROOMS`: 1-1반·1-2반·1-3반, 각 `{ classNumber, corridorSide: "right", divisions: 3, rowsPerDivision: 2, colsPerDivision: 2 }`, 좌석은 분단1→분단3, 분단 안에서 행→열 순으로 번호 1~12 배정
  - 야간 방 `NIGHT_ROOMS`: `[{ name: "자율관 야간실", rows: 3, cols: 4 }, { name: "자율관 야간실2", rows: 3, cols: 4 }]`, 1반·2반 학생 번호순 배정(3반은 야간 미참가)
  - 오늘 오후1 기준 좌석 상태 `AFTERNOON1_BASE: Record<studentId, SeatBase>`, `type SeatBase = { participating: boolean; afterSchool: boolean; approvedAbsence: boolean; pendingRequest: boolean }` — 기본 `{participating:true, afterSchool:false, approvedAbsence:false, pendingRequest:false}`, 예외: 1-1 4번 approvedAbsence, 1-1 7번 afterSchool, 1-1 9번 pendingRequest, 1-1 11번 participating false, 1-2 3번 participating false, 1-2 8번 afterSchool, 1-3 5번 approvedAbsence, 1-3 2번 pendingRequest
  - 오후1 체크 결과 `AFTERNOON1_RESULT: Record<studentId, "present" | "absent">` — 참여·비승인 학생 전원 present, 단 1-1 2번 absent(사유 없음), 1-2 5번 absent + `reasonLabel: "학원"`(사유결석 → 복사 제외)
  - 불참신청 `ABSENCE_REQUESTS: { id, studentId, date, dateLabel, session: "afternoon1"|"afternoon2"|"night", reason: "academy"|"afterschool"|"illness"|"custom", detail?, status: "pending"|"approved"|"rejected", reviewer? }[]`:
    1. 1-1 9번, 2026-09-17 "9/17(목)", afternoon1, academy, pending
    2. 1-3 2번, 2026-09-17, afternoon1, illness, "병원 진료", pending
    3. 1-3 2번, 2026-09-17, afternoon2, illness, "병원 진료", pending
    4. 1-2 10번, 2026-09-18 "9/18(금)", night, custom, "가족 행사", pending
    5. 1-1 4번, 2026-09-17, afternoon1, academy, approved, reviewer 박지훈
    6. 1-3 5번, 2026-09-17, afternoon1, afterschool, approved, reviewer 이수민
    7. 1-2 6번, 2026-09-16 "9/16(수)", night, custom, "개인 사정", rejected, reviewer 김하늘
  - 사유 라벨·색(앱 `attendance/[grade]/page.tsx` 불참신청 카드 기준): 학원 `#f59e0b` · 방과후 `#8b5cf6` · 질병 `#ef4444` · 기타 `#6b7280`
  - 감독 배정 `SUPERVISOR_SEPT: Record<"YYYY-MM-DD", { 1: string; 2: string; 3: string }>` — 2026년 9월 평일 전부. 1학년 줄은 [박지훈, 이수민, 김하늘, 최영호, 윤서진] 순환이되 **9/3·9/17·9/24는 박지훈**, 2학년은 [한도윤, 오세린, 장민혁] 순환, 3학년은 [서지원, 문태호, 신유나] 순환
  - 교체 예시 `SWAP_EXAMPLE = { date: "2026-09-24", grade: 1, from: "박지훈", to: "이수민", reason: "출장" }`
  - 감독 누계 `SUPERVISOR_SUMMARY = { months: ["3월","4월","5월","6월","7월","9월"], rows: { name, primaryGrade, counts: number[], total }[] }` — 1학년 교사 5명, 박지훈 `[2,2,3,2,1,3]` 총 13, 나머지 교사는 합 11~14 사이 임의
  - 주간 정보 `WEEKLY_INFO` (1-1 1번 김도현, 9월 3주차): 요일 `월 화 수 목 금`, 오후1 `[출석, 출석, 방과후, 출석(오늘), -]`, 오후2 `[출석, 결석, 방과후, -, -]`, 비고 `{ 화: "조퇴 후 복귀" }`, 사유 줄 없음, 이번 달 `12.5h`, 학년도 `86.7h`, 순위 `12위 (상위 8%)`
  - 담임 주간표 `HOMEROOM_WEEK` (1-2반 12명, 9/14~9/18): `cell(studentNo, dayIndex 0-4, session)` 생성 함수 — 금요일(4)은 `"-"`, 목요일(3) 야간은 `"-"`, 그 외 기본 `"O"`; 예외: 5번 월 오후1 `"△"`(학원: 수학), 8번 목 오후1·오후2 `"방"`, 3번 목 전체 `"gray"`(미참가), 12번 화 야간 `"X"`, 6번 수 야간 비고 `"*"`(늦게 입실)
  - 담임 월간 `HOMEROOM_MONTH` (1-2반, 2026년 9월 1~17일 평일 13일 × 3칸): 같은 규칙 함수 + 시간 합계(`O` 오후 50분·야간 100분 → 시간 소수 1자리)
  - 참여설정 `HOMEROOM_PARTICIPATION` (1-2반 12명): 세션 3 × `{ participating, days: [월..금 boolean], afterSchool: [월..금 boolean] }` — 기본 참가·월~금 켬·방과후 끔; 예외: 3번 오후1·오후2 목 끔, 8번 오후1·오후2 목 방과후 켬, 11번 야간 참가 끔
  - 불참사유등록 예시 `ABSENCE_REASON_EXAMPLE = { student: "1-2 5번 안지호", date: "2026-09-17", session: "afternoon1", reason: "academy", detail: "수학 학원" }`

- [ ] **Step 1: 색상표 생성기**

`demo-video/scripts/gen-tw-palette.mjs`:

```js
// 앱(저장소 루트)의 Tailwind 테마에서 색 변수를 읽어 목업용 tw.ts 를 만든다. 앱과 같은 버전·같은 oklch 값을 쓰기 위함.
// 사용: node scripts/gen-tw-palette.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const themeCss = join(ROOT, "..", "node_modules", "tailwindcss", "theme.css");
const version = JSON.parse(readFileSync(join(ROOT, "..", "node_modules", "tailwindcss", "package.json"), "utf8")).version;
const css = readFileSync(themeCss, "utf8");

const palette = {};
for (const [, family, shade, value] of css.matchAll(/--color-([a-z]+)-(\d+):\s*([^;]+);/g)) {
  (palette[family] ??= {})[shade] = value.trim();
}
const black = css.match(/--color-black:\s*([^;]+);/)?.[1].trim() ?? "#000";
const white = css.match(/--color-white:\s*([^;]+);/)?.[1].trim() ?? "#fff";

const body = Object.entries(palette)
  .map(([family, shades]) => `  ${family}: {\n${Object.entries(shades).map(([s, v]) => `    ${s}: "${v}",`).join("\n")}\n  },`)
  .join("\n");
writeFileSync(
  join(ROOT, "src", "app-mocks", "tw.ts"),
  `// 생성 파일 — node scripts/gen-tw-palette.mjs (앱 tailwindcss ${version} theme.css). 직접 고치지 말 것.\nexport const tw = {\n${body}\n  black: "${black}",\n  white: "${white}",\n} as const;\n`,
);
console.log(`tw.ts: ${Object.keys(palette).length} families (tailwindcss ${version})`);
```

Run: `cd demo-video && mkdir -p src/app-mocks/gallery && node scripts/gen-tw-palette.mjs`
Expected: `tw.ts: 22 families (tailwindcss 4.2.2)` (가족 수는 테마에 따라 다를 수 있음 — `blue`·`gray`·`slate`·`yellow`가 들어 있는지 `grep -c` 로 확인)

- [ ] **Step 1b: 프레임 계산 도우미**

`demo-video/scripts/frame-at.mjs` (장면 작업자가 스틸 프레임을 구할 때 쓴다 — `timing.ts`가 JSON을 속성 없이 import 해 Node가 직접 못 읽으므로 guide-stills.mjs 처럼 esbuild로 번들):

```js
// 사용: node scripts/frame-at.mjs <guide> <SceneId> <line> <ratio>   예: node scripts/frame-at.mjs teacher SeatTap 1 0.6
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const [guide, scene, line, ratio] = process.argv.slice(2);
if (!guide || !scene || line === undefined || ratio === undefined) {
  throw new Error("usage: node scripts/frame-at.mjs <guide> <SceneId> <line> <ratio>");
}
const outDir = join(ROOT, "out", "frame-at");
mkdirSync(outDir, { recursive: true });
const bundled = join(outDir, `${guide}-${process.pid}.timing.mjs`);
execFileSync(join(ROOT, "node_modules", ".bin", "esbuild"), [join(ROOT, "src", guide, "timing.ts"), "--bundle", "--platform=node", "--format=esm", `--outfile=${bundled}`, "--log-level=error"]);
const { lineAt, sceneFrames } = await import(bundled);
console.log(`frame ${lineAt(scene, Number(line), Number(ratio))} / scene ${sceneFrames(scene)}`);
```

- [ ] **Step 2: `layout.tsx`·`primitives.tsx` 작성** — 위 Interfaces 그대로. `primitives.tsx`는 school_cowork `ModalShell.tsx` 53-102행을 옮기고 `colors.gray800`→`tw.gray[800]`, `colors.gray400`→`tw.gray[400]`.

`layout.tsx` 전체:

```tsx
import React from "react";
import { BROWSER } from "../theme";

export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

// PC 목업은 1248px 폭 화면을 1.25배로 키워 브라우저 본문(1560×712)을 채운다 — 실제 크기 글자(14px)가 영상에서 읽히게.
export const PC_VIEWPORT = { w: 1248, h: 570 } as const;
export const PC_SCALE = BROWSER.w / PC_VIEWPORT.w;
export const PHONE_BODY = { w: 390, h: 752 } as const;

export const pcAbs = (p: Point): Point => ({
  x: BROWSER.x + p.x * PC_SCALE,
  y: BROWSER.y + BROWSER.chrome + p.y * PC_SCALE,
});

export const pcRectAbs = (r: Rect) => ({
  ...pcAbs(r),
  width: r.w * PC_SCALE,
  height: r.h * PC_SCALE,
});

export const PcViewport: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      width: PC_VIEWPORT.w,
      height: PC_VIEWPORT.h,
      transform: `scale(${PC_SCALE})`,
      transformOrigin: "top left",
      overflow: "hidden",
    }}
  >
    {children}
  </div>
);
```

- [ ] **Step 3: `data.ts` 작성** — 위 명세 값 그대로, 타입 export 포함. 생성 함수는 순수 함수.

- [ ] **Step 4: 갤러리·장면 뼈대·Root 등록**

`gallery/types.ts`·스텁 6개·`index.ts`, `teacher/timing.ts`(setup-check 형태), `teacher/scenes/*Scene.tsx` 스텁 21개, `teacher/scenes.ts`(`TEACHER_SCENES` 21개, 스펙 순서), `teacher/TeacherVideo.tsx`, `Root.tsx`에 `TeacherGuide`·`Folder name="Teacher"`(prefix `Teacher`)·`Folder name="Mocks"`(각 항목 `withConfig` 불필요, `schema`/`defaultProps` 없이 `component`만) 추가. 기존 SetupCheck 등록은 유지.

- [ ] **Step 5: 확인**

Run:
```bash
cd /Volumes/Chois_SD2/dev/selfstudy/demo-video && npm run lint
npx remotion compositions src/index.ts 2>/dev/null | grep -E "TeacherGuide|Teacher-(Intro|Outro|Password)" 
npx remotion still Teacher-Login out/check/stub-login.png --frame=30
```
Expected: lint 0, 컴포지션 목록에 `TeacherGuide`·`Teacher-Intro`·`Teacher-Outro`·`Teacher-Password`, 스틸에 배경·STEP 1/19 배지·자막이 보임(Read로 확인).

- [ ] **Step 6: 커밋** (`-- demo-video/scripts/gen-tw-palette.mjs demo-video/scripts/frame-at.mjs demo-video/src/app-mocks demo-video/src/teacher/timing.ts demo-video/src/teacher/TeacherVideo.tsx demo-video/src/teacher/scenes.ts demo-video/src/teacher/scenes demo-video/src/Root.tsx`), 메시지 `Add teacher guide scaffolding and shared app mock foundations`

---

### Task 2: 로그인 목업 (병렬)

**Files:** Create `demo-video/src/app-mocks/LoginMock.tsx`; Modify `demo-video/src/app-mocks/gallery/login.tsx`
**Source:** `src/app/login/page.tsx`(전체), 로고는 흰 배경 원형 자리표시 대신 앱 `public/posan.svg`를 `demo-video/public/posan.svg`로 복사해 `staticFile("posan.svg")`로 쓴다.

**Interfaces (Produces):**
```ts
export type LoginMockProps = {
  width: number;              // 폰 390
  height: number;             // 폰 752
  tab: "teacher" | "student";
  tabPressAt?: number;        // 탭 버튼 누름 연출
  fields: { first: { text: string; typeFrom?: number }; second: { text: string; typeFrom?: number; masked?: boolean } };
  submitPressAt?: number;
  submitting?: boolean;       // "로그인 중..."
};
export const LoginMock: React.FC<LoginMockProps>;
export type LoginPointKey = "tab_teacher" | "tab_student" | "field_first" | "field_second" | "submit" | "hint";
export const loginPoint: (key: LoginPointKey, width: number) => Point;
export const loginRect: (key: LoginPointKey, width: number) => Rect;
```
- 교사 탭: 라벨 "ID"/placeholder "아이디 입력", "비밀번호"/"비밀번호 입력"(masked면 `•`). 학생 탭: "이름"/"이름 입력", "학번"/"학번 5자리 (예: 20102)" + 도움말 "학년(1자리) + 반(2자리) + 번호(2자리) 예: 2학년 1반 2번 → 20102". 제목 "포산고 자습 출석부", 하단 "사용 안내 보기 →".
- 갤러리: `Mock-Login-Teacher`(ID·비밀번호 입력된 상태), `Mock-Login-Student`(이름·학번 입력) — 390×752.

- [ ] Step 1: 소스 파일 읽기 → Step 2: 구현 → Step 3: `npx remotion still Mock-Login-Teacher out/check/login-teacher.png` 등으로 확인하며 수정 → Step 4: `npm run lint` → Step 5: 커밋(`-- demo-video/src/app-mocks/LoginMock.tsx demo-video/src/app-mocks/gallery/login.tsx demo-video/public/posan.svg`), 메시지 `Add login screen mock for guide videos`

---

### Task 3: 출석부 좌석판 목업 (병렬)

**Files:** Create `demo-video/src/app-mocks/SeatCellMock.tsx`, `ClassroomFrameMock.tsx`, `AttendanceHeaderMock.tsx`, `AttendanceBoardMock.tsx`; Modify `gallery/attendance.tsx`
**Source:** `src/app/attendance/layout.tsx`(헤더), `src/app/attendance/[grade]/page.tsx` 105-170행(SeatCell 색 우선순위·라벨·i 버튼·`*`), 880-1100행(날짜 바·탭·오후1 복사 버튼·그룹 카드·범례), `src/components/seats/ClassroomFrame.tsx`, `src/lib/seats/classroom-config.ts`(`corridorLabels`)

**Interfaces (Produces):**
```ts
export type SeatVisual = "unchecked" | "present" | "absent" | "approved" | "afterschool" | "inactive" | "activated" | "selected";
export type SeatCellProps = {
  name: string; gradeClass: string;          // "1-1"
  visual: SeatVisual;
  afterSchoolStatus?: "unchecked" | "present" | "absent"; // visual === "afterschool" 테두리·라벨
  pending?: boolean;                          // 이름 앞 빨간 *
  pressAt?: number;                           // active:scale-95 연출
  longPressFrom?: number; longPressTo?: number; // 꾹 누르는 동안 테두리 진행 링(0→1)
  width: number; height: number;
};
export const SeatCellMock: React.FC<SeatCellProps>;

export const ClassroomFrameMock: React.FC<{ corridorSide: "left" | "right"; variant: "screen" | "print"; children: React.ReactNode }>;

export type AttendanceHeaderProps = { width: number; role: "homeroom" | "supervisor"; gradeAdmin?: number; name: string; showHelp?: boolean; pressKey?: "homeroom" | "schedule" | "gradeAdmin" | "help"; pressAt?: number };
export const AttendanceHeaderMock: React.FC<AttendanceHeaderProps>;
export const attendanceHeaderPoint: (key: "logo" | "gradeAdmin" | "homeroom" | "schedule" | "help" | "logout", props: AttendanceHeaderProps) => Point;

export type BoardTab = "afternoon1" | "afternoon2" | "night" | "absence";
export type SeatView = SeatCellProps & { studentId: number };
export type SeatGroupView = { title: string; seatCount: number; classroom?: { corridorSide: "left" | "right"; divisions: SeatView[][][] /* 분단→행→열 */ }; rooms?: { name: string; rows: SeatView[][] }[] };
export type AttendanceBoardProps = {
  width: number; height: number;              // 폰 390×752(헤더 포함)
  header: AttendanceHeaderProps;
  dateLabel: string; supervisor: string; grade: number;
  counts: { present: number; absent: number; unchecked: number; afterSchool: number }; // tab === "absence"면 숨김
  tab: BoardTab; tabPressAt?: { tab: BoardTab; at: number };
  pendingBadge: number;
  groups: SeatGroupView[];                    // tab !== "absence"
  copyButton?: { visible: boolean; pressAt?: number; busy?: boolean }; // 오후2 "오후1 결과 복사"
  body?: React.ReactNode;                     // tab === "absence" 본문 (태스크 4 패널)
  scrollY?: number;                           // 본문 세로 스크롤 오프셋(px)
  overlay?: React.ReactNode;                  // 모달·다이얼로그 자리
};
export const AttendanceBoardMock: React.FC<AttendanceBoardProps>;
export const boardPoint: (key: "date" | "supervisor" | "counts" | "otherGrade" | `tab_${BoardTab}` | "copy" | "legend", props: AttendanceBoardProps) => Point;
export const boardRect: (key: "dateBar" | "tabs" | "counts" | "copy" | "legend", props: AttendanceBoardProps) => Rect;
export const seatRect: (studentId: number, props: AttendanceBoardProps) => Rect; // 스크롤 반영
export const buildAfternoonGroups: (states: Record<number, Omit<SeatView, "width" | "height" | "name" | "gradeClass" | "studentId">>) => SeatGroupView[]; // data.ts 교실·학생으로 조립
```
- 색 우선순위·hex는 앱 SeatCell 그대로: 비참여 `#e5e7eb/#d1d5db/#9ca3af` opacity .7 · 선택 `#2563eb` · 방과후 `#fef9c3` 테두리 미체크 `#facc15`/출석 `#22c55e`/결석 `#ef4444` 라벨 "방과후"/"출석"/"결석" · 불참승인 `#fef9c3`/`#facc15` 라벨 "불참승인" · 출석 `#bbf7d0` · 결석 `#fecaca` · 미체크 `#dbeafe`. 칸: 이름(굵게), "1-1", 오른쪽 위 작은 "i". 활성화(activated)는 미체크와 같은 파랑.
- 날짜 바 그라데이션 `linear-gradient(135deg,#1e40af,#2563eb)`, 카운트 색 `#86efac/#fca5a5/흰색/#fde047`, 탭 활성 흰 배경 `#2563eb` 글자 / 비활성 `#e2e8f0` 배경 `#94a3b8`, 불참신청 배지 `#ef4444`. 헤더의 `showHelp`는 이 계획 태스크 13에서 앱에 추가하는 `?` 버튼 모양(`GuideHelpButton`: 지름 28 원형 테두리 "?")을 그린다.
- 갤러리: `Mock-Board-Afternoon1`(AFTERNOON1_BASE, 1-1반 일부 출석), `Mock-Board-Afternoon2`(복사 버튼), `Mock-Board-Night`, `Mock-Header-PC`(width 1248, role supervisor) — 폰 390×752, 헤더 PC 1248×64.

- [ ] 소스 읽기 → 구현 → 갤러리 스틸로 앱 설명(좌석 색·라벨·i·*·복도/창문/교탁)과 대조 → `npm run lint` → 커밋(자기 파일), 메시지 `Add attendance board mocks for guide videos`

---

### Task 4: 출석부 패널 목업 — 주간 정보·불참신청·일괄승인·다이얼로그 (병렬)

**Files:** Create `demo-video/src/teacher/mocks/WeeklyInfoModalMock.tsx`, `AbsencePanelMock.tsx`, `BulkApproveModalMock.tsx`, `NativeDialogMock.tsx`; Modify `demo-video/src/app-mocks/gallery/attendance-panels.tsx`
**Source:** `src/app/attendance/[grade]/page.tsx` 580-716행·1197-1244행(주간 모달, 1024px 미만 = 모달), 789-884행·1107-1195행(불참신청 탭·카드·일괄승인 버튼·확인 모달), `src/lib/attendance/weekly-summary.ts`(칸 라벨·색)
**Consumes:** `data.ts`의 `WEEKLY_INFO`, `ABSENCE_REQUESTS`, 사유 색; 태스크 3과 파일 공유 없음(패널은 `AttendanceBoardMock.body`/`overlay`로 들어감 — 폭 390 기준으로 그린다)

**Interfaces (Produces):**
```ts
export const WeeklyInfoModalMock: React.FC<{ width: number; height: number; openAt?: number; noteTyping?: { day: string; text: string; typeFrom: number } }>;
export const weeklyInfoRect: (key: "table" | "notes" | "totals" | "close", width: number, height: number) => Rect;

export type AbsenceFilter = "pending" | "approved" | "rejected";
export const AbsencePanelMock: React.FC<{
  width: number; filter: AbsenceFilter; filterPressAt?: number;
  requests: typeof ABSENCE_REQUESTS;           // 상태 변화는 장면이 복사본으로 넘김
  approvePressAt?: { requestId: number; at: number };
  bulkCount: number; bulkPressAt?: number;
  removingId?: { requestId: number; from: number }; // 승인 후 카드가 목록에서 빠지는 퇴장
}>;
export const absencePanelPoint: (key: `filter_${AbsenceFilter}` | "bulk" | `approve_${number}` | `reject_${number}`, width: number, requests: typeof ABSENCE_REQUESTS, filter: AbsenceFilter) => Point;
export const absenceCardRect: (requestId: number, width: number, requests: typeof ABSENCE_REQUESTS, filter: AbsenceFilter) => Rect;

export const BulkApproveModalMock: React.FC<{ width: number; height: number; rows: { student: string; date: string; session: string; reason: string; detail: string }[]; openAt?: number; confirmPressAt?: number; busy?: boolean }>;
export const bulkModalPoint: (key: "confirm" | "cancel" | "table", width: number, height: number, rowCount: number) => Point;

// Chrome 모바일 confirm/alert 모양. kind confirm = [취소][확인], alert = [확인]
export const NativeDialogMock: React.FC<{ width: number; height: number; kind: "confirm" | "alert"; message: string; openAt?: number; okPressAt?: number }>;
export const nativeDialogPoint: (key: "ok" | "cancel", width: number, height: number, kind: "confirm" | "alert") => Point;
```
- 문구: 불참신청 필터 "대기중 (N)"·"승인"·"반려", 일괄 "일괄승인 (N)", 카드 "이름 · N학년 N반 N번" / "9/17(목) · 오후1 자습 · 학원", 버튼 "승인"·"반려", 확인 "이 불참신청을 승인하시겠습니까?", 일괄 모달 제목 "불참신청 일괄승인"·"N건을 승인합니다."·표(학생/날짜/시간/사유/상세)·"취소"/"일괄승인", 완료 알림 "N건을 승인했습니다.", 복사 확인 "오후1 출석 결과를 오후2 미체크 학생에게 복사할까요?", 복사 결과 "N명 복사, M명은 오후1 미체크·사유결석이라 건너뜀".
- 갤러리: `Mock-WeeklyInfo`, `Mock-AbsencePanel-Pending`, `Mock-BulkApprove`, `Mock-Dialog-Confirm` — 모두 390×752(패널은 390×560).

- [ ] 소스 읽기 → 구현 → 갤러리 스틸 확인 → lint → 커밋, 메시지 `Add attendance weekly info, absence panel, and dialog mocks`

---

### Task 5: 감독일정 달력·교체 모달·누계 모달·담임 셸 (병렬)

**Files:** Create `demo-video/src/app-mocks/ScheduleCalendarMock.tsx`, `demo-video/src/app-mocks/SupervisorSummaryMock.tsx`, `demo-video/src/teacher/mocks/SwapModalMock.tsx`, `demo-video/src/teacher/mocks/HomeroomShellMock.tsx`; Modify `gallery/schedule.tsx`
**Source:** `src/app/homeroom/schedule/page.tsx`(달력·범례·토일 토글·누계 버튼·교체 줄·교체 모달·다른 학년 경고), `src/components/homeroom/SupervisorSummaryModal.tsx`, `src/app/homeroom/layout.tsx`(lg 이상 헤더 안 탭: 로고 "출석부", 탭 7개 활성 blue-50/700, 담임 반 칩 "1-2", 벨, 이름, 로그아웃)
**Consumes:** `SUPERVISOR_SEPT`, `SWAP_EXAMPLE`, `SUPERVISOR_SUMMARY`, `TEACHERS`, `ME`, `TODAY`

**Interfaces (Produces):**
```ts
export type HomeroomTab = "students" | "attendance" | "participation" | "absenceReasons" | "absenceRequests" | "schedule" | "password";
export const HomeroomShellMock: React.FC<{ tab: HomeroomTab; role: "homeroom" | "supervisor"; showHelp?: boolean; tabPressAt?: { tab: HomeroomTab; at: number }; children: React.ReactNode }>; // 1248×570 논리 뷰포트 전체, 본문 영역은 헤더 아래
export const homeroomTabPoint: (tab: HomeroomTab, role: "homeroom" | "supervisor") => Point;
export const HOMEROOM_BODY: Rect; // 헤더 아래 본문 영역

export const ScheduleCalendarMock: React.FC<{ width: number; month: "2026-09"; assignments: typeof SUPERVISOR_SEPT; highlightTeacher: string; today: string; weekendOn?: boolean; rowPressAt?: { date: string; grade: 1 | 2 | 3; at: number }; totalsPressAt?: number; changedCell?: { date: string; grade: 1 | 2 | 3; from: number } }>;
export const schedulePoint: (key: "totals" | "weekendToggle" | "legend" | `row_${string}_${1 | 2 | 3}`, width: number) => Point;
export const scheduleRect: (key: "legend" | `day_${string}` | `row_${string}_${1 | 2 | 3}`, width: number) => Rect;

export const SwapModalMock: React.FC<{ date: string; grade: number; search: { text: string; typeFrom?: number }; dropdownOpenAt?: number; pickAt?: number; picked?: string; otherGrade?: boolean; reason: { text: string; typeFrom?: number }; confirmPressAt?: number; busy?: boolean }>;
export const swapModalPoint: (key: "search" | `option_${string}` | "reason" | "confirm" | "cancel") => Point;

export const SupervisorSummaryMock: React.FC<{ months: string[]; rows: typeof SUPERVISOR_SUMMARY.rows; me: string; openAt?: number }>;
export const summaryRect: (key: "table" | "myRow") => Rect;
```
- 모달 두 개는 1248×570 뷰포트 위 반투명 배경 + 가운데 패널로 그린다.
- 갤러리(1248×570): `Mock-Schedule`, `Mock-SwapModal`(검색 드롭다운 열림), `Mock-SwapModal-OtherGrade`(경고 + "확인 후 교체"), `Mock-SupervisorSummary`, `Mock-HomeroomShell`(본문 비움).

- [ ] 소스 읽기 → 구현 → 갤러리 스틸 확인 → lint → 커밋, 메시지 `Add supervisor schedule, swap, summary, and homeroom shell mocks`

---

### Task 6: 담임 표 목업 — 주간 출결·월간출결·참여설정 (병렬)

**Files:** Create `demo-video/src/teacher/mocks/HomeroomWeeklyMock.tsx`, `demo-video/src/app-mocks/MonthlyAttendanceMock.tsx`, `demo-video/src/app-mocks/ParticipationTableMock.tsx`; Modify `gallery/homeroom-tables.tsx`
**Source:** `src/app/homeroom/page.tsx`(주간표·주 이동·범례·툴팁·비고 *·합계), `src/app/homeroom/attendance/page.tsx`(월간·범례 접기·반별 섹션·시간 열·Excel), `src/app/homeroom/participation/page.tsx`(담임 참여설정 18열·참가 체크·요일 버튼 44×44·방과후 체크·합계), 학년관리 변형 참고용 `src/components/admin-shared/ParticipationManagement.tsx`·`src/components/grade-admin/GradeMonthlyAttendance.tsx`(이번에는 `variant: "homeroom"`만 구현하되 props에 `variant` 자리를 둔다)
**Consumes:** `HOMEROOM_WEEK`, `HOMEROOM_MONTH`, `HOMEROOM_PARTICIPATION`, `STUDENTS`

**Interfaces (Produces):**
```ts
export const HomeroomWeeklyMock: React.FC<{ width: number; height: number; tooltip?: { studentNo: number; day: number; session: "afternoon1" | "afternoon2" | "night"; from: number }; highlightRow?: "totals" }>;
export const homeroomWeeklyRect: (key: "weekNav" | "legend" | "table" | "totals" | `cell_${number}_${number}_${"afternoon1" | "afternoon2" | "night"}`, width: number) => Rect;

export const MonthlyAttendanceMock: React.FC<{ variant: "homeroom"; width: number; height: number; legendOpen?: boolean; scrollX?: number; excelPressAt?: number }>;
export const monthlyRect: (key: "monthNav" | "excel" | "legendToggle" | "hoursColumn" | "table", variant: "homeroom", width: number) => Rect;

export type ParticipationRow = typeof HOMEROOM_PARTICIPATION[number];
export const ParticipationTableMock: React.FC<{ variant: "homeroom"; width: number; height: number; rows: ParticipationRow[]; scrollX?: number; savingFrom?: number; toggle?: { studentNo: number; session: "afternoon1" | "afternoon2" | "night"; control: "participating" | `day_${number}` | `afterSchool_${number}`; at: number } }>;
export const participationRect: (key: `control_${number}_${string}_${string}` | "header" | "totals", variant: "homeroom", width: number, scrollX?: number) => Rect;
```
- 기호 색: O green-700, X red-700, △ orange-500, 방 yellow-600(+ yellow-50 배경), - gray-400, 미참가 칸 gray-100. 표 헤더·인덱스 열 sticky 모양(불투명 배경) 유지.
- 갤러리(1248×520, 헤더 셸 없이 본문만): `Mock-HomeroomWeekly`, `Mock-HomeroomMonthly`, `Mock-HomeroomParticipation`.

- [ ] 소스 읽기 → 구현 → 갤러리 스틸 확인 → lint → 커밋, 메시지 `Add homeroom weekly, monthly, and participation table mocks`

---

### Task 7: 담임 폼 목업 — 불참사유등록·불참신청 관리·비밀번호 (병렬)

**Files:** Create `demo-video/src/teacher/mocks/AbsenceReasonFormMock.tsx`, `HomeroomRequestsMock.tsx`, `PasswordFormMock.tsx`; Modify `gallery/homeroom-forms.tsx`
**Source:** `src/app/homeroom/absence-reasons/page.tsx`, `src/app/homeroom/absence-requests/page.tsx`, `src/app/homeroom/password/page.tsx`
**Consumes:** `ABSENCE_REASON_EXAMPLE`, `ABSENCE_REQUESTS`(1-2반 것만 + 표 채움용으로 1-2반 학생 가상 신청 3건 추가 가능), `STUDENTS`

**Interfaces (Produces):**
```ts
export const AbsenceReasonFormMock: React.FC<{ width: number; step: { student?: number; date?: number; session?: number; reason?: number; detailTypeFrom?: number; submitPressAt?: number; successFrom?: number }; selectOpen?: { from: number; to: number } }>; // 각 값은 그 입력이 채워지는 프레임
export const absenceReasonPoint: (key: "student" | "date" | "session_afternoon1" | "session_afternoon2" | "session_night" | "reason_academy" | "reason_afterschool" | "reason_illness" | "reason_custom" | "detail" | "submit" | "success", width: number) => Point;

export const HomeroomRequestsMock: React.FC<{ width: number; filter: "all" | "pending" | "approved" | "rejected"; approvePressAt?: { requestId: number; at: number }; approvedIds?: number[] }>;
export const homeroomRequestsPoint: (key: `filter_${string}` | `approve_${number}` | `reject_${number}` | "table" | "total", width: number) => Point;

export const PasswordFormMock: React.FC<{ width: number; current: { typeFrom?: number }; next: { typeFrom?: number }; confirm: { typeFrom?: number }; submitPressAt?: number; successFrom?: number }>;
export const passwordPoint: (key: "current" | "next" | "confirm" | "submit" | "success", width: number) => Point;
```
- 문구: "불참사유 등록"·"학생"("학생을 선택하세요", 항목 "1-2 5번 안지호")·"날짜"·"자습 시간"(오후1 자습/오후2 자습/야간자습)·"사유 유형"(학원/방과후/질병/기타)·"상세 사유 (선택)"·버튼 "불참사유 등록"·성공 "불참사유가 등록되었습니다." / "불참신청 관리"·필터 전체/대기중/승인/반려·표 학생/날짜/시간/사유/상세/상태/처리·"총 N건" / "비밀번호 변경"·현재 비밀번호/새 비밀번호/새 비밀번호 확인·버튼·성공 "비밀번호가 변경되었습니다." 비밀번호 입력은 `•`로 표시.
- 갤러리(1248×520): `Mock-AbsenceReasonForm`(모두 채움 + 성공), `Mock-HomeroomRequests`, `Mock-PasswordForm`.

- [ ] 소스 읽기 → 구현 → 갤러리 스틸 확인 → lint → 커밋, 메시지 `Add homeroom absence reason, requests, and password form mocks`

---

### 게이트: 사용자 음성 청취 승인 (오케스트레이터)

계획 1 태스크 6의 청취 확인 결과를 반영한다. 원고 문장 수가 바뀐 장면이 있으면 `teacher/narration.ts`·`SPOKEN` 수정 → `node scripts/narrate.mjs --guide teacher --only <keys>` → `narration-durations.json` 갱신 커밋. **승인 전에는 태스크 8~11을 시작하지 않는다.** 장면 태스크 dispatch에는 승인된 원고 기준 장면별 문장 번호를 적어 준다.

---

### Task 8: 장면 — Intro · Login · AttendanceTour · SeatTap · CopySession (병렬)

### Task 9: 장면 — SeatColors · LongPress · WeeklyInfo · AbsenceTab · BulkApprove (병렬)

### Task 10: 장면 — SwapEntry · SwapModal · SwapTotals · HomeroomTour (병렬)

### Task 11: 장면 — HomeroomWeekly · HomeroomMonthly · HomeroomParticipation · AbsenceReason · HomeroomRequests · Password · Outro (병렬)

네 태스크의 공통 절차 — 각자 `demo-video/src/teacher/scenes/<Id>Scene.tsx` 스텁만 교체한다(`scenes.ts`·`Root.tsx`·목업 파일은 수정 금지; 목업 버그를 찾으면 고치지 말고 보고서에 적는다).

**Files:** Modify: 담당 장면 스텁 파일들만
**Consumes:** 태스크 1 `timing.ts`(`lineAt`·`lineStart`·`lineEnd`), `layout.tsx`, `primitives.tsx`, `data.ts`; 태스크 2~7 목업과 좌표 함수; `src/components/{Cursor,Annotation,FlashNotice,BrowserFrame,PhoneFrame}.tsx`, `phone.ts`(`PHONE_X`·`PHONE_Y`·`phoneAbs`·`phoneRectAbs`·`phoneLeftLabelGap`)
**참고 구현:** `/Volumes/Chois_SD2/dev/school_cowork/demo-video/src/todos/scenes/QuickAddScene.tsx`(Stage 분리·커서 경로·주석 타이밍), `/Volumes/Chois_SD2/dev/school_cowork/demo-video/src/classroom/scenes/`(폰 장면 좌표)

**장면별 화면 동작** — 스펙 5절 표의 "화면 상태" 칸이 기준이다. 문장 n이 말하는 대상을 그 문장 시간(`lineAt(id, n, 0.1~0.9)`) 안에 커서·누름·주석으로 보여준다. 추가 규칙:

| 장면 | 틀 | 반드시 보여줄 것 |
|---|---|---|
| Intro | 없음 | `appName`, 제목 "교사 사용 안내", 목차 칩 5개(로그인·출석 체크·불참신청 승인·감독 교체·담임교사 메뉴) 스태거 등장. 인트로라 배경 메시 허용 |
| Login | 폰 | 폰 주소창 URL이 `self.posan.kr`로 타이핑(문장0) → 로그인 카드 교사 탭 강조(1) → ID `parkjh01`·비밀번호 `••••` 타이핑, "NEIS 아이디"·"초기 1111" 주석(2) → 로그인 누름·"로그인 중..."(2 끝) → 문장3 동안 `?`/비밀번호 예고 문구 FlashNotice |
| AttendanceTour | 폰 | 날짜 바 요소를 문장1 흐름대로 순차 주석(날짜→감독→학년→카운트), 다른학년(2), 탭 4개(3) |
| SeatTap | 폰 | 1-1반 한 좌석: 파랑(0) → 탭 초록 + 카운트 출석+1/미체크-1(1) → 탭 빨강(2) → 탭 파랑(3) → "자동 저장" 주석(4) → 탭 줄 강조(5) |
| CopySession | 폰 | 오후2 탭 선택 → 복사 버튼 강조(0) → 누름 → confirm → 확인 → 좌석들이 스태거로 초록/빨강 채워짐(1) → alert "N명 복사, M명은…" + 건너뛴 좌석(1-2 5번, 불참승인·비참여) 주석(2) |
| SeatColors | 폰 | 불참승인(1)·방과후(2, 탭 시 테두리 초록)·`*`(3)·회색(4) 좌석 각각 주석, 범례로 스크롤(5) |
| LongPress | 폰 | 회색 좌석 탭 → 흔들림 없이 무반응(0) → 꾹 누름 진행 링 0.5초(1~2) → 파랑 → 탭 초록(2) → 오후2 탭 전환 시 회색 복귀 + 오후1로 돌아오면 초록 유지(3) |
| WeeklyInfo | 폰 | 좌석 "i" 탭 → 주간 모달(0) → 비고 칸 타이핑 후 blur(1) → 참여시간·순위 주석(2) |
| AbsenceTab | 폰 | 불참신청 탭 + 배지 강조(0~1) → 필터·카드 주석(2) → 승인 누름 → confirm → 카드 퇴장(3) → 오후1 탭으로 가서 해당 좌석 노란 "불참승인"(4) → 다시 불참신청 탭 반려 버튼 주석(5) |
| BulkApprove | 폰 | 일괄승인 (3) 버튼(0) → 모달 표(1) → 일괄승인 누름 → alert "3건을 승인했습니다."(2) |
| SwapEntry | PC | 출석부 PC 헤더의 "감독일정" 칩 누름 → 감독일정 달력(0~1, 담임은 "담임교사"→감독일정 탭 짧은 인셋) → 노란 내 배정 줄·범례 주석(2) |
| SwapModal | PC | 9/24 1학년 줄 "교체" 강조(0) → 누름 → 모달(1) → "이수" 타이핑·드롭다운 선택·사유 "출장"(2) → 교체 → 달력 9/24 1학년 이름 이수민으로 변경(3) → 다른 학년 교사 선택 시 경고·"확인 후 교체" 인셋(4) → 문장5 FlashNotice |
| SwapTotals | PC | 누계 누름 → 모달(0) → 내 줄 강조(1) |
| HomeroomTour | PC | 출석부 헤더 "담임교사" 누름 → 담임 셸(0~1) → 탭 7개 순차 강조(2) → 비담임 셸(탭 2개) 인셋(3) |
| HomeroomWeekly | PC | 셸 tab students + 주간표: 표(0) → 주 이동(1) → 범례·기호(2) → △ 툴팁·비고 *(3) → 합계 줄(4) |
| HomeroomMonthly | PC | tab attendance: 날짜 3칸(1) → 시간 열(1) → 월 이동·Excel 누름(2) |
| HomeroomParticipation | PC | tab participation: 참가 체크·요일 버튼 주석(1) → 참가 끄기 연출(2) → 요일 버튼 끄기(3) → 방과후 체크 켜기 + 폰 출석부 노란 좌석 작은 인셋(4) → 저장 중 표시 + 회색 좌석 인셋(5) |
| AbsenceReason | PC | tab absenceReasons: 학생 선택(1)·날짜·오후1 → 학원·상세 "수학 학원"·등록 누름·성공(2) → 월간 △ / 출석부 빨강 결석 인셋(3) |
| HomeroomRequests | PC | tab absenceRequests: 표(0) → 대기중 필터·승인 누름 → confirm(1) → 처리 열 교사 이름 주석(2) |
| Password | PC | tab password: 세 칸 타이핑·변경 누름(1) → 성공 + "4자 이상"·"1111 변경" 주석(2) |
| Outro | 없음 | "지금까지…" 요약 카드 → 출석부 헤더 `?` 버튼 확대 강조 + "도움말 self.posan.kr/help" 문구(1). 아웃트로라 배경 메시 허용 |

**절차 (장면마다):**
- [ ] Step 1: 스펙 5절 해당 행·위 표·승인된 원고 문장 번호 확인, 사용할 목업 갤러리 스틸 한 번 보기
- [ ] Step 2: `Stage`(목업 조합, 프레임별 상태 계산) + 장면 컴포넌트(커서·주석·FlashNotice) 작성
- [ ] Step 3: 문장마다 `lineAt(id, n, 0.6)` 프레임 스틸을 뽑아(`npx remotion still Teacher-<Id> out/check/<Id>-<n>.png --frame=<f>`, 프레임 값은 `node scripts/frame-at.mjs teacher <Id> <n> 0.6`) Read로 확인 → 수정 반복. 주석이 다른 요소를 가리지 않는지, 폰 장면 왼쪽 주석 라벨이 `phoneLeftLabelGap`으로 폰 밖에서 끝나는지 확인
- [ ] Step 4: `npm run lint`
- [ ] Step 5: 커밋(자기 장면 파일만), 메시지 `Build teacher guide scenes: <Id 목록>`

---

### Task 12: 안내 페이지 스틸 (순차, 태스크 8~11 뒤)

**Files:** Create `demo-video/src/stills/attendance.ts`, `demo-video/src/stills/homeroom.ts`; Generate `public/guide/attendance/*.webp`, `public/guide/homeroom/*.webp`

- 폰 스틸: `{ composition, file, frame, crop: PHONE_CROP, resize: 640 }`. PC 스틸: `crop` 생략(DEFAULT_CROP).
- `attendance.ts` 목록(frame은 `lineAt`):
  - `01-login` Teacher-Login 2,0.8 · `02-board` Teacher-AttendanceTour 3,0.7 · `03-seat-present` Teacher-SeatTap 1,0.8 · `04-seat-absent` Teacher-SeatTap 2,0.8 · `05-copy` Teacher-CopySession 2,0.6 · `06-seat-colors` Teacher-SeatColors 3,0.7 · `07-long-press` Teacher-LongPress 2,0.8 · `08-weekly-info` Teacher-WeeklyInfo 2,0.6 · `09-absence-tab` Teacher-AbsenceTab 2,0.6 · `10-absence-approved` Teacher-AbsenceTab 4,0.7 · `11-bulk-approve` Teacher-BulkApprove 1,0.7 · `12-schedule` Teacher-SwapEntry 2,0.7 · `13-swap-modal` Teacher-SwapModal 2,0.9 · `14-swap-totals` Teacher-SwapTotals 1,0.6
- `homeroom.ts`: `01-tabs` Teacher-HomeroomTour 2,0.8 · `02-weekly` Teacher-HomeroomWeekly 2,0.7 · `03-monthly` Teacher-HomeroomMonthly 1,0.7 · `04-participation` Teacher-HomeroomParticipation 4,0.6 · `05-absence-reason` Teacher-AbsenceReason 2,0.9 · `06-requests` Teacher-HomeroomRequests 1,0.8 · `07-password` Teacher-Password 2,0.6

- [ ] Step 1: 목록 작성 → Step 2: `cd demo-video && node scripts/guide-stills.mjs --page attendance && node scripts/guide-stills.mjs --page homeroom`
- [ ] Step 3: 모든 WebP를 Read로 확인. 주석이 잘렸거나 전환 중 프레임이면 비율 보정 후 `--only`로 재생성. 장당 150KB·페이지 합 2MB 이하 확인(`du -ch public/guide/attendance/*.webp | tail -1`)
- [ ] Step 4: 크기 기록 — `for f in public/guide/*/*.webp; do ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$f"; done` (가로 1280×656, 폰 640×1342 예상; 실제 값을 태스크 13 dispatch에 전달)
- [ ] Step 5: 커밋 `-- demo-video/src/stills/attendance.ts demo-video/src/stills/homeroom.ts public/guide/attendance public/guide/homeroom`, 메시지 `Export guide stills for attendance and homeroom help pages`

---

### Task 13: `/help/attendance`·`/help/homeroom` 페이지 + `?` 버튼 + 허브 링크 (순차, 태스크 12 뒤)

**Files:**
- Create: `src/app/help/attendance/page.tsx`, `src/app/help/attendance/content.mdx`, `src/app/help/homeroom/page.tsx`, `src/app/help/homeroom/content.mdx`
- Modify: `src/app/attendance/layout.tsx`(헤더 오른쪽 묶음, 로그아웃 앞에 `<GuideHelpButton href="/help/attendance" />`), `src/app/homeroom/layout.tsx`(헤더 오른쪽 묶음, 로그아웃 앞에 `<GuideHelpButton href="/help/homeroom" />`), `src/app/help/content.mdx`(감독교사 기능 절·담임교사 기능 절 첫 문단 뒤에 각각 링크 한 줄)
- Modify: `.claude/GUIDE_PAGES.md` 1절(`기본안` 표기 → 확정: 빌딩 블록 목록에 `GuideArticle`·`GuideHelpButton` 추가, `?` 버튼 = 새 탭 링크, 영상 = `GuideVideo` `start` prop), 6절(색 출처 규칙 한 줄: 앱 화면 목업 색은 `src/app-mocks/tw.ts`), 7절 진행 현황에 attendance·homeroom 행
- Test: `tests/guide-attendance.test.ts`, `tests/guide-homeroom.test.ts`

**Interfaces:** Consumes `GuideArticle`·`GuideToc`·`GuideChapter`·`GuideStep`·`GuideNotice`·`GuideVideo`·`GuideHelpButton`(계획 1 태스크 3), 스틸 파일·크기(태스크 12)

**페이지 구성**
- `page.tsx`(두 페이지 같은 형태):

```tsx
import type { Metadata } from "next";
import { GuideArticle } from "@/components/guide/GuideArticle";
import Content from "./content.mdx";

export const metadata: Metadata = {
  title: "출석부 사용 가이드 | 포산고 자율학습",
  description: "감독교사 출석 체크, 불참신청 승인, 감독 교체 방법",
};

export default function AttendanceGuidePage() {
  return (
    <GuideArticle>
      <Content />
    </GuideArticle>
  );
}
```
(homeroom: title `"담임교사 메뉴 사용 가이드 | 포산고 자율학습"`, description `"담임교사 주간·월간 출결, 참여설정, 불참사유 등록, 불참신청, 비밀번호"`, 함수명 `HomeroomGuidePage`)

- `attendance/content.mdx`: `# 출석부 사용 가이드` + 대상 문장("모든 선생님 — 감독교사로 출석을 체크하거나 불참신청을 승인할 때") + `GuideVideo videoKey="teacher" caption="교사 사용 안내 영상"` + `GuideToc`(체크·불참신청·감독교체) + 챕터 3개:
  - `check` "출석 체크": 1 로그인(01) · 2 출석 체크(02, 03, 04) · 3 오후1 결과 복사(05) · 4 좌석 색 읽기(06) · 5 꾹 눌러 활성화(07) · 6 주간 정보(08)
  - `absence` "불참신청": 7 불참신청 승인(09, 10) · 8 일괄승인(11)
  - `swap` "감독 교체": 9 감독 교체(12, 13, 14)
  - `GuideNotice tone="yellow" title="알아 둘 점"`: ["일괄승인", "오늘 이 학년 감독으로 배정된 선생님만 오늘 신청을 한꺼번에 승인할 수 있습니다."], ["감독 교체", "교체하면 그날 오후1·오후2·야간이 바로 바뀌고 기록이 남습니다. 상대 선생님과 먼저 이야기해 주세요."], ["초기 비밀번호", "처음 로그인한 뒤 담임교사 페이지의 비밀번호 탭에서 꼭 바꿔 주세요."]
- `homeroom/content.mdx`: `# 담임교사 메뉴 사용 가이드` + 대상 문장("담임 선생님 — 출석부 위쪽 담임교사 버튼") + `GuideVideo videoKey="teacher" start={0} caption="교사 사용 안내 영상 — 담임교사 메뉴 부분"`(start는 태스크 14에서 실제 초로 교체) + `GuideToc`(출결·설정·신청) + 챕터 3개:
  - `records` "출결 확인": 1 담임 메뉴(01) · 2 주간 출결(02) · 3 월간출결(03)
  - `settings` "참여와 사유": 4 참여설정(04) · 5 불참사유등록(05)
  - `requests` "신청과 계정": 6 불참신청(06) · 7 비밀번호(07)
  - `GuideNotice`: ["담임이 아닌 선생님", "감독일정과 비밀번호 탭만 보입니다."], ["불참사유등록", "출결표에는 △ 사유결석, 출석부 좌석에는 결석으로 표시됩니다."], ["참여설정", "누르는 즉시 저장되고 출석부의 회색·노란 좌석에 바로 반영됩니다."]
- 단계 설명은 스펙 5절 해당 장면 내레이션을 2~4문장 "~합니다"체로 다듬고, 팁은 1문장. 이미지 `alt`는 화면 설명 한 줄. 이미지 width/height는 태스크 12 Step 4 실측값, 폰 이미지는 `tall: true`.
- 허브 링크 문장: 감독교사 절 — `자세한 사용법은 [출석부 사용 가이드](/help/attendance)에서 화면과 함께 볼 수 있습니다.`, 담임교사 절 — `자세한 사용법은 [담임교사 메뉴 사용 가이드](/help/homeroom)에서 볼 수 있습니다.`

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/guide-attendance.test.ts`(homeroom은 `PAGE`·`LAYOUT`·버튼 href만 바꾼 같은 파일):

```ts
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
```
(homeroom 테스트는 `images.length >= 7`)

- [ ] Step 2: 실패 확인 `npx tsx tests/guide-attendance.test.ts` → FAIL `ENOENT … page.tsx`
- [ ] Step 3: 두 페이지·MDX·버튼·허브 링크 작성
- [ ] Step 4: 통과 확인 — `npx tsx tests/guide-attendance.test.ts && npx tsx tests/guide-homeroom.test.ts && npx tsx tests/guide-components.test.ts && npx tsx tests/help-mdx.test.ts && npx tsx tests/responsive-tables.test.ts && npx tsx tests/notification-bell-placement.test.ts && npx tsc --noEmit && npm run lint`
- [ ] Step 5: `npm run build` — 출력 라우트 표에서 `/help/attendance`·`/help/homeroom`이 `○ (Static)`인지 확인
- [ ] Step 6: `npm run dev` 후 Playwright로 로그아웃 상태 `/help/attendance`·`/help/homeroom`을 375·768·1280px에서 스크린샷(가로 스크롤 없음, 제목·칩 줄바꿈 없음, 폰 이미지 320px 이하), 로그인 화면이 아닌지 확인. 확인 뒤 dev 서버 종료
- [ ] Step 7: `.claude/GUIDE_PAGES.md` 1·6·7절 갱신
- [ ] Step 8: 커밋 `-- src/app/help/attendance src/app/help/homeroom src/app/attendance/layout.tsx src/app/homeroom/layout.tsx src/app/help/content.mdx tests/guide-attendance.test.ts tests/guide-homeroom.test.ts .claude/GUIDE_PAGES.md`, 메시지 `Add attendance and homeroom guide pages with help buttons`

---

### Task 14: 본편 렌더·검수·문서 (오케스트레이터)

- [ ] Step 1: `cd demo-video && npx remotion render TeacherGuide out/teacher-guide.mp4` — 길이 `ffprobe`로 확인(원고 합 + 장면 여백 − 전환 겹침과 일치)
- [ ] Step 2: 영상에서 장면 경계마다 한 프레임(`ffmpeg -ss <t> -frames:v 1`)을 뽑아 Read로 확인, 음성·자막 싱크 표본 3곳 확인
- [ ] Step 3: `HomeroomTour` 장면 시작 초를 계산해(`TEACHER_SCENES` 누적 − 전환) `src/app/help/homeroom/content.mdx`의 `start` 값을 교체, 커밋
- [ ] Step 4: `responsive-ui-reviewer` 에이전트로 `src/app/help/attendance`·`homeroom`·`src/components/guide/*`·두 레이아웃 `?` 버튼 점검 → 위반은 같은 세션에서 수정·재검수(메모리 규칙)
- [ ] Step 5: `project-map-updater` 에이전트로 PROJECT_MAP 갱신(`/help/*` 라우트, `src/components/guide`, demo-video `app-mocks`·`teacher`, `public/guide/`)
- [ ] Step 6: 사용자에게 `out/teacher-guide.mp4` 경로와 페이지 확인 방법 전달, YouTube 업로드 후 id를 받으면 `videos.ts`에 기록(계획 4 마무리에서 일괄)
