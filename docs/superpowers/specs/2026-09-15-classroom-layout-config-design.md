# 학급 교실 구조 설정(분단형/단독형) — 설계

> 작성일: 2026-09-15
> 대상: 오후 자율학습 좌석의 **일반 학급 교실** (`/grade-admin/[grade]/seats`, `/admin/seats`, `/attendance/[grade]`, `/grade-admin/[grade]/seats/print`)

## 배경 / 목표

현재 오후 자율학습의 일반 학급 교실은 시드로만 만들어지며(학년당 4·5·6반, 반마다 3분단 × 2열 × 3행 = 18석), 관리자 화면에서 학급을 추가·삭제하거나 책상 배치를 바꿀 수 없다. 담임교사가 교실의 책상 배열을 바꾸면 좌석배치도도 따라가야 하므로, **학년 관리자**(서브관리자·메인관리자)가 다음을 설정·저장할 수 있어야 한다.

- 학년별 일반 학급 교실의 **개수**(반 번호로 추가/삭제)
- 학급마다 **복도 위치**(왼쪽/오른쪽), **배치 유형**(분단형 = 2열 짝책상 / 단독형 = 1열), **분단(열) 개수와 분단별 행 수**
- 칠판·교탁은 항상 **하단**

구조가 바뀐 학급은 좌석 배정이 **초기화**되고, 출석 화면(`/attendance/[grade]`)·좌석 편집기·인쇄물 모두 새 구조로 그려진다. 인쇄 디자인(A4 fit, 셀 크기, 제목/교탁)은 유지한다.

## 확정된 결정

| 항목 | 결정 |
|------|------|
| 학급 식별 | **반 번호**(정수). 제목은 `"{학년}-{반}반"` 자동 생성. 학생 `classNumber`와 값만 같을 뿐 DB 관계는 없음 |
| 복도 위치 | **표시만**. 해당 쪽에 세로 "복도" 라벨, 반대쪽에 "창문" 라벨. 분단 번호는 항상 왼쪽부터 1 |
| 배치 단위 | **교실 단위 유형**(분단형/단독형) + **분단별 행 수 배열**. 예: 분단형 3분단, 행 `[6,6,5]` |
| 설정 위치 | 좌석 배치 탭(오후) 안의 "교실 구조 설정" 버튼 → 모달. `SeatingEditor`를 공유하므로 `/admin/seats`에도 같이 노출 |
| 수정 권한 | 학년 관리자(`SubAdminAssignment`)와 메인관리자. 담임교사는 불가 |
| 데이터 모델 | **A안**: 새 `Classroom` 모델 + `Room.classroomId`(nullable). 미래혜윰·야간 Room은 FK null로 불변 |
| 초기화 범위 | 유형·분단 수·행 수 중 하나라도 바뀌면 **그 학급의 SeatLayout 전부 삭제** 후 Room 재생성. 복도 위치만 바뀌면 배정 보존 |
| 기존 데이터 | 마이그레이션 백필로 기존 `"N-M반 분단K"` Room을 Classroom에 연결. **좌석 배정 보존** |

## 비목표 (Non-goals)

- 담임교사의 자기 반 구조 수정
- 2학년 오후 미래혜윰실, 야간 미래홀 도면·복도석 구조 편집
- 분단마다 유형이 다른 혼합 배치
- 학급 표시 이름 별칭, 교실별 시간 설정
- 분단 번호를 복도 기준으로 뒤집는 옵션

---

## 1. 데이터 모델

`prisma/schema.prisma`

