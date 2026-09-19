<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# selfstudy — Claude Code · Codex 공통 작업 지침

이 파일은 Codex의 진입 지침이며, Claude Code도 `CLAUDE.md`의 `@AGENTS.md`로 같은 내용을 읽는다.

## 세션 시작

1. `.claude/PROJECT_MAP.md`에서 프로젝트 개요와 작업 관련 섹션을 먼저 읽는다.
2. `CLAUDE.md`의 기술 스택·안내 영상 규칙을 읽는다. `@AGENTS.md`는 이 파일을 가리키므로 재귀적으로 다시 읽지 않는다.
3. `.claude/HANDOFF.md`와 `.claude/WORK_LOG.md`의 최근 항목을 읽어 현재 상태·미완료 작업·검증 범위를 확인한다.
4. `.claude/memory/MEMORY.md`를 읽고 관련 주제 메모만 연다. 이 경로와 `.codex/memory/`는 Claude의 기존 자동 메모리 원본을 가리킨다.
5. `git status --short`로 기존 변경을 확인하고 보존한다. 계획은 `docs/superpowers/{specs,plans}/`, 검토 기록은 `.plans/`에서 필요한 것만 읽는다.

메모리 링크가 없거나 끊겼으면 `.codex/README.md`의 연결 경로를 확인한다. 공유 인계 문서를 먼저 사용하고, 원본 메모리를 빈 파일이나 복사본으로 덮어쓰지 않는다.

## 기록의 공통 원본

| 기록 | 원본 | Codex 경로 |
|---|---|---|
| 프로젝트 지도 | `.claude/PROJECT_MAP.md` | `.codex/PROJECT_MAP.md` 상대 링크 |
| 현재 인계 | `.claude/HANDOFF.md` | `.codex/HANDOFF.md` 상대 링크 |
| 작업일지 | `.claude/WORK_LOG.md` | `.codex/WORK_LOG.md` 상대 링크 |
| 기존·새 자동 메모리 | `.claude/memory/`의 실제 대상 디렉터리 | `.codex/memory/` 상대 링크 |
| Claude 세션 원문 | 기존 Claude 프로젝트 저장 디렉터리 | `.codex/claude-history/` 참고용 링크 |

- 이 프로젝트의 디렉터리명은 소문자 `.codex/`로 통일한다. 전역 지침의 `.Codex/PROJECT_MAP.md`는 여기서는 `.codex/PROJECT_MAP.md`를 뜻한다.
- 사본을 만들어 따로 갱신하지 않는다. 링크를 수정·교체하지 말고 실제 대상 파일을 편집한다. 특히 Claude의 편집 도구가 심볼릭 링크를 거부하면 원본 경로를 사용한다.
- 기록을 갱신하기 직전에 최신 내용을 다시 읽는다. 다른 도구의 변경을 덮어쓰지 말고, 같은 파일을 두 세션이 동시에 편집하지 않는다.
- 세션 JSONL은 검색이 필요한 과거 작업만 선택적으로 읽는다. 이동·변환·수정하지 않는다. 도구별 대화창/resume 목록은 별개이며, 인계는 공유 파일을 통해 수행한다.
- 오래된 메모·계획은 구현 완료나 현재 배포 상태의 증거가 아니다. 실제 코드와 최신 검증 결과를 대조한다.

## 공통 규칙과 작업 종료

- 한국어로 간결하게 답하고, 필요한 파일만 읽는다. 새 파일을 만들기 전에 기존 코드·문서 재사용 가능성을 확인한다.
- 공통 규칙은 `~/.claude/rules/`의 기존 원본을 사용한다(Codex에서는 `.codex/rules/`로도 접근 가능). 탐색은 `project-navigation.md`, 코드 변경은 `coding-style.md`·`nextjs-prisma.md`, UI는 `responsive-ui.md`, Railway 관련 작업은 `railway-stack.md`를 읽는다.
- `node_modules/`, `.next/`, 빌드 산출물, 잠금 파일, 원시 세션 로그 전체를 탐색하지 않는다. 위 Next.js 지침에 따른 `node_modules/next/dist/docs/`의 관련 가이드 열람은 예외다.
- 구조 변경 후 `project-map-updater`는 **원본 `.claude/PROJECT_MAP.md`**를 갱신한다. UI 변경 후 `responsive-ui-reviewer`, Prisma 마이그레이션 실행 전 `prisma-migration-guardian`, Railway·환경변수·Volume 작업 전 `railway-deploy-advisor`를 사용한다.
- 의미 있는 작업 종료 시 `project-memory-keeper`는 **`.claude/HANDOFF.md`와 `.claude/WORK_LOG.md`**에 결과를 기록한다. 작업일지에는 날짜·도구·변경 이유·파일·실행한 검증·남은 작업을 남기고, 최신 항목을 위에 추가한다.
- 지속적으로 재사용할 결정·사용자 정정은 기존 자동 메모리의 실제 원본에 저장하고 `MEMORY.md` 색인을 갱신한다. 개인 전역 설정을 바꾸거나 다른 프로젝트 메모리와 합치지 않는다.
- 지정 에이전트를 사용할 수 없으면 같은 검토·문서 갱신을 직접 수행하고 그 사실을 기록한다. 검증 미실행·실패·배포 여부를 구분한다.
