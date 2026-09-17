---
name: guide-page
description: 화면의 ? 버튼·도움말(/help)에서 여는 사용 가이드를 Remotion 장면 스틸이 든 안내 페이지(/help/<page>)로 만들거나 갱신하고, 같은 장면으로 Chois 클론 음성 안내 영상을 만든다
---

`/guide-page <page>` — 예: `/guide-page attendance`

1. 먼저 `.claude/GUIDE_PAGES.md`를 읽는다. 구조·빌딩 블록·이미지 규격·절차·스킬 적용 범위가 모두 거기에 있다. 영상 도구 사용법은 `demo-video/README.md`.
2. `cd demo-video && npm run doctor`로 환경을 점검한다. 실패하면 README 설치 절로 복구한 뒤 진행한다.
3. 기준 문서 7절 진행 현황에서 `<page>`의 상태와 장면 출처를 확인한다.
4. Remotion 장면이 없는 화면이면 superpowers:brainstorming으로 장면(단계별로 보여줄 화면 상태)과 내레이션 원고를 먼저 설계하고 승인받은 뒤, 기준 문서 0절 순서(원고 → Chois 음성·길이 → 청취 확인 → 장면 → 컴포지션)로 만든다. 가이드 페이지와 영상은 같은 장면을 쓰므로 목업 작업은 이때 한 번뿐이다. 장면이 있으면 바로 4절 절차로 간다.
   - Remotion API는 `remotion-best-practices`, 모션 품질은 `remotion-motion-graphics`를 참고하되 기준 문서 6절의 적용 범위를 따른다(UI 목업 장면에는 그레인·비네트·색 보정·Ken Burns 금지).
   - 장면·목업·스틸 작성 예시: `/Volumes/Chois_SD2/dev/school_cowork/demo-video/src/todos/`(장면·목업·`data.ts`), `/Volumes/Chois_SD2/dev/school_cowork/demo-video/src/stills/todos.ts`. 첫 페이지를 만든 뒤에는 이 프로젝트의 첫 가이드를 참고 구현으로 기준 문서에 적는다.
5. 기준 문서 4절 절차를 체크리스트(todo)로 만들어 순서대로 진행한다. 첫 페이지라면 1절의 `기본안` 항목(빌딩 블록·`?` 버튼 열기 방식·영상 카드)을 brainstorming에서 확정하고 기준 문서를 고친다.
6. 워크트리에서 작업 중이면 기준 문서 5절대로 `demo-video/node_modules`·`.venv-tts`를 메인 체크아웃에서 심링크한다.
7. 끝나면 `responsive-ui-reviewer`로 점검·수정하고, 진행 현황 표·PROJECT_MAP(`project-map-updater`)을 갱신하고 커밋한다.