```prisma
enum CorridorSide {
  left
  right
}

enum ClassroomLayoutType {
  division  // 분단형: 분단 1개 = 2열 짝책상
  single    // 단독형: 열 1개 = 1열
}

model Classroom {
  id           Int                 @id @default(autoincrement())
  sessionId    Int                 @map("session_id")
  classNumber  Int                 @map("class_number")
  corridorSide CorridorSide        @default(right) @map("corridor_side")
  layoutType   ClassroomLayoutType @default(division) @map("layout_type")
  sortOrder    Int                 @default(0) @map("sort_order")

  session StudySession @relation(fields: [sessionId], references: [id])
  rooms   Room[]

  @@unique([sessionId, classNumber])
  @@index([sessionId, sortOrder])
  @@map("classrooms")
}

model Room {
  // 기존 필드 유지
  classroomId Int? @map("classroom_id")
  classroom   Classroom? @relation(fields: [classroomId], references: [id])
  @@index([classroomId])
}

model StudySession {
  classrooms Classroom[]
}
```

- `Classroom.sortOrder`는 항상 `classNumber`와 같은 값으로 저장한다(반 번호 순 정렬). 별도 정렬 UI는 두지 않는다.
- 학급 소속 Room: `name = "{grade}-{classNumber}반 분단{k}"`(분단형) 또는 `"{grade}-{classNumber}반 {k}열"`(단독형), `cols = 2 | 1`, `rows = rowsPerDivision[k-1]`, `sortOrder = k`. `divisionLabel(name)`("분단1"/"1열")은 기존 헬퍼 그대로 동작한다.
- 삭제 순서는 서비스 코드의 트랜잭션이 보장한다(SeatLayout → Room → Classroom). Prisma의 `onDelete: Cascade`는 쓰지 않는다(기존 `SeatLayout.room` 관계와 일관).

### 마이그레이션 (`prisma/migrations/20260915000000_add_classrooms/migration.sql`, 수기 작성)

로컬 DB가 없으므로 SQL을 직접 작성하고 Railway `migrate deploy`로 적용한다. 단일 트랜잭션.

1. enum 2개, `classrooms` 테이블, `rooms.classroom_id` 컬럼·인덱스·FK 생성.
2. 백필: `study_sessions.type = 'afternoon'` 인 세션의 `rooms` 중 이름이 `^[0-9]+-[0-9]+반 분단[0-9]+$` 에 일치하는 행에서 반 번호를 추출해 `(session_id, class_number)` 별 `classrooms` 행을 `INSERT`(corridor `right`, layout `division`, `sort_order = class_number`), 이어서 해당 `rooms.classroom_id`를 `UPDATE`. 기존 `rooms.sort_order`는 그대로 둔다(학급 내 순서는 `sort_order` 오름차순이면 충분).
3. `tests/classroom-migration.test.ts`가 SQL 파일에 enum·테이블·백필 UPDATE·정규식 패턴이 존재하는지 스캔한다(`session-split-migration.test.ts`와 같은 방식).

시드(`prisma/seed.ts`): 오후 세션마다 4·5·6반 `Classroom`(분단형, 복도 오른쪽, 행 `[3,3,3]`)을 만들고 기존 9개 Room에 `classroomId`를 연결한다. 미래혜윰·야간 시드는 그대로.

---

## 2. 순수 로직 (`src/lib/seats/classroom-config.ts`, 신규)

```ts
export type CorridorSide = "left" | "right";
export type ClassroomLayoutType = "division" | "single";

export type ClassroomConfig = {
  classNumber: number;
  corridorSide: CorridorSide;
  layoutType: ClassroomLayoutType;
  rowsPerDivision: number[];  // 길이 = 분단(열) 개수
};

export const CLASSROOM_LIMITS = {
  classNumber: { min: 1, max: 20 },
  divisions: { min: 1, max: 6 },
  rows: { min: 1, max: 10 },
} as const;

export type PlannedRoom = { name: string; cols: number; rows: number; sortOrder: number };

// 설정 → 생성할 Room 목록. cols는 division=2, single=1.
export function planClassroomRooms(grade: number, config: ClassroomConfig): PlannedRoom[];

// 기존 Room(cols/rows/sortOrder 오름차순)과 설정을 비교. 유형·분단 수·행 수 중 하나라도 다르면 true.
export function isGeometryChanged(
  existingRooms: { cols: number; rows: number; sortOrder: number }[],
  config: ClassroomConfig
): boolean;

export function seatCountOf(config: ClassroomConfig): number;

export function corridorLabels(side: CorridorSide): { left: string; right: string };
// right → { left: "창문", right: "복도" }, left → { left: "복도", right: "창문" }
```

