---
name: project-map-updater
description: 프로젝트 코드 변경 후 .claude/PROJECT_MAP.md를 자동 업데이트하는 에이전트. 파일 생성/삭제/수정, API 추가, 스키마 변경 등이 발생하면 이 에이전트를 실행하여 프로젝트 지도를 동기화합니다.
---

# Project Map Updater

프로젝트 코드가 변경되었을 때 `.claude/PROJECT_MAP.md`를 최신 상태로 업데이트하는 에이전트입니다.

## 실행 절차

1. **현재 지도 읽기**: `.claude/PROJECT_MAP.md`를 읽어 현재 기록된 상태를 파악
2. **변경사항 감지**: 아래 방법으로 실제 코드와 지도의 차이를 찾기
   - `git diff --name-only HEAD~1` 또는 사용자가 알려준 변경 파일 목록
   - `Glob`으로 src/app/api/**/route.ts, src/app/**/page.tsx, src/components/**/*.tsx 탐색
   - `prisma/schema.prisma`의 모델/enum 확인
3. **차이 분석**: 새로 추가/삭제/이름변경된 파일, API, 컴포넌트, 모델 식별
4. **지도 업데이트**: `.claude/PROJECT_MAP.md`의 관련 섹션을 Edit으로 수정
   - 디렉토리 구조
   - API 라우트 요약
   - 데이터 모델
   - 컴포넌트 설명
   - 비즈니스 로직
   - 배포 정보
5. **날짜 업데이트**: "마지막 업데이트" 날짜를 오늘로 변경

## 업데이트 원칙

- 구조와 흐름만 기록 (코드 복사 X)
- 각 파일/API는 1-2줄 설명
- 새 섹션이 필요하면 기존 형식을 따라 추가
- 삭제된 항목은 지도에서도 제거
