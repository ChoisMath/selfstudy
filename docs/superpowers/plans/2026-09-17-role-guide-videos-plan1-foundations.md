# 역할별 안내 영상 — 계획 1: 선행 수정 · 공용 기반 · 원고와 음성

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 영상에서 안내할 기능의 차단 버그 2건을 고치고, 안내 페이지 공용 뼈대·폰 틀을 만들고, 세 편의 원고를 Chois 음성으로 생성해 사용자 청취 확인까지 도달한다.

**Architecture:** 서로 파일이 겹치지 않는 4개 트랙을 병렬로 진행한다. 트랙 A(앱 API 수정)·트랙 D(앱 `/help` 뼈대)·트랙 C(demo-video 폰 틀)는 서브에이전트가, 트랙 B(원고·TTS — 로컬 MLX를 한 번에 하나만 돌려야 함)는 오케스트레이터가 맡는다. 장면·목업·안내 페이지 본문은 계획 2 이후.

**Tech Stack:** Next.js 16 App Router + TypeScript + Tailwind 4 + MDX, `node:assert` 계약 테스트(`npx tsx`), Remotion 4.0.518, mlx-audio Qwen3-TTS(`narrate.mjs`).

**Spec:** `docs/superpowers/specs/2026-09-17-role-guide-videos-design.md`

## Global Constraints

- 한국어 UI 문구, 식별자는 영어. 주석은 "왜"가 비자명할 때만(`~/.claude/rules/coding-style.md`).
- 반응형 규칙: 라벨·칩·제목 `whitespace-nowrap`, 문단 `break-keep`, `break-words`/`break-all` 금지, 터치 타겟 `min-h-11`(`min-w-11`), `100vh`·`min-h-screen` 금지(`min-h-dvh`).
- `demo-video/`는 루트 tsc·eslint·Tailwind에서 제외 상태 유지. demo-video 공용 코드(`anim.ts`·`components/*`·`guide/*`)는 리팩터링하지 않는다.
- 음성용 문장(`SPOKEN` 적용 후)은 `[가-힣\s.,·]`만 허용.
- 테스트 실행: 저장소 루트에서 `npx tsx tests/<name>.test.ts`.
- **커밋 규칙(병렬 작업 중)**: 다른 트랙이 같은 인덱스를 쓰므로 반드시 자기 파일만 지정한다 — `git add <paths> && git commit -m "<message>" -- <paths>`. `index.lock` 오류면 몇 초 뒤 같은 명령을 다시 실행한다. `git add -A`/`git add .`/`git commit -a` 금지.
- 커밋 메시지 마지막 줄은 **정확히** 다음과 같다(모델 이름을 바꾸지 말 것):
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

## 병렬 실행 지도

| 트랙 | 태스크 | 담당 | 건드리는 파일 | 의존 |
|---|---|---|---|---|
| A | 1 → 2 | 서브에이전트 1개(순서대로) | `src/app/api/auth/change-password/route.ts`, `src/app/api/{admin,grade-admin/[grade]}/students/template/`, `src/components/students/StudentManagement.tsx`, `tests/change-password-auth.test.ts`, `tests/student-template-route.test.ts` | 없음 |
| D | 3 | 서브에이전트 1개 | `src/app/help/layout.tsx`, `src/app/help/page.tsx`, `src/components/guide/*`, `tests/guide-components.test.ts`, `tests/responsive-tables.test.ts` | 없음 |
| C | 4 | 서브에이전트 1개 | `demo-video/src/components/PhoneFrame.tsx`, `demo-video/src/components/phone.ts`, `.claude/GUIDE_PAGES.md`(3절 폰 문단만) | 없음 |
| B | 5 → 6 | 오케스트레이터 | `demo-video/src/{teacher,student,grade-admin}/narration.ts`, `narration-durations.json`, `demo-video/scripts/narrate.mjs`(`GUIDES`), `demo-video/public/narration/{teacher,student,grade-admin}/` | 없음 |

모든 트랙이 끝나면 태스크 7(통합 검수)을 오케스트레이터가 실행한다. **태스크 6 끝에서 사용자 청취 확인을 받기 전에는 장면 작업(계획 2)을 시작하지 않는다.**

---

### Task 1: 모든 교사가 비밀번호를 바꿀 수 있게 (트랙 A)

**Files:**
- Modify: `src/app/api/auth/change-password/route.ts:7-8`
- Test: `tests/change-password-auth.test.ts` (신규)

**Interfaces:**
- Consumes: `withAuth(roles, handler)` — `src/lib/api-auth.ts`. `"teacher"` 의사역할은 `userType === "teacher"`인 모든 교사를 허용한다(`api-auth.ts:45-46`).
- Produces: 없음(동작 변경만).

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/change-password-auth.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const route = readFileSync(join(process.cwd(), "src/app/api/auth/change-password/route.ts"), "utf8");