`zod` 스키마 `classroomConfigSchema`도 이 파일에서 export 해 API와 모달 폼이 공유한다(`rowsPerDivision`은 정수 배열, 길이·값 범위는 `CLASSROOM_LIMITS`).

---

## 3. 그룹 규칙 확장 (`src/lib/seats/print-groups.ts`)

```ts
export type ClassroomMeta = {
  id: number;
  classNumber: number;
  corridorSide: CorridorSide;
  layoutType: ClassroomLayoutType;
  sortOrder: number;
};

export type PrintBaseRoom = {
  id: number; name: string; cols: number; rows: number; sortOrder: number;
  classroom?: ClassroomMeta | null;   // 신규(선택). 없으면 기존 접두사 규칙
};

export type PrintGroup<T> = {
  key: string; title: string; kind: PrintGroupKind; rooms: T[];
  classroom?: ClassroomMeta;          // 학급 그룹에만 존재
};
```

`buildPrintGroups(rooms, sessionType, grade)` 오후 분기:

1. `classroom`이 있는 Room은 `classroom.id`로 묶는다. 그룹 순서 = `classroom.sortOrder` → `classroom.id`, 그룹 안 Room 순서 = `room.sortOrder`. `key = title = "{grade}-{classNumber}반"`, `kind = "divisions-row"`, `classroom` 메타 포함.
2. `classroom`이 없는 Room은 기존 접두사 규칙으로 묶는다(미래혜윰 → `divisions-column`).
3. 결과 = 학급 그룹들(반 번호 순) + 접두사 그룹들(sortOrder 순). 야간 분기는 변경 없음.

기존 호출부 3곳(편집기·출석·인쇄)은 시그니처가 같아 그대로 동작하고, `group.classroom`이 있을 때만 프레임(복도/창문 라벨)을 그린다.

### API 응답 확장

- `GET /api/grade-admin/[grade]/seat-layouts`: `rooms[]`에 `classroom: ClassroomMeta | null` 포함(`include: { classroom: true }`).
- `GET /api/attendance`: `rooms[]`에 `classroom` 포함.
- 인쇄 페이지의 `ApiRoom` 타입이 `PrintBaseRoom`을 확장하므로 자동 전달.

---

## 4. API (`src/app/api/grade-admin/[grade]/classrooms/`)

모두 `withGradeAuth(grade, …)`. 학년 검증(1–3)은 기존 seat-layouts 라우트와 동일. 대상 세션은 `studySession.findUnique({ type: "afternoon", grade })` — 없으면 404.

| 메서드 | 경로 | 요청 | 응답 / 동작 |
|---|---|---|---|
| GET | `route.ts` | — | `{ classrooms: (ClassroomMeta & { rowsPerDivision: number[]; seatCount: number; assignedCount: number })[] }`. `rowsPerDivision`은 Room `sortOrder` 순 `rows`, `assignedCount`는 `studentId`가 있는 SeatLayout 수 |
| POST | `route.ts` | `ClassroomConfig` | 같은 세션에 같은 `classNumber`가 있으면 409. 트랜잭션: Classroom 생성 → `planClassroomRooms` 결과 Room 생성. 201 `{ classroom }` |
| PUT | `[id]/route.ts` | `ClassroomConfig` (`classNumber` 변경 허용) | 404/409 검사 후 트랜잭션: 메타 갱신. `isGeometryChanged`가 true면 해당 Room들의 SeatLayout `deleteMany` → Room `deleteMany` → 재생성. false면 `classNumber` 변경 시 Room 이름만 갱신. `classNumber`가 바뀌면 `sortOrder`도 같은 값으로 갱신. 응답 `{ classroom, reset: boolean }` |
| DELETE | `[id]/route.ts` | — | 트랜잭션: SeatLayout → Room → Classroom 삭제. `{ success: true }` |

