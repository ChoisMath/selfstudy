# 안내 페이지(사용 가이드) · 안내 영상 기준

화면의 `?` 버튼과 도움말(`/help`)에서 여는 사용 가이드는 **목업 이미지가 들어간 안내 페이지**(`/help/<page>`)이고, 같은 장면으로 **Chois 클론 음성 안내 영상**을 만든다. 이 문서는 화면마다 같은 방식으로 만들기 위한 기준이다. 절차 실행은 `/guide-page <page>` 스킬, 영상 도구 사용법은 [`demo-video/README.md`](../demo-video/README.md).

원본은 `school_cowork`(Rails)의 같은 이름 문서다. 영상 파이프라인(0·3절, 음성)은 그대로 가져왔고, 웹 페이지 구조(1·4절)는 Next.js App Router에 맞게 옮겼다. 1절 표에서 `기본안`으로 표시한 항목은 첫 페이지를 만들 때 brainstorming으로 확정하고 이 문서를 고친다.

**경로 표기**: 이 저장소에는 `src/` 트리가 둘이다. 이 문서에서 `scripts/`·`public/narration/`·`src/<guide>/`·`src/stills/`·`src/Root.tsx`·`src/theme.ts`처럼 접두어 없는 영상 쪽 경로는 `demo-video/` 기준이고, Next.js 앱 경로는 항상 `src/app/`·`src/components/`·`public/guide/`·`tests/`로 적는다.

## 0. 원칙 — 목업은 한 번, 가이드와 영상은 같은 장면에서

목업의 원본은 이미지가 아니라 `demo-video/src/<guide>/`의 Remotion 장면(React 컴포넌트)이다. 가이드 이미지는 그 장면의 정지 화면을 잘라낸 것이고, 안내 영상은 같은 장면에 커서·내레이션·자막을 입힌 것이다. 그러므로 새 화면의 기능 설명은 다음 순서로 만든다.

1. **원고 먼저**: `src/<guide>/narration.ts`에 장면별 내레이션 문장을 쓰고, `scripts/narrate.mjs`의 `GUIDES`에 등록한 뒤 `node scripts/narrate.mjs --guide <guide>`로 Chois 음성과 길이(`narration-durations.json`)를 만든다. 영상을 당장 렌더하지 않아도 이 단계를 거친다 — 장면 타이밍이 처음부터 원고에 묶여야 나중에 영상을 뽑을 때 다시 손대지 않는다. 음성보다 장면 작업이 먼저 필요하면 `--estimate`로 임시 길이를 쓰고, 음성을 만든 뒤 반드시 다시 돌린다.
2. **사용자 청취 확인**: `public/narration/<guide>/review.tsv`(`CHECK` 우선)와 장면 mp3를 전달하고, 고칠 문장은 `--only <Scene>-<n>`으로 다시 만든다.
3. **장면(목업)**: `createTiming`·`GuideScene`·`lineAt`으로 장면을 만들고 `src/Root.tsx`에 본편 컴포지션과 `Folder`(장면별 `<Prefix>-<Scene>`)를 등록한다.
4. **가이드 페이지**: `src/stills/<page>.ts`로 스틸을 뽑아 안내 페이지를 만든다(4절).
5. **영상**: 필요할 때 `npx remotion render <Composition> out/<name>.mp4`만 실행한다.

가이드 페이지와 영상은 같은 장면을 공유하므로, 어느 쪽을 고치든 장면 파일 한 곳만 고친다.

## 1. 구조

