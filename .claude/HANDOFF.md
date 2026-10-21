# 현재 인계 — Claude Code · Codex 공용

> 마지막 갱신: 2026-10-21, Claude Code(클라우드)

## 현재 작업

브랜치 `claude/upbeat-volta-8a7ixx`에서 사용자 요청 "로그인·출석체크·교사·관리자 페이지 전체 사용성 개선"의 2단계를 완료했다. 1단계(로그인 재설계 + 밝고 따뜻한 톤 조정, 모션그래픽)는 커밋 e0d9e7d·59ea61f, 2단계는 e74a29c(공용 셸·출석 그리드)·4740c83(담임 7화면)·이후 커밋(관리자·학년관리자 16화면 + 기록)이다. `/web-design-guidelines`(Vercel Web Interface Guidelines) 점검 결과 약 120건을 고쳤고, 공용 셸은 `src/components/ui/chrome.ts`·`Dialog.tsx`, 날짜는 `src/lib/format-date.ts`로 모았다. 상세 목록·검증은 `.claude/WORK_LOG.md` 최신 항목. 사용자 요청으로 PR [ChoisMath/selfstudy#1](https://github.com/ChoisMath/selfstudy/pull/1)을 만들고 `main`에 병합 커밋 `1409316`으로 병합했다(Railway 는 main 을 자동 배포하므로 운영 반영 여부는 다음 세션에서 `https://self.posan.kr/login` 으로 확인). 브랜치는 병합 후 `origin/main` 에서 다시 시작했다.

검증: 저장소 전체 ESLint 0 오류(`<img>` 경고 6건은 기존), `tsc --noEmit` 통과, 테스트 45개 전부 통과, 프로덕션 빌드 결과는 작업일지 참조. 로컬 dev 서버 + 위조 세션 쿠키(더미 AUTH_SECRET, DB 없음)로 교사·관리자 13화면 × 2뷰포트 스크린샷: 가로 넘침 없음, 44px 미만 실제 대상 없음(라디오의 sr-only input 1px 제외), 스크립트 오류 없음. DB가 없어 데이터가 있는 상태(좌석 그리드·표)는 눈으로 확인하지 못했다. PR 병합으로 main 에 반영됐고 Railway 자동 배포 결과는 미확인이다.

다음 단계(미착수, 선택): ① 탭·필터·월 상태의 URL 동기화, ② 탭 화살표 키 이동(roving tabindex), ③ 교사 행 select 즉시 저장에 되돌리기, ④ 실제 데이터가 있는 환경(로컬 Postgres 또는 운영 미리보기)에서 좌석 그리드·표의 시각 확인, ⑤ 학생 화면 본문(레이아웃만 통일함)의 같은 기준 점검. 로그인 장면 CSS는 생성기 산출물이므로 직접 고치지 않는다.

## 앞선 작업 (2026-10-21, 클라우드 세션 설정)

브랜치 `claude/peaceful-galileo-lxzu81`에 클라우드 세션 설정을 추가했다. MathChois 에서 스킬 3종(`frontend-design`·`ui-ux-pro-max`·`web-design-guidelines`)·`.claude/mcp/launch.mjs`·`.mcp.json`을 복사하고, `.claude/settings.json`과 `.claude/hooks/session-start.sh`(원격 세션 한정 `npm install` → `prisma generate` → MCP prefetch, 동기·멱등)를 새로 작성했다. 훅 실행·ESLint·tsx 테스트·스킬 인식·`search.py` 검증을 통과했고 앱 코드·배포는 바꾸지 않았다. 기본 브랜치 머지 후 새 클라우드 세션부터 적용된다. 상세는 `.claude/WORK_LOG.md` 최신 항목.

## 앞선 작업 (2026-09-19)

사용자가 승인한 이번 세션 변경을 커밋 `468fe25c4a522b628e66c0a5e9226a5bb72c6ea1`로 `origin/main`에 푸시했고, Railway `production`의 `selfstudy` 배포가 `SUCCESS`로 완료됐다. 배포 ID는 `26ee3631-3384-4b0c-acd6-45ec6fd5349a`이며 배포의 `commitHash`도 일치한다. `https://self.posan.kr/help/`의 가이드 5곳에서 HTTP 200과 새 영상 ID·시작 시각 반영을 확인했다. 남은 요청 작업은 없다.

## 앞선 작업

사용 가이드가 연결하는 YouTube 영상 ID를 학생 `554VD2s8G1E`, 교사 `a2BRtp_1Yqo`, 학년관리자 `VOlUOgOuNwE`로 교체했다. `src/components/guide/videos.ts`와 담임·좌석 가이드의 시작 시각(각각 313초·206초)을 수정했고, 기존 가이드 테스트 6개와 대상 ESLint를 통과했다. 이 로컬 수정 완료 시점에는 배포하지 않았으며, 이후 사용자 승인에 따라 위 배포를 완료했다.

교사·학생·학년관리자 안내 영상의 문장 끝 처리를 수정했다. 191문장의 원본 음성으로 마지막 0.5초 `qsin` 페이드아웃과 1초 후행 무음을 적용했고, 기존 문장 간격 0.2초를 합쳐 약 1.2초 쉬도록 했다. 원고·화면 내용·목소리·raw WAV는 유지했다.

후처리 구현·문장/장면 오디오 재처리·3개 영상 렌더와 검증을 완료했고, 요청된 `demo-video/out/{teacher,student,grade-admin}-guide.mp4`를 수정본으로 교체했다. 최종 길이는 교사 약 8분 30초·학생 약 4분 28초·학년관리자 약 6분 54초다. 원본 3편은 `demo-video/out/before-audio-tail-20260919-180746/`에 보존했으며 백업 해시도 확인했다.

Claude Code·Codex 기록 연결은 앞선 작업에서 완료했고 계속 사용한다. 작업별 상세 결과는 `.claude/WORK_LOG.md`에 있다.

## 이어받을 기준

- 작업 트리: `/Volumes/Chois_SD2/dev/selfstudy`. 과거 GDrive·`~/dev` 클론 간 동기화 절차는 사용하지 않는다.
- 기록 연결 작업 시작 기준선은 `c47c076` (`Remove the unused Toggle component`)이다. 이번 세션 변경을 포함해 실제 푸시·배포한 커밋은 `468fe25`다. 현재 HEAD·작업 트리는 다음 세션 시작 시 `git status`·`git log`로 다시 확인하며, 후속 기록 변경을 보존한다.
- 프로젝트 구조·주요 변경: `.claude/PROJECT_MAP.md`. 실제 코드와 충돌하면 코드를 확인하고 지도를 정정한다.
- 기존 자동 메모리: `.claude/memory/MEMORY.md`에서 관련 주제로 이동한다. Codex 경로는 `.codex/memory/`로 같은 실제 디렉터리를 가리킨다.
- 계획·검토: `docs/superpowers/{specs,plans}/`, `.plans/`. 전체 계획을 완료 상태로 간주하지 않는다.

## 기존 결정

다음은 연결 시 기존 Claude 메모리에서 확인한 사용자 결정이다. 자세한 이유는 해당 원문을 읽는다.

- 학생 불참 신청 기본 날짜는 자습 종료 후에도 오늘 유지: `student-absence-default-date-decision.md`.
- 조밀한 UI에서도 44px 터치 영역 유지: `compact-ui-keep-44px-hit-area.md`.
- 검수 위반은 보고만 하지 않고 같은 세션에서 점검·수정: `fix-review-violations-not-just-report.md`.
- 작업 위치와 이전 경로 폐기: `local-clone-for-verification.md`.

## 다음 작업과 검증 범위

- 승인된 푸시·배포와 운영 반영 확인을 완료했다. `/help/student`, `/help/attendance`, `/help/homeroom`, `/help/grade-admin`, `/help/seats` 5곳을 TLS 검증을 적용한 curl로 확인했고, 리다이렉트 없는 HTTP 200 및 응답 iframe의 새 영상 ID·시작 시각이 일치했다. 남은 요청 작업은 없다.
- YouTube 링크 교체 검증은 완료했다. 기존 가이드 테스트 6개·`videos.ts` ESLint·변경 3개 파일의 `git diff --check` 통과, `src` 내 예전 영상 ID 3개의 잔존 0개 및 새 ID 3개 반영을 확인했다. 네트워크를 통한 YouTube 재생 검증은 수행하지 않았다.
- 앞선 영상 후처리는 완료했다. 191문장·50장면 길이와 955개 페이드 구간 수치 검사, 원본 보존 검사, 최종 3편의 전체 디코딩·스트림·프레임 수 검사 및 대표 프레임 직접 확인을 통과했다. 사람의 청취 검증은 수행하지 않았다.
- 영상 후처리 계획은 `.plans/2026-09-19-narration-tail.md`, 재처리 절차는 `demo-video/README.md`를 읽는다. 기존 목소리를 유지하려면 `node scripts/narrate.mjs --guide <guide> --reprocess`를 사용한다. 일반 생성 명령은 변경된 캐시 조건 때문에 TTS를 다시 생성할 수 있다.
- `demo-video`의 `npm test`(JavaScript 19개·Python 7개), `npm run lint`(ESLint·TypeScript), `npm run build`(Remotion bundle)는 통과했다. 음원 수치 결과는 `demo-video/out/audio-tail-qa/{README.md,report.json}`, 최종 영상 메타데이터는 같은 폴더의 `final-videos.json`, 새 장면 시작 시각은 `chapters.md`에 있다.
- 앞선 음원·MP4 작업 당시에는 YouTube·앱 소스·배포를 변경하지 않았다. 이후 앱의 YouTube 연결 ID와 시작 시각을 수정하고 승인된 운영 배포를 완료했다. YouTube 업로드는 수행하지 않았다.
- 이전 메모리의 Railway·DB·배포 상태는 당시 기록이다. 다음 배포 작업에서 현재 상태를 확인한다.
- 위 `demo-video` 테스트·빌드는 별도 영상 프로젝트 범위다. 배포 준비 단계에서 루트 앱 `npm run build`도 통과했다(Prisma generate·Next.js 16 컴파일·TypeScript·정적 페이지 67개). 기존 middleware deprecation 경고만 있었으며 Railway 배포 성공도 확인했다.
- 네이티브 대화창·resume 기록이 합쳐지는 것은 아니다. 공유 문서와 원본 메모리를 다시 읽어 도구 간 작업을 인계한다.
