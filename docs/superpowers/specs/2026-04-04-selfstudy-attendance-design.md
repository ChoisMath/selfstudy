# 자율학습 출석부 시스템 설계 문서 (v3)

## Context

학교 자율학습(오후/야간) 출석 관리 반응형 웹앱. 관리자가 학생/교사 명단을 관리하고, 감독교사가 모바일로 출석체크하고, 담임교사가 참여설정/불참사유를 관리하며, 학생이 불참을 신청할 수 있다.

## 시스템 개요

- **단일 Next.js 앱**, 4개 역할(관리자/감독교사/담임교사/학생)에 따라 화면 분기
- **반응형 웹** (모바일 우선, 감독교사 주로 모바일 사용)
- **다학년 지원** (1, 2, 3학년 각각 독립된 자습 공간/좌석 관리)

## 사용자 역할 (4종)

| 역할 | 로그인 방식 | 주요 기능 |
|------|-------------|-----------|
| 관리자 | ID/PW | 학생/교사 CRUD + Excel일괄업로드, 참여설정, 좌석배치, 감독일정, 교체이력, 전학년 출결뷰, Excel다운로드, 비밀번호 초기화 |
| 감독교사 | ID/PW + Google | 출석체크(순환토글), 자동 학년 라우팅, 다른 학년 전환, ℹ주간팝업, 감독일정 교체 |
| 담임교사 | ID/PW + Google | 자기반 참여설정 수정, 불참사유 등록, 학생불참신청 승인/반려, 주간출석현황, 감독일정 교체 |
| 학생 | 이름(ID) + 학번(PW) | 불참 신청, 신청 상태 확인, 참여일정 확인 |

### 역할 상세
- 교사는 여러 역할 겸임 가능 (`teacher_roles` 중간 테이블)
- 감독교사: 관리자가 날짜별/학년별/세션별 배정 (`supervisor_assignments`)
- 담임교사: 학년-반에 고정 배정 (`homeroom_assignments`)
- 학생 학번: `[학년1자리][반2자리][번호2자리]` (예: 20102 = 2학년1반2번)

## 인증 및 보안

### 교사 인증
- ID/PW + Google 연동 옵션
- bcrypt (cost 12), JWT 8시간, Rate limiting (5회 실패 시 5분 잠금)

### 학생 인증
- 이름(ID) + 학번(PW), 학번은 DB에서 직접 검증
- 동명이인: 이름+학번(grade+class+number)으로 유일 식별

### RBAC
- `/admin/*` → admin, `/attendance/*` → supervisor/admin
- `/homeroom/*` → homeroom/admin, `/student/*` → student

## 주요 기능

### 감독교사 출석체크
- 로그인 시 감독 배정 확인 → 배정 학년 자동 표시, 미배정 시 학년 선택 모달
- "다른 학년" 버튼으로 학년 전환 가능
- 고정 상단 바: 날짜 | 감독교사 | 학년 | 출석카운트 | [다른학년]
- 오후/야간 탭, 교실별 카드 스크롤, 좌석 탭=토글, ℹ=주간팝업

### 감독일정 교체
- 교사가 자신의 감독일정에서 교체 대상 선택 + 사유
- 즉시 반영, 이력은 `supervisor_swap_history`에 기록
- 관리자: 교체 이력 전체 확인 / 교사: 최종 결과만 표시
- 교체된 감독이 다시 교체 가능

### 참여 설정
- 관리자: 학생 등록 시 초기 설정 (오후/야간 참가여부 + 요일)
- 담임교사: 자기 반 학생의 참여설정 수정 가능

### 불참 관리
- 담임교사: 참여일에 미리 불참 기록 (사유: 학원/방과후/질병/직접입력)
- 학생: 불참 신청 → 담임교사 승인/반려
- 교사는 학생 신청 없이도 직접 입력 가능

### 관리자 출결 뷰
- 일별 뷰: 날짜 선택 → 학년별 좌석배치도 출석현황 (읽기전용)
- 테이블 뷰: 학년/반/기간 필터 → 학생별 출석 테이블
- Excel 다운로드: 기간+학년 지정 → 출결 데이터

### Excel 일괄 업로드
- 학생/교사 명단 Excel 업로드
- 템플릿 다운로드 → 데이터 입력 → 업로드 → 미리보기+검증 → 확인

## 데이터 모델

상세 Prisma 스키마: 구현 계획 파일 참조
핵심 테이블: students, teachers, teacher_roles, homeroom_assignments, supervisor_assignments, supervisor_swap_history, study_sessions, rooms, seating_periods, seat_layouts, attendance, absence_reasons, participation_days, absence_requests

## 기술 스택

Next.js 14+ (App Router) + Tailwind CSS + Prisma + PostgreSQL (Railway) + NextAuth.js v5 + SWR + exceljs + @dnd-kit/core

## 검증 계획

Phase 0~5 단계별 검증, 매 Phase마다 빌드+타입 확인, 최종 모바일 실기기 테스트 + Railway 배포