| 구성 | 위치 |
|---|---|
| 라우트 | `src/app/help/<page>/page.tsx`(서버 컴포넌트, `metadata` 포함) + `content.mdx` — 기존 `/help`(`page.tsx` + `content.mdx`)와 같은 패턴. `/help/*`는 `src/middleware.ts`에서 로그인 없이 열리고, `.webp` 같은 정적 파일은 matcher에서 빠진다 |
| 본문 | `content.mdx` — 빌딩 블록 컴포넌트만 조합하고 설명 문장을 쓴다 |
| 빌딩 블록 (기본안) | `src/components/guide/` 서버 컴포넌트: `GuideToc`(목차 칩, 앵커 `#guide-<id>`) · `GuideChapter`(`id`, `title`, children) · `GuideStep`(`number`, `title`, `images`, children=설명, `tip`) · `GuideNotice`(`tone: "blue"｜"yellow"｜"green"`, `title`, `items: [강조, 본문][]`) · `GuideVideo`(`videoKey`, `caption`). 첫 페이지 작업 때 만들고 이후 페이지는 재사용만 한다 |
| 이미지 | `public/guide/<page>/NN-slug.webp` → `/guide/<page>/NN-slug.webp`. `GuideStep`이 `width`·`height`를 지정해 레이아웃이 흔들리지 않게 한다 |
| 영상 (기본안) | YouTube(일부 공개) id를 `src/components/guide/videos.ts`에 키로 등록하고 `GuideVideo`로 카드 표시. mp4를 Railway Volume·`public/`에 올리지 않는다(용량·대역폭 비용). id가 빈 키는 렌더하지 않는다 |
| 도움말 허브 | `/help`(`src/app/help/content.mdx`)의 해당 역할 절에서 `/help/<page>`로 링크 |
| 화면에서 열기 (기본안) | 해당 화면 헤더의 `?` 버튼(`aria-label="사용 가이드"`, 44×44 터치 영역) → `/help/<page>`. 모달로 띄울지(인터셉팅 라우트) 새 탭 링크로 둘지는 첫 페이지에서 결정해 여기에 기록 |
| 스틸 목록 | `demo-video/src/stills/<page>.ts` (`{ composition, file, frame, crop?, resize? }`, `DEFAULT_CROP`) |
| 스틸 생성 | `cd demo-video && node scripts/guide-stills.mjs --page <page> [--only NN-slug]` → `public/guide/<page>/`. 가이드 페이지에는 `--scale`·`--max-kb`를 쓰지 않는다(3절 규격 1280px·150KB, `--max-kb`는 초과 경고 기준일 뿐이다) |
| 테스트 | `tests/guide-<page>.test.ts` — `tests/help-mdx.test.ts`와 같은 `node:assert` 계약 검사: `page.tsx`가 서버 컴포넌트이고 `content.mdx`를 렌더, MDX가 빌딩 블록을 import, MDX가 참조하는 이미지 파일이 모두 존재, `?` 버튼이 `/help/<page>`를 가리킴. 실행 `npx tsx tests/guide-<page>.test.ts` |

## 2. 콘텐츠 규칙

- 목차 4개 이하, 단계 9개 이하, 단계당 이미지 1~3장, 설명 2~4문장 "~합니다"체, 팁은 1문장.
- 단계 제목은 명사형 6자 내외("출석 체크", "불참 신청"). 제목·칩·배지는 `whitespace-nowrap`, 문단은 `break-keep`(`break-words`·`break-all` 금지 — 전역 반응형 규칙).
- 설명은 안내 영상 내레이션이 있으면 그 문장을 다듬어 쓴다(`demo-video/src/<guide>/narration.ts`).
- 마지막에 권한·주의 사항을 `GuideNotice` 하나로 묶는다.
- 역할(학생·감독교사·담임교사·학년관리자·관리자)마다 보이는 메뉴가 다르므로, 페이지 첫머리에 대상 역할을 밝힌다.

## 3. 이미지 규격

| 항목 | 값 |
|---|---|
| 원본 | Remotion 장면 컴포지션 스틸 1920×1080 |
| 크롭 | 기본 브라우저 프레임 `x180 y70 1560×800`(`src/theme.ts`의 `BROWSER`), 폰 장면은 `crop:`으로 폰 영역 지정 |
| 출력 | WebP 폭 1280px 품질 82, 장당 150KB 이하, 페이지당 2MB 이하 (폰 크롭 항목은 `resize: 640`으로 폭 640px) |
| 파일명 | `NN-slug.webp` (단계 순 2자리 + 소문자 하이픈 슬러그) |

`frame`은 장면 컴포지션 기준이며 `lineAt(scene, line, ratio)`로 정의해 원고가 바뀌어도 위치가 유지되게 한다. 스틸을 만든 뒤 반드시 눈으로 확인하고 비율을 보정한다. 학생 화면처럼 주로 휴대폰에서 쓰는 화면은 폰 목업 장면 + `resize: 640`을 기본으로 한다.

폰 프레임은 아직 이 프로젝트에 없다. 첫 폰 장면 때 `/Volumes/Chois_SD2/dev/school_cowork/demo-video/src/guide/mocks/PhoneFrame.tsx`(`PHONE` 390×844, `fonts`·`theme`·`anim`·`LockIcon` 의존 — 모두 이식됨)와 `src/classroom/phone.ts`(`PHONE_CROP`·`phoneAbs`)를 `demo-video/src/components/`로 옮기고 이 문단을 그 경로로 고친다. 가이드 페이지의 이미지 항목은 가로 브라우저 크롭(1280×657)과 세로 폰 크롭(640폭)을 구분할 수 있어야 한다(원본 `_step`의 `tall`).

## 4. 새 페이지 추가 절차 (`/guide-page <page>`)

