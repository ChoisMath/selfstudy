# 좌석배치 인쇄(출력) — 설계

> 작성일: 2026-08-13
> 대상: `/grade-admin/[grade]` 좌석배치 탭 (및 동일 컴포넌트를 쓰는 `/admin/seats`)

## 배경 / 목표

학년 관리자가 좌석배치 탭에서 `출력` 버튼을 눌러, 배치된 좌석을 **학급 단위로 A4 한 장씩** 인쇄할 수 있어야 한다.

- 학급마다 **모든 분단**이 화면에 설계된 배치 그대로 나와야 한다.
- 각 페이지는 A4 **가운데에 한 페이지 꽉 차게** 출력된다.
- 가로/세로는 학급 구성에 맞게 **자동 추천**하되, 교사가 학급별로 **직접 바꿀 수 있다**.
- 야간자습은 미래홀 도면 전체가 한 덩어리이므로 **도면 전체를 A4 한 장에 꽉 채워** 출력한다.

## 확정된 결정

| 항목 | 결정 |
|------|------|
| 인쇄 범위 | 오후자습 = **학급별 1페이지**, 야간자습 = **도면/나열 전체 1페이지** |
| 야간 1·3학년 | 미래홀 도면 레이아웃이 없으므로 **화면의 교실 세로 나열 그대로 1페이지** |
| 방향 저장 위치 | **브라우저 localStorage** (DB 스키마 변경 없음) |
| 혼합 방향 인쇄 | **CSS 명명 페이지**(`@page landscapePage/portraitPage` + `page:` 속성) |
| 페이지 내용 | 제목 + 분단 라벨 + 교탁 + 좌석(반-번호 / 이름), 빈 좌석은 테두리만 |
| 출력 UI | `출력` 버튼 → **새 탭 인쇄 미리보기 페이지** |
| 대상 선택 | 그룹별 **체크박스**(기본 전체 선택) |
| 교탁 | 페이지당 **1개**(하단 중앙). 현재 화면은 분단마다 1개씩 그리지만, 실제 교실은 반에 교탁 1개이므로 인쇄에서는 통합 |

## 비목표 (Non-goals)

- 출결(출석/결석) 정보 인쇄 — 좌석 배치만 인쇄한다.
- 미배정 학생 목록 인쇄.
- 서버 측 PDF 생성 — 브라우저 인쇄 기능만 사용한다.
- 방향 설정의 서버 저장/교사 간 공유.

---

## 1. 인쇄 그룹 모델

`src/lib/seats/print-groups.ts` (신규, 순수 함수 · DOM 비의존)

```ts
export type PrintGroupKind =
  | "divisions-row"     // 분단을 가로로 나열 (일반 학급)
  | "divisions-column"  // 분단을 세로로 나열 (오후미래혜윰)
  | "hall"              // 2학년 야간: MiraeHallLayout 도면
  | "stack";            // 1·3학년 야간: 교실 세로 나열

export type PrintGroup<T extends BaseRoom = BaseRoom> = {
  key: string;    // localStorage 방향 저장 키 & React key. 예: "2-4반", "night"
  title: string;  // 페이지 제목 우측 부분. 예: "2-4반", "미래홀"
  kind: PrintGroupKind;
  rooms: T[];     // sortOrder 오름차순
};

export function buildPrintGroups<T extends BaseRoom>(
  rooms: T[],
  sessionType: "afternoon" | "night",
  grade: number
): PrintGroup<T>[];
```

### 그룹핑 규칙

**오후자습** — `sortOrder` 오름차순 정렬 후, 방 이름의 첫 토큰(`name.split(" ")[0]`)을 접두사로 하여 **연속 구간**을 묶는다. (현재 `SeatingEditor`의 인라인 그룹핑과 동일한 의미)

- `kind`: 접두사가 `"오후미래혜윰"`으로 시작하면 `divisions-column`, 아니면 `divisions-row`
- `key` = `title` = 접두사

