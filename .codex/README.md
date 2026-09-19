# Claude Code · Codex 기록 연결

설정일: 2026-09-19. 현재 작업 폴더: `/Volumes/Chois_SD2/dev/selfstudy`.

## 사용 방법

이 폴더에서 평소처럼 `codex` 또는 `claude`를 실행한다. Codex는 루트 `AGENTS.md`를 읽고, Claude는 기존 `CLAUDE.md`의 `@AGENTS.md`를 통해 공통 지침을 읽는다. 별도 동기화 명령 없이 같은 지도·메모리·인계 기록을 사용한다. 이미 열린 세션에서는 `AGENTS.md`와 `.claude/HANDOFF.md`를 다시 읽고 이어간다.

## 공유 경로

| 용도 | 실제 원본 | 연결 경로 |
|---|---|---|
| 공통 지침 | `AGENTS.md` | `CLAUDE.md`가 import |
| 프로젝트 지도 | `.claude/PROJECT_MAP.md` | `.codex/PROJECT_MAP.md` |
| 현재 상태·다음 작업 | `.claude/HANDOFF.md` | `.codex/HANDOFF.md` |
| 양쪽 작업일지 | `.claude/WORK_LOG.md` | `.codex/WORK_LOG.md` |
| 자동 메모리 | `/Users/chois/.claude/projects/-Volumes-Chois-SD2-dev-selfstudy/memory/` | `.claude/memory/` → `.codex/memory/`에서도 참조 |
| Claude 과거 세션 | `/Users/chois/.claude/projects/-Volumes-Chois-SD2-dev-selfstudy/` | `.codex/claude-history/` |
| 기존 공통 규칙 | `/Users/chois/.claude/rules/` | `.codex/rules/` |

프로젝트 안의 링크는 상대경로이며, 홈 디렉터리로 향하는 세 링크는 이 Mac 전용으로 Git에서 제외한다. 기존 메모리 10개(MEMORY.md + 주제별 9개)는 이동하거나 복제하지 않았다. Claude가 원래 자동 메모리에 저장한 새 파일도 Codex의 메모리 경로에서 바로 보인다. Codex가 같은 원본에 저장한 메모도 Claude가 다음에 읽을 때 보인다.

파일을 편집할 때는 원본 경로를 사용한다. 다른 세션이 이미 읽어 둔 문맥까지 실시간으로 바뀌는 것은 아니므로 도구를 전환할 때 최신 공유 문서를 다시 읽는다.

## 기존 작업기록

- `.claude/PROJECT_MAP.md`의 `수정 이력`: 주요 기능 변경 이력.
- `docs/superpowers/specs/`, `docs/superpowers/plans/`: 기존 설계·구현 계획.
- `.plans/`: 기존 검토·성찰 기록.
- `.claude/GUIDE_PAGES.md`, `demo-video/README.md`: 가이드 페이지·안내 영상 작업 기준.
- `git log`: 커밋 이력. 계획 문서에 적힌 작업이 완료됐는지는 코드·커밋·검증 결과로 확인한다.
- `.codex/claude-history/`: 필요할 때 특정 세션만 찾아 읽는 참고 경로. 운영체제의 읽기 전용 권한을 설정한 링크는 아니며, 공통 지침에서 원문 변경을 금지한다. 도구별 원시 대화·resume 목록은 서로 합치지 않는다. 원문 보존 기간은 Claude의 기존 설정을 따른다.

## 세션을 마칠 때

1. 중요한 결정은 공통 자동 메모리에 기록한다. 기존 주제 메모가 있으면 그 원본을 갱신한다.
2. `.claude/HANDOFF.md`에 현재 상태·다음 작업·막힌 이유·검증 범위를 남긴다.
3. `.claude/WORK_LOG.md` 상단에 날짜와 도구(`Codex`/`Claude Code`), 변경 내용, 확인한 결과를 추가한다.
4. 구조가 달라졌으면 `.claude/PROJECT_MAP.md`를 갱신한다.

두 도구가 동시에 같은 문서를 편집하지 않도록 하고, 갱신 직전 다시 읽어 상대 변경을 보존한다. 전역 지침의 `.Codex`와 이 프로젝트의 `.codex`를 별도 디렉터리로 만들지 않는다.

## 로컬 링크 복구

현재 Mac에서 링크가 없어진 경우 프로젝트 루트에서 아래 명령을 실행한다. `ln -s`는 기존 경로를 덮어쓰지 않는다. 기존 경로가 있다면 원본과 연결 대상을 먼저 확인한다.

```sh
mkdir -p .codex
ln -s /Users/chois/.claude/projects/-Volumes-Chois-SD2-dev-selfstudy/memory .claude/memory
ln -s ../.claude/memory .codex/memory
ln -s ../.claude/PROJECT_MAP.md .codex/PROJECT_MAP.md
ln -s ../.claude/HANDOFF.md .codex/HANDOFF.md
ln -s ../.claude/WORK_LOG.md .codex/WORK_LOG.md
ln -s /Users/chois/.claude/projects/-Volumes-Chois-SD2-dev-selfstudy .codex/claude-history
ln -s /Users/chois/.claude/rules .codex/rules
```

다른 컴퓨터나 새 clone에는 홈 디렉터리의 자동 메모리·세션 원문이 따라오지 않는다. 그 환경의 실제 Claude 프로젝트 기록 경로를 확인한 뒤 로컬 링크를 연결한다. 연결 전에도 Git에 보관되는 지도·인계·작업일지는 사용할 수 있다. 링크를 지원하지 않는 환경에서는 공통 지침에 적힌 원본을 직접 읽고 쓴다.

## 근거 문서

- [OpenAI: AGENTS.md](https://developers.openai.com/codex/guides/agents-md/)
- [Claude Code: 지침 import와 자동 메모리](https://code.claude.com/docs/en/memory)

이번 연결은 모델·권한·전역 설정·Claude 훅을 변경하지 않는다. 링크와 문서의 검증 결과는 공유 작업일지에 남긴다.