- 입력 검증은 `classroomConfigSchema.safeParse`, 실패 시 400 `{ error }`.
- `withGradeAuth`가 학급 소속 세션의 `grade`를 보장하므로 `[id]` 라우트는 `classroom.session.grade === grade`를 추가로 확인해 다른 학년의 id 접근을 404로 막는다.

---

## 5. UI

### 5.1 `ClassroomFrame` (`src/components/seats/ClassroomFrame.tsx`, 신규)

분단 격자를 감싸는 공용 프레임. dnd-kit 비의존(인쇄에서도 사용).

```ts
type Props = {
  corridorSide: CorridorSide;
  variant: "screen" | "print";
  showTeacherDesk?: boolean;   // 기본 true
  children: ReactNode;         // 분단 격자(grid)
};
```

- 가로 3열 그리드: `[라벨] [children] [라벨]`. 라벨은 `writing-mode: vertical-rl` 세로 텍스트("복도"/"창문", `corridorLabels`), `whitespace-nowrap`.
- 하단 "교탁": `screen`은 기존 출석 화면의 점선 상단 박스 스타일, `print`는 기존 `SeatPrintGroup`의 테두리 박스 스타일을 그대로 옮긴다(디자인 불변).
- `variant="print"`는 고정 px(라벨 폭 20px, 갭 `SEAT_CELL_GAP`)만 사용해 `PrintPageFitter` 실측이 정확하도록 한다.

### 5.2 `ClassroomConfigModal` (`src/components/seats/ClassroomConfigModal.tsx`, 신규)

- 열기: `SeatingEditor` 오후 탭 헤더의 "교실 구조 설정" 버튼(`min-h-11 whitespace-nowrap`).
- 목록: 반 · 유형 · 복도 · 행 수(`6/6/5`) · 좌석 수 · 배정 수, 행마다 "수정"/"삭제". 표는 `overflow-x-auto` + 셀 `whitespace-nowrap`.
- 폼(추가/수정 공용): 반 번호(number), 복도(라디오 왼쪽/오른쪽), 유형(라디오 분단형/단독형), 분단 개수(1–6, 바꾸면 행 수 입력칸 개수가 따라감), 분단별 행 수(1–10). 폼 아래에 `planClassroomRooms` 결과를 `PrintRoomGrid`로 축소 미리보기(좌석 수 표시).
- 확인 단계: 수정 시 클라이언트에서 `isGeometryChanged`가 true이고 `assignedCount > 0`이면 "현재 배정된 N명의 좌석이 초기화됩니다. 계속할까요?" 확인. 삭제도 같은 확인. 저장 성공 후 목록 SWR과 `SeatingEditor`의 좌석 SWR을 `mutate`.
- 모달 컨테이너는 `max-h-[90dvh] overflow-y-auto`, 버튼 `min-h-11`.

### 5.3 렌더러 3곳

| 파일 | 변경 |
|---|---|
| `SeatingEditor.tsx` | 오후 그룹에서 `group.classroom`이 있으면 `<ClassroomFrame variant="screen">`로 분단 격자를 감싼다. `RoomGrid`의 자체 교탁은 `hideTeacherDesk`로 끄고 프레임 교탁 1개만 표시. 미래혜윰 그룹은 기존 그대로 |
| `attendance/[grade]/page.tsx` | 오후 그룹 카드 안 격자를 `ClassroomFrame`으로 감싼다(교탁 박스는 프레임으로 이동). 미래혜윰 그룹은 기존 교탁 박스 유지 |
| `SeatPrintGroup.tsx` | `divisions-row`이고 `group.classroom`이 있으면 `<ClassroomFrame variant="print">` 사용, 아니면 기존 교탁 박스 |

