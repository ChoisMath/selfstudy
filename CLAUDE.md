@AGENTS.md

# 자율학습 출석부 시스템

## 프로젝트 지도

새 세션 시작 시 전체 소스를 읽지 말고, 먼저 `.claude/PROJECT_MAP.md`를 읽어 프로젝트 구조를 파악하세요.
필요한 파일만 선택적으로 읽어 작업하세요.

## 코드 변경 후

파일 생성/삭제, API 추가, 스키마 변경 등 구조적 변경 후에는 `project-map-updater` 에이전트를 실행하여 `.claude/PROJECT_MAP.md`를 동기화하세요.

## 기술 스택

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Prisma 7 + PostgreSQL (Railway)
- NextAuth v5 (JWT, trustHost: true)
- SWR, @dnd-kit, ExcelJS

## 안내 영상 · 가이드 페이지

- `/guide-page <page>` 스킬 → 기준 문서 `.claude/GUIDE_PAGES.md`
- `demo-video/`: Remotion 4.0.518 별도 프로젝트 (루트 tsconfig·eslint·Tailwind 스캔에서 제외, `.claude/`도 eslint·Tailwind 제외). 음성은 로컬 mlx-audio 0.5.3 + Qwen3-TTS 0.6B `Chois` 클론. 점검 `cd demo-video && npm run doctor`
- demo-video 장면을 고칠 때 `remotion-motion-graphics` 규칙은 `.claude/GUIDE_PAGES.md` 6절 범위로만 적용한다 (UI 목업 장면에 그레인·비네트·색 보정·배경 메시·Ken Burns 금지, 이식한 공용 코드 일괄 리팩터링 금지)

## 테스트 계정

- 관리자: admin / admin1234
- 교사: teacher1-1 ~ teacher3-3 / pass1234
- 학생: 이름 + 학번 5자리 (예: 김서현 / 10101)