// 관리자 화면·Excel 로 등록한 교사는 역할이 비어 있어 역할 목록으로 막으면 비담임 교사가 비밀번호를 못 바꾼다.
assert.match(route, /withAuth\(\s*\["teacher"\]/, "change-password: 모든 교사(teacher 의사역할) 허용");
assert.doesNotMatch(route, /"supervisor"/, "change-password: 역할 목록으로 제한하지 않음");
assert.match(route, /user\.userType !== "teacher"/, "change-password: 학생 차단 검사 유지");

console.log("change-password-auth checks passed");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/change-password-auth.test.ts`
Expected: FAIL — `change-password: 모든 교사(teacher 의사역할) 허용`

- [ ] **Step 3: 구현**

`src/app/api/auth/change-password/route.ts` 7-8행을 바꾼다:

```ts
export const POST = withAuth(
  ["teacher"],
  async (req: Request, user) => {
```

- [ ] **Step 4: 통과 확인**

Run: `npx tsx tests/change-password-auth.test.ts`
Expected: `change-password-auth checks passed`

- [ ] **Step 5: 커밋**

```bash
git add tests/change-password-auth.test.ts src/app/api/auth/change-password/route.ts && git commit -m "Allow every teacher to change their password

Teachers created from the admin screen or Excel upload have no roles, so the
admin/homeroom/supervisor role list returned 403 for non-homeroom teachers.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>" -- tests/change-password-auth.test.ts src/app/api/auth/change-password/route.ts
```

---

### Task 2: 학년관리자도 학생 Excel 템플릿을 받게 (트랙 A)

**Files:**
- Move: `src/app/api/admin/students/template/route.ts` → `src/app/api/grade-admin/[grade]/students/template/route.ts`
- Modify: `src/components/students/StudentManagement.tsx:349`
- Test: `tests/student-template-route.test.ts` (신규)

**Interfaces:**
- Consumes: `withGradeAuth(grade, handler)` — `src/lib/api-auth.ts:70`, admin 또는 해당 학년 sub_admin 허용. `src/middleware.ts`는 `/api/grade-admin/N/*`을 admin·해당 학년 sub_admin에게 통과시킨다.
- Produces: `GET /api/grade-admin/[grade]/students/template` → xlsx(시트 "학생 목록", 열 학년·반·번호·이름, 예시 행 학년 = 경로 학년).

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/student-template-route.test.ts`:

```ts
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const NEW_ROUTE = "src/app/api/grade-admin/[grade]/students/template/route.ts";
const OLD_ROUTE = "src/app/api/admin/students/template/route.ts";

// middleware 가 /api/admin/* 을 admin 전용으로 막아 학년관리자가 템플릿을 받지 못했다.
assert.ok(existsSync(join(root, NEW_ROUTE)), "학년관리 경로에 템플릿 라우트가 있어야 함");
assert.ok(!existsSync(join(root, OLD_ROUTE)), "admin 전용 경로의 템플릿 라우트는 제거");

const route = read(NEW_ROUTE);
assert.match(route, /withGradeAuth\(grade,/, "템플릿 라우트는 withGradeAuth 로 학년 권한 확인");
assert.match(route, /addWorksheet\("학생 목록"\)/);
assert.match(route, /addRow\(\{ grade, classNumber: 1, studentNumber: 1, name: "홍길동" \}\)/, "예시 행 학년은 경로 학년");

const management = read("src/components/students/StudentManagement.tsx");
assert.match(management, /templateUrl=\{`\/api\/grade-admin\/\$\{grade\}\/students\/template`\}/);

const walk = (dir: string): string[] =>
  readdirSync(join(root, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    return statSync(join(root, rel)).isDirectory() ? walk(rel) : [rel];
  });
const stale = walk("src").filter((file) => read(file).includes("/api/admin/students/template"));
assert.deepEqual(stale, [], "옛 템플릿 URL 참조가 남아 있음");

console.log("student-template-route checks passed");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/student-template-route.test.ts`
Expected: FAIL — `학년관리 경로에 템플릿 라우트가 있어야 함`

- [ ] **Step 3: 라우트 이동**

```bash
mkdir -p "src/app/api/grade-admin/[grade]/students/template"
git mv src/app/api/admin/students/template/route.ts "src/app/api/grade-admin/[grade]/students/template/route.ts"
```

그다음 새 파일 전체를 다음으로 바꾼다:

```ts
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { withGradeAuth } from "@/lib/api-auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ grade: string }> }
) {
  const { grade: gradeStr } = await params;
  const grade = parseInt(gradeStr, 10);

  if (isNaN(grade) || grade < 1 || grade > 3) {
    return NextResponse.json({ error: "잘못된 학년입니다." }, { status: 400 });
  }

  return withGradeAuth(grade, async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("학생 목록");

    sheet.columns = [
      { header: "학년", key: "grade", width: 10 },
      { header: "반", key: "classNumber", width: 10 },
      { header: "번호", key: "studentNumber", width: 10 },
      { header: "이름", key: "name", width: 20 },
    ];

    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE2E8F0" },
      };
      cell.border = {
        bottom: { style: "thin" },
      };
    });

    sheet.addRow({ grade, classNumber: 1, studentNumber: 1, name: "홍길동" });

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="student_template.xlsx"',
      },
    });
  })(req);
}
```

빈 폴더가 남으면 지운다: `rmdir src/app/api/admin/students/template 2>/dev/null; true`

- [ ] **Step 4: 컴포넌트 URL 변경**

`src/components/students/StudentManagement.tsx:349`:

```tsx
        templateUrl={`/api/grade-admin/${grade}/students/template`}
```

(`/admin/users`도 같은 컴포넌트를 쓰며 admin은 middleware에서 grade-admin 경로를 통과한다.)

- [ ] **Step 5: 통과 확인**

Run: `npx tsx tests/student-template-route.test.ts && npx tsc --noEmit`
Expected: `student-template-route checks passed`, tsc 오류 0

- [ ] **Step 6: 커밋**

```bash
git add tests/student-template-route.test.ts src/components/students/StudentManagement.tsx "src/app/api/grade-admin/[grade]/students/template/route.ts" && git commit -m "Serve the student Excel template from the grade-admin API

The middleware restricts /api/admin/* to admins, so grade admins got 403 on
the template download. The route now lives under /api/grade-admin/[grade]
with withGradeAuth and fills the example row with that grade.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>" -- tests/student-template-route.test.ts src/components/students/StudentManagement.tsx "src/app/api/grade-admin/[grade]/students/template/route.ts" src/app/api/admin/students/template/route.ts
```

---

### Task 3: `/help` 공용 레이아웃과 안내 페이지 빌딩 블록 (트랙 D)

**Files:**
- Create: `src/app/help/layout.tsx`
- Modify: `src/app/help/page.tsx` (헤더를 레이아웃으로 이동)
- Create: `src/components/guide/GuideArticle.tsx`, `GuideToc.tsx`, `GuideChapter.tsx`, `GuideStep.tsx`, `GuideNotice.tsx`, `GuideVideo.tsx`, `GuideHelpButton.tsx`, `videos.ts`
- Modify: `tests/responsive-tables.test.ts:142-150` (레이아웃 목록에 `help/layout.tsx` 추가)
- Test: `tests/guide-components.test.ts` (신규), 기존 `tests/help-mdx.test.ts` 통과 유지

**Interfaces:**
- Produces (계획 2~4의 MDX·화면이 쓴다):
  - `GuideArticle({ children })` — "← 도움말" 링크 + 흰 카드 article
  - `GuideToc({ items: { id: string; label: string }[] })` — 앵커 `#guide-<id>`
  - `GuideChapter({ id: string; title: string; children })` — `<section id="guide-<id>">`
  - `GuideStep({ number: number; title: string; images: GuideImage[]; tip?: string; children })`, `type GuideImage = { src: string; alt: string; width: number; height: number; tall?: boolean }`
  - `GuideNotice({ tone?: "blue" | "yellow" | "green"; title: string; items: [string, string][] })`
  - `GuideVideo({ videoKey: GuideVideoKey; start?: number; caption: string })` — id 빈 키는 `null`
  - `GuideHelpButton({ href: string })` — 새 탭, 44×44, `aria-label="사용 가이드"`
  - `GUIDE_VIDEOS: Record<GuideVideoKey, { id: string; title: string }>`, `type GuideVideoKey = "teacher" | "student" | "gradeAdmin"`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/guide-components.test.ts`:

```ts
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

console.log("guide-components checks passed");
```

- [ ] **Step 2: 실패 확인**

Run: `npx tsx tests/guide-components.test.ts`
Expected: FAIL — `src/components/guide/GuideArticle.tsx 없음`

- [ ] **Step 3: 레이아웃 분리**

`src/app/help/layout.tsx`:

```tsx
import Image from "next/image";

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-gray-50 text-gray-950">
      <header className="border-b border-blue-800 bg-blue-700 text-white">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          <Image src="/posan.svg" alt="포산고 로고" width={34} height={34} priority />
          <div>
            <p className="whitespace-nowrap text-xs font-medium text-blue-100">포산고 자율학습</p>
            <h1 className="whitespace-nowrap text-lg font-bold tracking-normal">사용설명서</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-2 py-4 sm:px-6 sm:py-8 lg:py-12">{children}</div>
    </main>
  );
}
```

`src/app/help/page.tsx` 전체:

```tsx
import type { Metadata } from "next";
import HelpContent from "./content.mdx";

export const metadata: Metadata = {
  title: "포산고 자율학습 도움말",
  description: "포산고 자율학습 출결 시스템 사용설명서",
};

export default function HelpPage() {
  return (
    <article className="rounded-lg border border-gray-200 bg-white px-3 py-5 shadow-sm sm:px-8 sm:py-10">
      <HelpContent />
    </article>
  );
}
```

- [ ] **Step 4: 빌딩 블록 작성**

`src/components/guide/videos.ts`:

```ts
export type GuideVideoKey = "teacher" | "student" | "gradeAdmin";

// YouTube 일부 공개 영상 id. 업로드 전에는 빈 문자열이고, 이때 GuideVideo 는 카드를 그리지 않는다.
export const GUIDE_VIDEOS: Record<GuideVideoKey, { id: string; title: string }> = {
  teacher: { id: "", title: "교사 사용 안내" },
  student: { id: "", title: "학생 사용 안내" },
  gradeAdmin: { id: "", title: "학년관리자 사용 안내" },
};
```

`src/components/guide/GuideArticle.tsx`:

```tsx
import Link from "next/link";

export function GuideArticle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Link
        href="/help"
        className="inline-flex min-h-11 items-center self-start whitespace-nowrap px-1 text-sm font-medium text-blue-700 hover:text-blue-900"
      >
        ← 도움말
      </Link>
      <article className="rounded-lg border border-gray-200 bg-white px-3 py-5 shadow-sm sm:px-8 sm:py-10">
        {children}
      </article>
    </div>
  );
}
```

`src/components/guide/GuideToc.tsx`:

```tsx
export type GuideTocItem = { id: string; label: string };

export function GuideToc({ items }: { items: GuideTocItem[] }) {
  return (
    <nav aria-label="목차" className="mt-6 flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => (
        <a
          key={item.id}
          href={`#guide-${item.id}`}
          className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full border border-blue-200 bg-blue-50 px-4 text-sm font-medium text-blue-700 hover:bg-blue-100"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
```

`src/components/guide/GuideChapter.tsx`:

```tsx
export function GuideChapter({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={`guide-${id}`} className="mt-12 scroll-mt-4 border-t border-gray-200 pt-8">
      <h2 className="overflow-hidden text-ellipsis whitespace-nowrap text-2xl font-bold text-gray-950">{title}</h2>
      <div className="mt-6 flex flex-col gap-10">{children}</div>
    </section>
  );
}
```

`src/components/guide/GuideStep.tsx`:

```tsx
import Image from "next/image";

export type GuideImage = { src: string; alt: string; width: number; height: number; tall?: boolean };

export function GuideStep({
  number,
  title,
  images,
  tip,
  children,
}: {
  number: number;
  title: string;
  images: GuideImage[];
  tip?: string;
  children: React.ReactNode;
}) {
  // 폰 스틸(tall)은 세로로 길어 본문 폭으로 늘리면 한 화면을 넘으므로 나란히 두고 가로 스크롤한다.
  const hasTall = images.some((image) => image.tall);
  return (
    <div className="flex flex-col gap-4">
      <h3 className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
          {number}
        </span>
        <span className="overflow-hidden text-ellipsis whitespace-nowrap text-lg font-semibold text-gray-900">{title}</span>
      </h3>
      <div className={hasTall ? "flex gap-3 overflow-x-auto pb-1" : "flex flex-col gap-3"}>
        {images.map((image) => (
          <Image
            key={image.src}
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            unoptimized
            className={
              image.tall
                ? "h-auto w-[min(320px,80vw)] shrink-0 rounded-2xl border border-gray-200"
                : "h-auto w-full rounded-lg border border-gray-200"
            }
          />
        ))}
      </div>
      <div className="break-keep text-gray-700">{children}</div>
      {tip ? (
        <p className="break-keep rounded-lg bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
          <span className="whitespace-nowrap font-semibold">팁</span> {tip}
        </p>
      ) : null}
    </div>
  );
}
```

`src/components/guide/GuideNotice.tsx`:

```tsx
const TONES = {
  blue: "border-blue-200 bg-blue-50 text-blue-950",
  yellow: "border-yellow-200 bg-yellow-50 text-yellow-950",
  green: "border-green-200 bg-green-50 text-green-950",
} as const;

export function GuideNotice({
  tone = "blue",
  title,
  items,
}: {
  tone?: keyof typeof TONES;
  title: string;
  items: [string, string][];
}) {
  return (
    <aside className={`mt-12 rounded-lg border px-4 py-4 sm:px-6 ${TONES[tone]}`}>
      <h2 className="overflow-hidden text-ellipsis whitespace-nowrap text-lg font-bold">{title}</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map(([emphasis, body]) => (
          <li key={emphasis} className="break-keep leading-7">
            <strong className="whitespace-nowrap font-semibold">{emphasis}</strong> {body}
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

`src/components/guide/GuideVideo.tsx`:

```tsx
import { GUIDE_VIDEOS, type GuideVideoKey } from "./videos";

export function GuideVideo({ videoKey, start, caption }: { videoKey: GuideVideoKey; start?: number; caption: string }) {
  const video = GUIDE_VIDEOS[videoKey];
  if (!video.id) return null;
  const query = start ? `?start=${start}` : "";
  return (
    <figure className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-gray-950">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${video.id}${query}`}
        title={video.title}
        loading="lazy"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        className="aspect-video w-full"
      />
      <figcaption className="break-keep bg-white px-4 py-3 text-sm text-gray-600">{caption}</figcaption>
    </figure>
  );
}
```

`src/components/guide/GuideHelpButton.tsx`:

```tsx
import Link from "next/link";

export function GuideHelpButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener"
      aria-label="사용 가이드"
      title="사용 가이드"
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-current text-sm font-bold leading-none">
        ?
      </span>
    </Link>
  );
}
```

- [ ] **Step 5: 반응형 테스트 목록 갱신**

`tests/responsive-tables.test.ts`의 `min-h-screen` 금지 목록(142-150행)에서 `"../src/app/help/page.tsx",` 다음 줄에 추가:

```ts
  "../src/app/help/layout.tsx",
```

- [ ] **Step 6: 통과 확인**

Run: `npx tsx tests/guide-components.test.ts && npx tsx tests/help-mdx.test.ts && npx tsx tests/responsive-tables.test.ts && npx tsc --noEmit && npm run lint`
Expected: 세 테스트 통과 메시지, tsc 오류 0, eslint 오류 0(기존 `no-img-element` 경고만)

- [ ] **Step 7: 커밋**

```bash
git add src/app/help/layout.tsx src/app/help/page.tsx src/components/guide tests/guide-components.test.ts tests/responsive-tables.test.ts && git commit -m "Add shared help layout and guide page building blocks

Moves the /help header into help/layout.tsx so per-role guide pages share it,
and adds GuideArticle, GuideToc, GuideChapter, GuideStep, GuideNotice,
GuideVideo (YouTube id registry), and the new-tab GuideHelpButton.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>" -- src/app/help/layout.tsx src/app/help/page.tsx src/components/guide tests/guide-components.test.ts tests/responsive-tables.test.ts
```

---

### Task 4: 폰 틀 이식 (트랙 C)

**Files:**
- Create: `demo-video/src/components/PhoneFrame.tsx` (원본 `/Volumes/Chois_SD2/dev/school_cowork/demo-video/src/guide/mocks/PhoneFrame.tsx`)
- Create: `demo-video/src/components/phone.ts` (원본 `/Volumes/Chois_SD2/dev/school_cowork/demo-video/src/classroom/phone.ts`)
- Modify: `.claude/GUIDE_PAGES.md` 3절 "폰 프레임은 아직 이 프로젝트에 없다." 문단

**Interfaces:**
- Consumes: `FONT`·`MONO`(`src/fonts.ts`), `colors`(`src/theme.ts`), `tween`(`src/anim.ts`), `LockIcon`(`src/components/icons.tsx`) — 모두 이 프로젝트에 이미 있음.
- Produces:
  - `PHONE = { w: 390, h: 844, statusH: 44, urlH: 48 }`, `PhoneFrame({ x, y, scale?, url, children })` — 폰 화면 본문 크기 390 × (844−44−48)=752
  - `PHONE_X = 753`, `PHONE_Y = 36`, `PHONE_CROP`, `phoneAbs({x,y})`, `phoneRectAbs({x,y,w,h})`, `phoneLeftLabelGap(boxX)`

- [ ] **Step 1: 파일 복사와 import 경로 수정**

```bash
cd /Volumes/Chois_SD2/dev/selfstudy/demo-video
cp /Volumes/Chois_SD2/dev/school_cowork/demo-video/src/guide/mocks/PhoneFrame.tsx src/components/PhoneFrame.tsx
cp /Volumes/Chois_SD2/dev/school_cowork/demo-video/src/classroom/phone.ts src/components/phone.ts
sed -i '' -e 's#"\.\./\.\./fonts"#"../fonts"#' -e 's#"\.\./\.\./theme"#"../theme"#' -e 's#"\.\./\.\./anim"#"../anim"#' -e 's#"\.\./\.\./components/icons"#"./icons"#' src/components/PhoneFrame.tsx
sed -i '' -e 's#"\.\./guide/mocks/PhoneFrame"#"./PhoneFrame"#' src/components/phone.ts
grep -n "^import" src/components/PhoneFrame.tsx src/components/phone.ts
```

Expected import 줄:
```
src/components/PhoneFrame.tsx:import React from "react";
src/components/PhoneFrame.tsx:import { useCurrentFrame } from "remotion";
src/components/PhoneFrame.tsx:import { FONT, MONO } from "../fonts";
src/components/PhoneFrame.tsx:import { colors } from "../theme";
src/components/PhoneFrame.tsx:import { tween } from "../anim";
src/components/PhoneFrame.tsx:import { LockIcon } from "./icons";
src/components/phone.ts:import { PHONE } from "./PhoneFrame";
```

- [ ] **Step 2: 타입·린트 확인**

Run: `cd /Volumes/Chois_SD2/dev/selfstudy/demo-video && npm run lint`
Expected: eslint·tsc 오류 0

- [ ] **Step 3: 기준 문서 갱신**

`.claude/GUIDE_PAGES.md` 3절의 다음 문단 전체:

> 폰 프레임은 아직 이 프로젝트에 없다. 첫 폰 장면 때 `/Volumes/Chois_SD2/dev/school_cowork/demo-video/src/guide/mocks/PhoneFrame.tsx`(…) 와 `src/classroom/phone.ts`(…)를 `demo-video/src/components/`로 옮기고 이 문단을 그 경로로 고친다. 가이드 페이지의 이미지 항목은 …(원본 `_step`의 `tall`).

을 다음으로 바꾼다:

```markdown
폰 프레임은 `src/components/PhoneFrame.tsx`(`PHONE` 390×844, 화면 본문 390×752)와 `src/components/phone.ts`(`PHONE_X`·`PHONE_Y`·`PHONE_CROP`·`phoneAbs`·`phoneRectAbs`·`phoneLeftLabelGap`)에 있다(school_cowork 이식). 폰 장면은 모두 `PHONE_X`·`PHONE_Y`에 폰을 두고, 커서·주석 좌표는 `phoneAbs`로 화면 좌표로 바꾼다. 폰 스틸은 `crop: PHONE_CROP, resize: 640`이고, 안내 페이지에서는 `GuideStep` 이미지에 `tall: true`를 준다(가로 브라우저 크롭 1280×657과 구분).
```

- [ ] **Step 4: 커밋**

```bash
cd /Volumes/Chois_SD2/dev/selfstudy && git add demo-video/src/components/PhoneFrame.tsx demo-video/src/components/phone.ts .claude/GUIDE_PAGES.md && git commit -m "Port the phone frame into demo-video components

Brings PhoneFrame and the phone crop/coordinate helpers from school_cowork
for the phone-framed attendance and student scenes, and records their paths
in GUIDE_PAGES.md.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>" -- demo-video/src/components/PhoneFrame.tsx demo-video/src/components/phone.ts .claude/GUIDE_PAGES.md
```

---

### Task 5: 세 편 원고 파일과 음성 등록 (트랙 B, 오케스트레이터)

**Files:**
- Create: `demo-video/src/teacher/narration.ts`, `demo-video/src/student/narration.ts`, `demo-video/src/grade-admin/narration.ts`
- Create: 각 폴더 `narration-durations.json` (`--estimate`로 임시 생성)
- Modify: `demo-video/scripts/narrate.mjs:16-18` (`GUIDES`)

**Interfaces:**
- Produces (계획 2~4 장면·타이밍이 쓴다):
  - `export type TeacherSceneId = "Intro" | "Login" | "AttendanceTour" | "SeatTap" | "CopySession" | "SeatColors" | "LongPress" | "WeeklyInfo" | "AbsenceTab" | "BulkApprove" | "SwapEntry" | "SwapModal" | "SwapTotals" | "HomeroomTour" | "HomeroomWeekly" | "HomeroomMonthly" | "HomeroomParticipation" | "AbsenceReason" | "HomeroomRequests" | "Password" | "Outro"`
  - `export type StudentSceneId = "Intro" | "Login" | "Tour" | "Schedule" | "StudyHours" | "Seat" | "AbsenceApply" | "Record" | "AbsenceList" | "Batch" | "Outro"`
  - `export type GradeAdminSceneId = "Intro" | "Enter" | "Today" | "StudentsList" | "StudentAdd" | "StudentExcel" | "Helper" | "Participation" | "ParticipationBulk" | "SeatsTour" | "ClassroomConfig" | "SeatAssign" | "SeatEdit" | "SeatPrint" | "SupervisorAssign" | "SupervisorTotals" | "Monthly" | "Outro"`
  - 각 파일: `NarrationScene`, `LINE_GAP_SECONDS = 0.2`, `TRAILING_SILENCE_SECONDS = 0.5`, `NARRATION`, `SPOKEN: Partial<Record<string, string>>`

- [ ] **Step 1: 원고 파일 작성**

파일 뼈대는 `demo-video/src/setup-check/narration.ts`와 같다. `NARRATION`의 각 장면 `lines`는 스펙 표(교사 5절, 학생 6절, 학년관리자 7절)의 "내레이션 초안" 칸을 ` / ` 기준으로 나눈 문장을 **글자 그대로** 옮긴다. 장면 순서는 표의 `#` 순서.

`SPOKEN`은 숫자·영문·기호가 들어간 문장마다 키 `<SceneId>-<줄 번호(0부터)>`로 전체 문장의 읽기를 적는다. 읽기 규칙:

| 원고 표기 | 음성 읽기 |
|---|---|
| 오후1 / 오후2 | 오후 일 / 오후 이 |
| self.posan.kr | 셀프 점 포산 점 케이알 |
| NEIS | 나이스 |
| ID | 아이디 |
| 1111 | 일일일일 |
| 0.5초 | 영점오 초 |
| i 버튼 | 아이 버튼 |
| O는 / X는 / O, X | 오는 / 엑스는 / 오, 엑스 |
| Excel | 엑셀 |
| 1학년 / 2학년 / 3학년 | 일 학년 / 이 학년 / 삼 학년 |
| 1학년 3반 7번 | 일 학년 삼 반 칠 번 |
| 10307 | 일공삼공칠 |
| 50분 / 100분 | 오십 분 / 백 분 |
| A4 | 에이포 |
| 문장 중 `?`·`(`·`)`·`-` | 읽기에서 제거하거나 쉼표로 |

예 (교사 Login):

```ts
{ id: "Login", lines: [
  "휴대폰이나 컴퓨터 브라우저에서 self.posan.kr 에 접속합니다.",
  "처음 화면은 교사 로그인 탭이 선택되어 있습니다.",
  "ID에는 NEIS 로그인 아이디를, 비밀번호에는 초기 비밀번호 1111을 입력하고 로그인을 누릅니다.",
  "처음 로그인한 뒤에는 비밀번호를 꼭 바꿔 주세요. 방법은 영상 마지막에 안내합니다.",
] },
// SPOKEN
"Login-0": "휴대폰이나 컴퓨터 브라우저에서 셀프 점 포산 점 케이알 에 접속합니다.",
"Login-2": "아이디에는 나이스 로그인 아이디를, 비밀번호에는 초기 비밀번호 일일일일을 입력하고 로그인을 누릅니다.",
```

- [ ] **Step 2: 음성 등록**

`demo-video/scripts/narrate.mjs`의 `GUIDES`:

```js
const GUIDES = {
  "setup-check": { module: "src/setup-check/narration.ts", outDir: "public/narration/setup-check", json: "src/setup-check/narration-durations.json", engine: "mlx" },
  teacher: { module: "src/teacher/narration.ts", outDir: "public/narration/teacher", json: "src/teacher/narration-durations.json", engine: "mlx" },
  student: { module: "src/student/narration.ts", outDir: "public/narration/student", json: "src/student/narration-durations.json", engine: "mlx" },
  "grade-admin": { module: "src/grade-admin/narration.ts", outDir: "public/narration/grade-admin", json: "src/grade-admin/narration-durations.json", engine: "mlx" },
};
```

- [ ] **Step 3: 읽기 검사 + 임시 길이**

Run:
```bash
cd /Volumes/Chois_SD2/dev/selfstudy/demo-video
node --input-type=module -e '
import { findUnreadable } from "./scripts/lib/narration-core.mjs";
for (const g of ["teacher", "student", "grade-admin"]) {
  const { NARRATION, SPOKEN } = await import(`./src/${g}/narration.ts`);
  const bad = findUnreadable(NARRATION, SPOKEN);
  console.log(g, NARRATION.length, "scenes", NARRATION.reduce((n, s) => n + s.lines.length, 0), "lines", bad.length ? `UNREADABLE ${bad.join(",")}` : "ok");
}'
for g in teacher student grade-admin; do node scripts/narrate.mjs --guide $g --estimate; done
```
Expected: `teacher 21 scenes … ok`, `student 11 scenes … ok`, `grade-admin 18 scenes … ok`, JSON 3개 생성. 장면 수·문장 수를 스펙 표와 대조한다.

- [ ] **Step 4: 커밋**

```bash
cd /Volumes/Chois_SD2/dev/selfstudy && git add demo-video/src/teacher demo-video/src/student demo-video/src/grade-admin demo-video/scripts/narrate.mjs && git commit -m "Add narration scripts for the teacher, student, and grade-admin guides

Scene lines follow the approved design tables; SPOKEN gives Hangul readings
for numbers and Latin text. Durations are estimates until TTS runs.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>" -- demo-video/src/teacher demo-video/src/student demo-video/src/grade-admin demo-video/scripts/narrate.mjs
```

---

### Task 6: Chois 음성 생성과 청취 확인 (트랙 B, 오케스트레이터)

**Files:**
- Generate: `demo-video/public/narration/{teacher,student,grade-admin}/` (장면 mp3, `.lines/*.mp3`, `.lines/manifest.json`, `review.tsv`)
- Overwrite: 각 `narration-durations.json` (실측)

- [ ] **Step 1: 세 편 순서대로 생성 (백그라운드, 동시 실행 금지)**

Run (백그라운드):
```bash
cd /Volumes/Chois_SD2/dev/selfstudy/demo-video && node scripts/narrate.mjs --guide teacher && node scripts/narrate.mjs --guide student && node scripts/narrate.mjs --guide grade-admin
```
Expected: 편마다 "생성 N라운드" 로그, 마지막에 `review.tsv` 작성. 3라운드 뒤 실패 문장이 있으면 그 문장 원고를 짧게 나누거나 쉼표를 조정하고 `--only <Scene>-<n>`으로 다시 만든다.

- [ ] **Step 2: 검수표 요약**

Run:
```bash
cd /Volumes/Chois_SD2/dev/selfstudy/demo-video
for g in teacher student grade-admin; do echo "== $g"; awk -F'\t' 'NR>1 && $1!="" {print $1, $2, $6, $8}' public/narration/$g/review.tsv; for f in public/narration/$g/*.mp3; do printf "%s %.1fs\n" "$(basename $f)" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 $f)"; done; done
```
Expected: `CHECK`/`NOCHECK` 문장 목록과 장면별 길이.

- [ ] **Step 3: 커밋**

```bash
cd /Volumes/Chois_SD2/dev/selfstudy && git add demo-video/public/narration/teacher demo-video/public/narration/student demo-video/public/narration/grade-admin demo-video/src/teacher/narration-durations.json demo-video/src/student/narration-durations.json demo-video/src/grade-admin/narration-durations.json && git commit -m "Generate Chois narration audio for the three role guides

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>" -- demo-video/public/narration/teacher demo-video/public/narration/student demo-video/public/narration/grade-admin demo-video/src/teacher/narration-durations.json demo-video/src/student/narration-durations.json demo-video/src/grade-admin/narration-durations.json
```

- [ ] **Step 4: 사용자 청취 확인 (멈춤 지점)**

사용자에게 편별 `review.tsv`의 `CHECK` 문장(우선)과 장면 mp3 경로(`demo-video/public/narration/<guide>/<Scene>.mp3`)를 전달하고, 고칠 문장을 받는다. 고친 문장은 `narration.ts`·`SPOKEN` 수정 후 `node scripts/narrate.mjs --guide <guide> --only <Scene>-<n>`으로 다시 만들어 커밋한다. 승인 전에는 계획 2를 시작하지 않는다.

---

### Task 7: 통합 검수 (오케스트레이터, 트랙 A·C·D 완료 후)

- [ ] **Step 1: 앱 전체 검수**

Run:
```bash
cd /Volumes/Chois_SD2/dev/selfstudy
for t in tests/*.test.ts; do npx tsx "$t" > /dev/null || echo "FAIL $t"; done
npx tsc --noEmit && npm run lint && npm run build
```
Expected: `FAIL` 줄 없음, tsc 0, eslint 오류 0, build 성공(`/help` static).

- [ ] **Step 2: demo-video 검수**

Run: `cd /Volumes/Chois_SD2/dev/selfstudy/demo-video && npm run lint && npm test`
Expected: 오류 0, 테스트 통과.

- [ ] **Step 3: 로그아웃 상태 `/help` 확인**

`npm run dev` 후 브라우저(Playwright)로 `/help`를 375·1280px에서 열어 헤더·본문이 이전과 같게 보이는지 스크린샷으로 확인한다.

- [ ] **Step 4: 문서 갱신**

`project-map-updater` 에이전트로 `.claude/PROJECT_MAP.md`에 반영: 템플릿 API 경로 이동, change-password 권한, `src/app/help/layout.tsx`, `src/components/guide/*`, demo-video `components/PhoneFrame.tsx`·`phone.ts`, `teacher/`·`student/`·`grade-admin/` 원고·음성. 그 커밋도 `-- .claude/PROJECT_MAP.md`로 지정해 커밋한다.

## 다음 계획

- 계획 2: 교사 장면 21개 + 공용 목업(`app-mocks/`) + `/help/attendance`·`/help/homeroom` + `?` 버튼 2곳 + 허브 링크 — 청취 확인 후 작성·실행. 목업 컴포넌트는 원고 길이와 무관하므로 청취 확인 기다리는 동안 초안 작성 가능.
- 계획 3: 학생 편. 계획 4: 학년관리자 편 + 마무리(YouTube id·시작 초, 기준 문서 7절, 반응형 검수).