1. `cd demo-video && npm run doctor`로 환경을 점검한다. 실패 항목은 `demo-video/README.md` 설치 절로 복구한다.
2. 해당 화면의 Remotion 장면이 있는지 확인(`demo-video/src/<guide>/`). 없으면 brainstorming으로 장면과 원고를 설계하고 0절 순서(원고 → 음성·길이 → 청취 확인 → 장면 → 컴포지션 등록)로 먼저 만든다. 목업은 실제 화면 컴포넌트(앱의 `src/app/...`, `src/components/...`)의 레이아웃·문구·색을 옮기고, 데이터는 `demo-video/src/<guide>/data.ts` 한 곳에 둔다.
3. `demo-video/src/stills/<page>.ts`에 스틸 목록 작성.
4. `node scripts/guide-stills.mjs --page <page>`로 WebP 생성, 확인·보정.
5. 빌딩 블록이 없으면 1절 기본안대로 `src/components/guide/`를 만들고, `src/app/help/<page>/page.tsx` + `content.mdx`를 작성한다.
6. 해당 화면에 `?` 버튼을 연결하고 `/help` 허브에 링크를 추가한다. 관련 안내 영상이 올라가 있으면 `videos.ts`에 id를 넣고 본문에 `GuideVideo`를 둔다.
7. `tests/guide-<page>.test.ts` 작성·실행, `npm run lint`, `npx tsc --noEmit`, `npm run build`(`/help/<page>`가 static route로 생성되는지). 로그아웃 상태에서 `/help/<page>`가 열리는지, `?` 버튼으로 열리는지, 375px·768px·1280px 폭에서 브라우저로 확인.
8. `responsive-ui-reviewer` 에이전트로 점검·수정, 아래 진행 현황 표 갱신, `project-map-updater`로 `.claude/PROJECT_MAP.md` 갱신.

## 5. 워크트리에서 작업할 때

`demo-video/`는 소스만 git에 있다. 워크트리에는 `node_modules`·`.venv-tts`·`out/`·`.lines/raw/`(원본 wav)가 없다. 앞의 둘은 메인 체크아웃에서 심링크한다.

- `demo-video/node_modules` → 메인 `demo-video/node_modules`
- `demo-video/.venv-tts` → 메인 `demo-video/.venv-tts` (venv 안 스크립트는 메인 경로를 가리키지만 `bin/python` 실행에는 문제없다)

문장 mp3와 `.lines/manifest.json`은 추적되므로 캐시된 문장은 워크트리에서도 다시 생성하지 않는다. 다만 raw wav가 없어 `NOCHECK` 문장의 Whisper 전사는 워크트리에서 돌지 않는다 — 메인 체크아웃에서 전사하거나 워크트리에서 `--only`로 다시 만든다.

## 6. 설치된 Remotion 스킬과의 관계

| 스킬 | 쓰임 |
|---|---|
| `remotion-best-practices` 외 11종 (remotion-dev/skills 4.0.518) | Remotion API·렌더·자막·오디오 사용법 참고 |
| `remotion-motion-graphics` ([haidrrrry/claude-remotion-skill](https://github.com/haidrrrry/claude-remotion-skill) @`1dcbe5e`, MIT — 폴더의 `LICENSE`. `skills-lock.json` 밖이라 갱신은 클론에서 폴더를 다시 복사) | 모션 품질 규칙 참고. **적용 범위를 나눈다** |

`remotion-motion-graphics`는 모든 장면에 색 보정·필름 그레인·비네트·배경 메시를, 모든 정지 이미지에 Ken Burns를 요구하지만, 안내 영상의 **UI 목업 장면은 그대로 가이드 페이지 이미지가 되므로** 이것들을 넣지 않는다(화면 문구 가독성, WebP 용량, 실제 화면과의 일치).

- 기준선: `src/anim.ts`·`src/components/*`·`src/guide/*`는 school_cowork에서 검증된 공용 코드를 가져온 것이라 아래 규칙에 맞추려고 리팩터링하지 않는다(장면 전환 `linearTiming` 크로스페이드, `fadeInOut` 불투명도, 컴포넌트 안의 흰색·그림자 값 포함). 규칙은 **새로 쓰는 가이드별 장면 코드**에 적용한다.
- 새 장면 코드에 적용: easing + clamp(선형 보간 금지), 2~3속성 등장, 스태거, 퇴장이 등장보다 빠르게, 색·easing은 `src/theme.ts`·`src/anim.ts`에서만, **렌더 → 프레임 추출 → 눈으로 확인 → 수정** 루프.
- 인트로·아웃트로·썸네일에만 적용: 배경 메시, 색 보정, 그레인·비네트, 대기 중 미세 움직임.
- 화면 동작 시점은 매직 프레임 번호 대신 `lineAt`(음성 길이 기반)으로 잡는다. 공용 상수(`LEAD_FRAMES`·`TAIL_FRAMES`·`TRANSITION_FRAMES`, 30fps 고정)와 짧은 트윈 길이는 예외다.

## 7. 진행 현황

| 페이지 | `page` | 화면 | 장면(목업) | 가이드 페이지 | 영상 |
|---|---|---|---|---|---|
| 환경 점검 | `setup-check` | — | `src/setup-check/` (`SetupCheck`) | — (스틸은 점검용으로 `out/`에만) | `out/setup-check.mp4` (Chois 음성, git 제외) |

새 화면은 `/guide-page <page>`로 추가하면서 이 표에 행을 더한다.
