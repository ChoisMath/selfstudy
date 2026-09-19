# 공유 작업일지

최신 항목을 위에 추가한다. 날짜·도구·변경 이유·파일·실제로 실행한 검증·남은 작업을 기록한다. 기존 상세 이력은 `.claude/PROJECT_MAP.md`, `docs/superpowers/`, `.plans/`, Git 및 Claude 세션 원문에 그대로 남아 있다.

## 2026-09-19 — Codex — 승인된 세션 변경 푸시·배포 완료

- 승인: 사용자가 이번 세션 전체 변경의 푸시·배포를 승인함. 아래 기록 연결·영상 후처리·YouTube 링크 교체 변경을 함께 커밋·푸시함.
- 사전 검증: 루트 앱 `npm run build` 통과(Prisma generate·Next.js 16 컴파일·TypeScript·정적 페이지 67개). 기존 middleware deprecation 경고만 확인. `git diff --check` 통과.
- 원격 확인: fetch 후 로컬 `HEAD`와 `origin/main`이 `c47c076`으로 일치함을 확인. 이는 새 커밋·푸시 전 상태임.
- 푸시: 변경 커밋 `468fe25c4a522b628e66c0a5e9226a5bb72c6ea1`을 `origin/main`에 푸시 성공.
- 배포: Railway `production`의 `selfstudy` 배포 `26ee3631-3384-4b0c-acd6-45ec6fd5349a`가 `SUCCESS`이며 `commitHash`가 위 변경 커밋과 일치함을 확인.
- 운영 확인: `https://self.posan.kr/help/{student,attendance,homeroom,grade-admin,seats}` 5곳 모두 TLS 검증을 적용한 curl 요청에서 리다이렉트 없이 HTTP 200. 실제 응답 iframe이 순서대로 `554VD2s8G1E`, `a2BRtp_1Yqo`, `a2BRtp_1Yqo?start=313`, `VOlUOgOuNwE`, `VOlUOgOuNwE?start=206`과 일치. YouTube 동영상 자체 재생 검증은 미실행.
- 남은 작업: 승인된 앱 푸시·배포·운영 반영 확인 완료. 추가 요청 작업 없음.

## 2026-09-19 — Codex — 사용 가이드 YouTube 연결 교체 완료

- 요청: 학생 `554VD2s8G1E`, 교사 `a2BRtp_1Yqo`, 학년관리자 `VOlUOgOuNwE` 영상으로 가이드 연결 교체.
- 변경: `src/components/guide/videos.ts`의 영상 ID 3개와 `src/app/help/homeroom/content.mdx`의 시작 시각 313초, `src/app/help/seats/content.mdx`의 시작 시각 206초 반영. 수정본 영상의 장면 시작 시각에 맞춤.
- 검증: 기존 `guide-components`·`attendance`·`homeroom`·`student`·`grade-admin`·`seats` 테스트 6개를 `./node_modules/.bin/tsx`로 실행해 모두 통과. `videos.ts` 대상 ESLint와 앱 변경 3개 파일의 `git diff --check` 통과. `src` 검색으로 예전 영상 ID 3개 잔존 0개와 사용자 지정 새 ID 3개 반영 확인.
- 검증 한계: 네트워크를 통한 YouTube 재생·배포 검증은 수행하지 않음.
- 범위: 로컬 앱의 연결 설정 변경. YouTube 업로드·앱 빌드·배포는 수행하지 않음. 앞선 음원·MP4 작업 당시 YouTube를 변경하지 않았다는 아래 이력은 그대로 유효함.
- 남은 작업: 요청된 로컬 연결 설정 변경과 검증 완료. 추가 요청 작업 없음.

## 2026-09-19 — Codex — 안내 영상 문장 끝 페이드·여백 수정 완료