2학년 실제 데이터 기준 결과:

| key | 방 | 배치 |
|---|---|---|
| `2-4반` | 분단1~3 (각 2열×3행) | 가로 나열 |
| `2-5반` | 분단1~3 (각 2열×3행) | 가로 나열 |
| `2-6반` | 분단1~3 (각 2열×3행) | 가로 나열 |
| `오후미래혜윰1` | 분단1~2 (각 5열×2행) | 세로 나열 |
| `오후미래혜윰2` | 분단1~3 (각 5열×2행) | 세로 나열 |

**야간자습** — 전체 방을 담은 그룹 1개.

- `grade === 2` → `kind: "hall"`, 그 외 → `kind: "stack"`
- `key` = `"night"`, `title` = `"미래홀"`

> 이 헬퍼는 인쇄 페이지와 `SeatingEditor` **양쪽에서 사용**한다. 화면 배치와 인쇄 배치가 갈라지지 않게 하는 것이 이 파일의 존재 이유다.

---

## 2. 페이지 맞춤(꽉 채우기) 메커니즘

좌석 셀을 **고정 픽셀 크기**로 렌더하면 그룹 콘텐츠의 자연 크기가 확정된다. 그 자연 크기를 실측해 A4 가용 영역에 맞는 배율로 축소/확대한다.

### 상수

```ts
const MM_TO_PX = 96 / 25.4;           // 3.7795
const A4 = { shortMm: 210, longMm: 297 };
const PAGE_MARGIN_MM = 8;
const SEAT_CELL = { width: 96, height: 60, gap: 4 };  // px
```

가용 영역(px):

| 방향 | 폭 | 높이 |
|---|---|---|
| 세로 | (210−16)mm ≈ **733** | (297−16)mm ≈ **1062** |
| 가로 | (297−16)mm ≈ **1062** | (210−16)mm ≈ **733** |

### 절차 (`PrintPageFitter`)

1. 페이지 박스는 `210mm × 297mm`(세로) / `297mm × 210mm`(가로)로 **고정**.
2. 내부 콘텐츠(제목 + 좌석 격자 + 교탁)를 자연 크기로 렌더.
3. `useLayoutEffect`에서 콘텐츠 래퍼의 `offsetWidth/offsetHeight` 측정.
4. `scale = min(가용폭 / 콘텐츠폭, 가용높이 / 콘텐츠높이)` — 상한 없음(작은 학급은 확대되어 꽉 참).
5. `transform: scale(scale)` + `transform-origin: center` 로 페이지 정중앙 배치.

콘텐츠 크기가 0이면(첫 렌더) 배율 1로 두고, 측정 후 리렌더한다.

---

## 3. 가로/세로 자동 추천

측정된 콘텐츠 비율 `r = 콘텐츠폭 / 콘텐츠높이` 로 판정한다.

```
r >= 1  →  가로(landscape)
r <  1  →  세로(portrait)
```

**근거** — 콘텐츠를 (w, h)=(r, 1)로 정규화하면 배율은 `가로 = min(297/r, 210)`, `세로 = min(210/r, 297)`(mm 기준). `0.707 < r < 1.414` 구간에서 가로 배율은 `210`, 세로 배율은 `210/r` 이므로 **세로가 유리한 조건이 정확히 `r < 1`** 이다. `r ≥ 1.414`면 가로(`297/r > 210/r`), `r ≤ 0.707`이면 세로. 즉 전 구간에서 `r = 1`이 유일한 분기점이다.

**검산** (제목·교탁 포함 자연 크기 기준, 셀 96×60):

| 그룹 | 콘텐츠 폭 × 높이 (px) | r | 판정 |
|---|---|---|---|
| `2-4반` | 620 × 288 | 2.15 | 가로 ✓ |
| `오후미래혜윰1` | 496 × 384 | 1.29 | 가로 ✓ |
| `오후미래혜윰2` | 496 × 544 | 0.91 | 세로 ✓ |