단독형은 `cols=1` Room이므로 격자 컴포넌트(`RoomGrid`/`PrintRoomGrid`/출석 그리드)는 손대지 않는다. 열 라벨은 `divisionLabel`이 `"1열"`을 돌려주므로 그대로.

---

## 6. 데이터 흐름

```
관리자 → ClassroomConfigModal → POST/PUT/DELETE /api/grade-admin/[grade]/classrooms
      → (트랜잭션) Classroom/Room/SeatLayout 갱신
      → mutate(seat-layouts) → SeatingEditor 재렌더(새 격자, 초기화된 좌석)

감독교사 → /attendance/[grade] → GET /api/attendance (rooms + classroom 메타)
        → buildPrintGroups → ClassroomFrame + 출석 격자

인쇄 → GET seat-layouts → buildPrintGroups → SeatPrintGroup(ClassroomFrame print) → PrintPageFitter
```

---

## 7. 에러 처리

- 400: zod 검증 실패(범위 밖 반 번호·분단·행 수, 배열 길이 0).
- 404: 세션 없음, 다른 학년/없는 classroom id.
- 409: 같은 세션에 같은 반 번호 존재 → 모달에 "이미 있는 반 번호입니다."
- 트랜잭션 실패는 500 + `console.error`, 모달은 "저장에 실패했습니다." 표시 후 폼 유지.

---

## 8. 테스트

| 파일 | 내용 |
|---|---|
| `tests/classroom-config.test.ts` (신규) | `planClassroomRooms`(분단형/단독형 이름·cols·rows·sortOrder), `isGeometryChanged`(동일/행 수 변경/분단 수 변경/유형 변경/순서 무관), `seatCountOf`, `corridorLabels`, zod 경계값 |
| `tests/seat-print-groups.test.ts` (갱신) | 학급 그룹(반 번호 순, `classroom` 메타, `divisions-row`) + 미래혜윰 접두사 그룹 혼합, classroom 없는 기존 픽스처 회귀 |
| `tests/classroom-migration.test.ts` (신규) | 마이그레이션 SQL에 enum·테이블·FK·백필 정규식·UPDATE 존재 |
| `tests/classroom-wiring.test.ts` (신규) | 편집기·출석·인쇄 3곳이 `ClassroomFrame`을 import 하고 `group.classroom`으로 분기하는지, `ClassroomFrame`이 dnd-kit 비의존인지, API 라우트가 `classroomConfigSchema`·`isGeometryChanged`·`$transaction`을 쓰는지 src 스캔 |
| `tests/session-literal-guard.test.ts` (갱신) | 허용 목록에 `app/api/grade-admin/[grade]/classrooms/route.ts`, `[id]/route.ts` 추가 |
| `tests/seat-print-wiring.test.ts` (갱신) | `SeatPrintGroup` 교탁 단언을 `ClassroomFrame` 사용으로 조정 |

기존 `seating-editor-responsive.test.ts`·`responsive-tables.test.ts`가 클래스 스캔으로 고정한 식별자는 유지한다.

---

## 9. 구현 순서

1. 스키마 + 수기 마이그레이션 + 시드 + 마이그레이션 테스트 (`prisma-migration-guardian` 검수)
2. `classroom-config.ts` 순수 로직 + 테스트
3. `print-groups.ts` 확장 + 테스트, API 응답에 `classroom` 포함
4. classrooms API 4개 + literal-guard 갱신
5. `ClassroomFrame` + 렌더러 3곳 배선 + 배선 테스트
6. `ClassroomConfigModal` + `SeatingEditor` 버튼
7. `responsive-ui-reviewer` → 위반 수정, `project-map-updater`