- 요청: `demo-video/out/{teacher,student,grade-admin}-guide.mp4`에서 문장 끝이 갑자기 끊기는 느낌 수정.
- 구현·재처리 완료: 교사 82개·학생 44개·학년관리자 65개, 총 191문장의 마지막 0.5초에 `qsin` 페이드아웃을 적용하고 1초 후행 무음을 추가. 기존 문장 간격 0.2초를 유지해 약 1.2초 쉼. 기존 raw WAV를 재사용해 원고·화면 내용·목소리 유지.
- 변경 파일: `demo-video/scripts/narrate.mjs`에 `--reprocess` 경로 추가, 후처리 설정과 `fadeOut`·`processingVersion` 캐시 반영. 문장 `.lines/`·장면 MP3와 3편의 길이 JSON 갱신. `demo-video/README.md`·`.plans/2026-09-19-narration-tail.md`·`.claude/PROJECT_MAP.md`에 절차와 구조 반영.
- 재생성 방지: 전체 raw WAV·manifest·원고 일치 여부를 먼저 확인하는 재처리 전용 경로 사용. TTS·Voicebox·STT를 호출하지 않고 기존 전사·유사도 유지.
- 백업·출력 상태: `demo-video/out/before-audio-tail-20260919-180746/`에 기존 영상과 재처리 대상 산출물 백업. 3개 임시 MP4 렌더가 모두 종료 코드 0으로 완료됐고 검증 후 요청된 원래 파일명으로 교체. 원본 3편의 백업 해시 일치 확인.
- 원본 보존 검증: raw WAV 191개 SHA256, 3편의 `NARRATION`·`SPOKEN`, `review.tsv` 바이트 일치. manifest 191개의 기존 필드도 변경 대상인 `trailing`을 제외하고 보존.
- 음원 수치 검증: 191문장 길이 증가 0.498980~0.500363초, 모든 문장의 마지막 0.9초 PCM RMS·peak 모두 0. 페이드 955구간의 `qsin` 기대 gain과 실측 RMS gain 최대 차이 0.006681. 문장 191개·장면 50개 JSON 길이는 MP3 실측과 반올림 오차 범위에서 일치. 모든 검사 통과, 실패 0. 상세 결과는 `demo-video/out/audio-tail-qa/{README.md,report.json}`.
- 코드 검증: `demo-video`의 `npm test`(JavaScript 19개·Python 7개), `npm run lint`(ESLint·TypeScript), `npm run build`(Remotion bundle) 통과.
- 영상 검증: 3편 모두 `ffmpeg -xerror` 전체 디코딩·프레임 수·길이·스트림 검사 통과. 대표 프레임을 직접 확인하고 첫 20초 오디오의 긴 여백을 점검. 모두 1920×1080·30fps·H.264/AAC. 사람의 청취 검증은 미실행.
- 최종 산출물: `teacher-guide.mp4` 510.165333초·15,304프레임·53,138,511바이트, `student-guide.mp4` 267.669333초·8,029프레임·23,949,146바이트, `grade-admin-guide.mp4` 413.632초·12,408프레임·50,620,229바이트. 길이는 MP4 컨테이너 기준이며 30fps 영상 타임라인과 소폭 차이가 있음. 메타데이터는 `demo-video/out/audio-tail-qa/final-videos.json`, 새 장면 시작 시각은 같은 폴더의 `chapters.md`.
- 변경하지 않은 범위: YouTube 영상·앱 소스·배포. 앱 테스트·앱 빌드·배포는 미실행이며 위 테스트와 빌드는 `demo-video` 범위.
- 남은 작업: 요청된 코드·음원·3개 최종 영상 수정 완료. 추가 요청 작업 없음.

## 2026-09-19 — Codex — Claude Code와 기록 연결

- 요청: 기존 Claude 작업 맥락을 Codex에서 이어 쓰고, 다시 Claude에서도 같은 기록으로 이어가기.
- 변경: 루트 `AGENTS.md`에 공통 읽기·갱신 절차 추가, `CLAUDE.md`의 기존 import 유지, `.codex/`에 공통 원본 링크와 연결 안내 추가, `.claude/HANDOFF.md`·이 작업일지 신설. `.gitignore`에서 외부 메모리·세션·규칙을 가리키는 이 Mac 전용 링크 3개를 제외. `project-map-updater`가 원본 `.claude/PROJECT_MAP.md`에 공유 기록 구조를 반영.
- 메모리: 기존 Claude 자동 메모리 10개를 복사하지 않고 동일 디렉터리로 연결. 세션 원문은 기존 위치를 유지하고 참고 경로만 제공.
- 보존 검증: 기존 자동 메모리 10개와 세션 JSONL 314개, 총 324개 파일의 SHA256이 작업 전후 일치. 기존 `AGENTS.md`의 Next.js 규칙 블록과 `CLAUDE.md` 본문 보존 확인. 앱 소스·Prisma·설정·기존 계획·검토 기록과 Claude 훅은 변경하지 않음.
- 링크 검증: 심볼릭 링크 7개의 존재와 대상 확인. 지도·인계·일지의 원본과 Codex 경로가 같은 inode이며, 두 메모리 경로와 내부 10개 파일도 `samefile` 일치. 외부 로컬 링크 3개는 Git에서 제외되고 공유 문서·상대 링크는 제외되지 않음을 확인.
- Codex 검증: CLI 0.141.0에서 `codex debug prompt-input` 종료 코드 0. 공통 진입 지침·인계·작업일지·메모리 지침·기존 Next.js 규칙의 실제 프롬프트 포함 5개 확인 통과. 최초 `--strict-config` 병용은 `debug` 미지원 오류가 발생해 옵션을 제거한 위 명령으로 정상 검증.
- Claude 검증 범위: 기존 `CLAUDE.md`의 `@AGENTS.md` import와 별도 override 없는 기본 자동 메모리 경로를 정적으로 확인. 새 Claude 대화 실행 검증은 미실행.
- 기타 검증: `git diff --check` 통과. 앱 테스트·빌드·배포는 미실행.
- 남은 작업: 연결 구성·지도 갱신 완료. 새 기능 개발 요청은 아직 없음. 이후 도구 전환 시 최신 공통 지침·인계·작업일지·관련 메모리를 다시 읽고 이어감.