요청하신 예시(2-4·5·6반과 오후미래혜윰1은 가로, 오후미래혜윰2는 세로)와 일치한다. 야간 미래홀은 실측 비율로 자동 판정되며 교사가 토글로 뒤집을 수 있다.

### 저장

```
localStorage["seatPrintOrientation:{grade}:{sessionType}"]
  = { "2-4반": "landscape", "오후미래혜윰2": "portrait", ... }
```

- 저장된 값이 있으면 그것을, 없으면 자동 추천값을 쓴다.
- 토글 변경 즉시 저장한다.
- 파싱 실패 시 조용히 무시하고 자동 추천값을 쓴다.
- **체크박스 선택 상태는 저장하지 않는다** — 열 때마다 전체 선택.

---

## 4. 라우트와 UI

### 진입: `SeatingEditor` 헤더

`저장` 버튼 왼쪽에 `출력` 버튼을 추가한다.

```
if (dirty.size > 0) → confirm("저장하지 않은 변경사항은 인쇄에 반영되지 않습니다. 계속할까요?")
window.open(`/grade-admin/${grade}/seats/print?session=${sessionType}`, "_blank")
```

인쇄 페이지는 DB에서 좌석을 다시 읽으므로, 저장 전 편집 내용은 반영되지 않는다. 그래서 확인창이 필요하다.

`SeatingEditor`는 `/admin/seats`와 `/grade-admin/[grade]/seats` 양쪽에서 쓰인다. 미들웨어가 `/grade-admin/*`을 **admin 역할에도 허용**하므로(`src/middleware.ts:52-62`), 전체관리자도 같은 인쇄 라우트를 그대로 쓸 수 있다. 별도 `/admin` 인쇄 라우트는 만들지 않는다.

### 인쇄 미리보기: `/grade-admin/[grade]/seats/print?session=afternoon|night`

클라이언트 컴포넌트. `session` 쿼리가 없거나 잘못되면 `afternoon`으로 처리한다.

- 데이터: 기존 `GET /api/grade-admin/{grade}/seat-layouts?sessionType=...` 를 SWR로 재사용 (**API 추가 없음**)
- 상단 툴바 (`.no-print`, sticky):
  - 좌측: 그룹마다 `[체크박스] 그룹명 [가로|세로] 토글`
  - 우측: `인쇄` 버튼(`window.print()`), `닫기` 버튼(`window.close()`)
  - 선택된 그룹이 0개면 `인쇄` 비활성
  - Chrome/Edge 외 브라우저를 위한 안내 한 줄: "가로·세로 혼합 인쇄는 Chrome·Edge에서 정확히 동작합니다."
- 본문: 회색 배경 위에 A4 종이 카드(흰 배경 + 그림자)를 세로로 나열 → 실제 인쇄물과 동일한 모습
- 방이 하나도 없으면 "인쇄할 좌석 배치가 없습니다." 안내

---

## 5. 인쇄 CSS

`src/app/grade-admin/[grade]/seats/print/print.css` (해당 페이지에서만 import)

```css
@page portraitPage  { size: A4 portrait;  margin: 0; }
@page landscapePage { size: A4 landscape; margin: 0; }

.print-page                { break-after: page; }
.print-page:last-of-type   { break-after: auto; }
.print-page-portrait       { page: portraitPage; }
.print-page-landscape      { page: landscapePage; }

@media print {
  .no-print { display: none !important; }
  body      { background: #fff; }
  .print-page { box-shadow: none; margin: 0; }
}
```

페이지 박스 자체는 인라인 스타일로 `width/height`를 mm 고정한다. 여백을 `@page margin: 0`으로 두고 페이지 박스 내부 패딩(8mm)으로 처리해, 브라우저 기본 여백이 배율 계산을 흔들지 않게 한다.

---

## 6. 페이지 구성

