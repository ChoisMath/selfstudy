# 현재 인계 — Claude Code · Codex 공용

> 마지막 갱신: 2026-09-19, Codex

## 현재 작업

사용자가 이번 세션 변경의 푸시·배포를 승인했다. 루트 앱의 `npm run build`와 `git diff --check`를 통과했고, fetch 후 로컬 `HEAD`와 `origin/main`이 `c47c076`으로 일치함을 확인했다. 세션 변경을 커밋·푸시하고 배포 결과를 확인하는 작업이 진행 중이며, 아직 푸시·배포 성공을 확인하지 않았다.

## 앞선 작업

사용 가이드가 연결하는 YouTube 영상 ID를 학생 `554VD2s8G1E`, 교사 `a2BRtp_1Yqo`, 학년관리자 `VOlUOgOuNwE`로 교체했다. `src/components/guide/videos.ts`와 담임·좌석 가이드의 시작 시각(각각 313초·206초)을 수정했고, 기존 가이드 테스트 6개와 대상 ESLint를 통과했다. 이 로컬 수정 완료 시점에는 배포하지 않았으며, 이후 승인된 배포를 현재 진행하고 있다.

교사·학생·학년관리자 안내 영상의 문장 끝 처리를 수정했다. 191문장의 원본 음성으로 마지막 0.5초 `qsin` 페이드아웃과 1초 후행 무음을 적용했고, 기존 문장 간격 0.2초를 합쳐 약 1.2초 쉬도록 했다. 원고·화면 내용·목소리·raw WAV는 유지했다.

후처리 구현·문장/장면 오디오 재처리·3개 영상 렌더와 검증을 완료했고, 요청된 `demo-video/out/{teacher,student,grade-admin}-guide.mp4`를 수정본으로 교체했다. 최종 길이는 교사 약 8분 30초·학생 약 4분 28초·학년관리자 약 6분 54초다. 원본 3편은 `demo-video/out/before-audio-tail-20260919-180746/`에 보존했으며 백업 해시도 확인했다.

Claude Code·Codex 기록 연결은 앞선 작업에서 완료했고 계속 사용한다. 작업별 상세 결과는 `.claude/WORK_LOG.md`에 있다.

## 이어받을 기준

- 작업 트리: `/Volumes/Chois_SD2/dev/selfstudy`. 과거 GDrive·`~/dev` 클론 간 동기화 절차는 사용하지 않는다.
- 기록 연결 작업 시작 시 기준 HEAD: `c47c076` (`Remove the unused Toggle component`), 당시 작업 트리는 깨끗했다. 이후 연결 문서·영상 후처리·YouTube 링크 설정 수정이 있으므로 현재 변경을 보존한다.
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

- 승인된 커밋·푸시·배포와 배포 결과 확인이 남아 있다. 성공 여부는 실제 결과를 확인한 뒤 이 문서와 작업일지에 기록한다.
- YouTube 링크 교체 검증은 완료했다. 기존 가이드 테스트 6개·`videos.ts` ESLint·변경 3개 파일의 `git diff --check` 통과, `src` 내 예전 영상 ID 3개의 잔존 0개 및 새 ID 3개 반영을 확인했다. 네트워크를 통한 YouTube 재생 검증은 수행하지 않았다.
- 앞선 영상 후처리는 완료했다. 191문장·50장면 길이와 955개 페이드 구간 수치 검사, 원본 보존 검사, 최종 3편의 전체 디코딩·스트림·프레임 수 검사 및 대표 프레임 직접 확인을 통과했다. 사람의 청취 검증은 수행하지 않았다.
- 영상 후처리 계획은 `.plans/2026-09-19-narration-tail.md`, 재처리 절차는 `demo-video/README.md`를 읽는다. 기존 목소리를 유지하려면 `node scripts/narrate.mjs --guide <guide> --reprocess`를 사용한다. 일반 생성 명령은 변경된 캐시 조건 때문에 TTS를 다시 생성할 수 있다.
- `demo-video`의 `npm test`(JavaScript 19개·Python 7개), `npm run lint`(ESLint·TypeScript), `npm run build`(Remotion bundle)는 통과했다. 음원 수치 결과는 `demo-video/out/audio-tail-qa/{README.md,report.json}`, 최종 영상 메타데이터는 같은 폴더의 `final-videos.json`, 새 장면 시작 시각은 `chapters.md`에 있다.
- 앞선 음원·MP4 작업 당시에는 YouTube·앱 소스·배포를 변경하지 않았다. 이후 앱의 YouTube 연결 ID와 시작 시각을 로컬에서 수정했고 현재 승인된 배포를 진행 중이다. YouTube 업로드는 수행하지 않았다.
- 이전 메모리의 Railway·DB·배포 상태는 당시 기록이다. 다음 배포 작업에서 현재 상태를 확인한다.
- 위 `demo-video` 테스트·빌드는 별도 영상 프로젝트 범위다. 배포 준비 단계에서 루트 앱 `npm run build`도 통과했다(Prisma generate·Next.js 16 컴파일·TypeScript·정적 페이지 67개). 기존 middleware deprecation 경고만 있었으며 배포 성공은 아직 확인하지 않았다.
- 네이티브 대화창·resume 기록이 합쳐지는 것은 아니다. 공유 문서와 원본 메모리를 다시 읽어 도구 간 작업을 인계한다.