```
┌──────────────────────────────────────────┐
│  2학년 오후자습 — 2-4반                    │   ← 제목
│                                          │
│   분단1        분단2        분단3          │   ← 분단 라벨
│  ┌──┬──┐    ┌──┬──┐     ┌──┬──┐          │
│  │  │  │    │  │  │     │  │  │          │   ← 좌석 (반-번호 / 이름)
│  ├──┼──┤    ├──┼──┤     ├──┼──┤          │
│  ...                                     │
│                                          │
│                 [ 교탁 ]                  │   ← 페이지당 1개
└──────────────────────────────────────────┘
```

- **제목**: `{grade}학년 {오후자습|야간자습} — {group.title}`
- **좌석 셀**: 상단에 작은 회색 `{classNumber}-{studentNumber}`, 아래 학생 이름. 빈 좌석은 테두리만(현재 화면의 `1-1` 좌표 텍스트는 인쇄하지 않음)
- **교탁**: 오후자습 그룹(`divisions-row`, `divisions-column`)만 하단 중앙에 1개. 야간(`hall`, `stack`)은 표시하지 않는다 — 미래홀 도면은 현재 화면에서도 `hideTeacherDesk`이며, 1·3학년 나열도 같은 공간이므로 동일하게 맞춘다
- **분단 라벨**: 방 이름에서 접두사를 제거한 나머지(예: `2-4반 분단1` → `분단1`). 나머지가 비면 방 이름 전체를 쓴다

배치는 `kind`별로:

| kind | 배치 |
|---|---|
| `divisions-row` | `grid-template-columns: repeat(분단수, max-content)` |
| `divisions-column` | 세로 1열 |
| `hall` | `MiraeHallLayout`에 `PrintRoomGrid`를 `renderRoom`으로 주입 |
| `stack` | 세로 1열 (방 이름 라벨 포함) |

---

## 7. 컴포넌트 구조

```
/grade-admin/[grade]/seats/print/page.tsx     (client)
├── 툴바 (.no-print)
└── PrintPageFitter × N                        페이지 박스 + 측정 + scale
    └── SeatPrintGroup                         제목 + kind별 배치 + 교탁
        ├── PrintRoomGrid × M                  dnd 없는 읽기전용 격자
        └── MiraeHallLayout (kind === "hall")  fitContent 모드
```

### `PrintRoomGrid` (신규)

`RoomGrid`는 `useDroppable`/`useDraggable`을 쓰므로 `DndContext` 밖에서 렌더할 수 없다. 훅은 조건부 호출이 불가능하므로 `readOnly` 프롭으로 우회할 수 없다. 따라서 **인쇄 전용 표현 컴포넌트를 분리**한다.

- props: `{ room, seats, gapAfterRows?, label? }`
- 셀 크기는 `SEAT_CELL` 상수로 고정(`grid-template-columns: repeat(cols, 96px)`) — 자연 크기 측정의 전제
- 호버/삭제 버튼/드래그 커서 없음, 인쇄용 검정 테두리

### `MiraeHallLayout` 수정

현재 컨테이너 스타일에 `minWidth: "700px"`와 `overflow-x-auto`가 하드코딩되어 있어(`src/components/seats/MiraeHallLayout.tsx:42-56`) 자연 크기 측정이 왜곡된다. **선택적 `fitContent?: boolean` 프롭**을 추가해, 참이면 `minWidth`를 제거하고 `overflow-x-auto`를 붙이지 않으며 `width: max-content`로 렌더한다. 기존 호출부는 프롭을 넘기지 않으므로 동작 변화가 없다.

### `SeatingEditor` 수정

1. `출력` 버튼 추가(위 4절)
2. 오후자습 그룹핑 IIFE(`src/components/seats/SeatingEditor.tsx:354-391`)를 `buildPrintGroups`로 교체. 그룹 컬럼 수 계산(`오후미래혜윰` 여부로 1열/N열)도 `kind`로 대체한다. **화면 렌더 결과는 동일해야 한다.**

---

## 8. 권한

- 라우트: 미들웨어가 `/grade-admin/{grade}/*`를 admin + 해당 학년 sub_admin에게만 허용 → 추가 검사 불필요
- 데이터: 기존 `withGradeAuth`가 걸린 `seat-layouts` GET을 그대로 사용

---

## 9. 테스트

기존 관행대로 `npx tsx tests/*.test.ts` 로 실행하는 단위/계약 테스트를 추가한다.

**`tests/seat-print-groups.test.ts`** — 순수 함수 단위 테스트
- 오후자습 2학년 방 14개 → 그룹 5개, 순서와 `kind`가 기대와 일치
- `오후미래혜윰*` 그룹만 `divisions-column`
- 야간 2학년 → `hall` 1그룹, 야간 1학년 → `stack` 1그룹
- 방이 없으면 빈 배열
- 방향 추천 함수: `r ≥ 1 → landscape`, `r < 1 → portrait`, 경계값 `r = 1` 포함

**`tests/seat-print-page.test.ts`** — 배선 계약 테스트(소스 문자열 검증, 기존 `notification-bell-placement.test.ts` 방식)
- 인쇄 라우트 파일이 존재하고 `buildPrintGroups`를 사용
- `print.css`에 `@page portraitPage` / `@page landscapePage` / `page:` 규칙이 있음
- `SeatingEditor.tsx`에 `출력` 버튼과 `seats/print` 링크가 있고, `dirty` 확인 분기가 있음
- `PrintRoomGrid.tsx`에 `@dnd-kit` import가 **없음**(읽기전용 보장)

**수동 검증** (구현 후 실제 브라우저)
- 2학년 오후자습 인쇄 미리보기에서 5페이지, 방향이 가로/가로/가로/가로/세로
- Chrome 인쇄 미리보기에서 페이지별 용지 방향이 실제로 섞여 나오는지
- 야간 2학년 도면 1페이지가 잘리지 않고 꽉 차는지

---

## 10. 리스크

| 리스크 | 대응 |
|---|---|
| CSS 명명 페이지는 Chrome/Edge 110+ 필요, Firefox 미지원 | 툴바에 안내 문구. 미지원 브라우저에서는 인쇄 대화상자의 단일 방향으로 전부 출력됨(내용은 잘리지 않고 축소됨) |
| `transform: scale`과 페이지 분할의 상호작용 | 페이지 박스 크기를 mm로 고정하고 **내용만** 스케일하므로 분할 위치는 영향받지 않음 |
| 학생 이름이 길면 셀을 넘침 | 셀에 `whitespace-nowrap` + 폰트 크기 하향 고정. 전체 배율이 축소하므로 실질 문제는 작음 |
| `SeatingEditor` 그룹핑 리팩터링이 화면 배치를 바꿀 위험 | 리팩터링 전후 렌더 결과를 수동 비교, 그룹핑 단위 테스트로 고정 |

---

## 11. 파일 변경 요약

| 구분 | 파일 |
|---|---|
| 신규 | `src/lib/seats/print-groups.ts` |
| 신규 | `src/components/seats/PrintRoomGrid.tsx` |
| 신규 | `src/components/seats/PrintPageFitter.tsx` |
| 신규 | `src/components/seats/SeatPrintGroup.tsx` |
| 신규 | `src/app/grade-admin/[grade]/seats/print/page.tsx` |
| 신규 | `src/app/grade-admin/[grade]/seats/print/print.css` |
| 수정 | `src/components/seats/SeatingEditor.tsx` |
| 수정 | `src/components/seats/MiraeHallLayout.tsx` |
| 신규 테스트 | `tests/seat-print-groups.test.ts`, `tests/seat-print-page.test.ts` |

DB 스키마 변경 없음. API 추가 없음. 환경변수 추가 없음.
