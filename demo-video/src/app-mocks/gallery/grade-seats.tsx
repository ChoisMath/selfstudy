import type React from "react";
import type { GalleryEntry } from "./types";
import { SeatEditorMock, afternoonRoomId } from "../../grade-admin/mocks/SeatEditorMock";
import { ClassroomConfigMock } from "../../grade-admin/mocks/ClassroomConfigMock";
import { SeatPrintMock } from "../../grade-admin/mocks/SeatPrintMock";
import { CLASSROOM_CONFIG_EXAMPLE, PRINT_GROUPS } from "../../grade-admin/data";

const WIDTH = 1248;

// 좌석 편집기 — 선택·호버 상태를 함께 보여 SeatCellView 의 ring·dashed 스타일을 한 스틸에서 검증.
const SeatEditorGallery: React.FC = () => (
  <SeatEditorMock
    width={WIDTH}
    height={960}
    session="afternoon"
    selectedSeat={{ roomId: afternoonRoomId(1, 1), row: 1, col: 1 }}
    hoverSeat={{ roomId: afternoonRoomId(2, 2), row: 2, col: 1 }}
  />
);

// 교실 구조 설정 — 브리프 예시(7반·오른쪽 복도·분단형·3분단·각 3행·18석)의 편집 폼 + 미리보기.
const ClassroomConfigGallery: React.FC = () => (
  <ClassroomConfigMock
    width={WIDTH}
    height={570}
    mode="edit"
    editing={{
      classNumberText: String(CLASSROOM_CONFIG_EXAMPLE.classNumber),
      corridorSide: CLASSROOM_CONFIG_EXAMPLE.corridorSide,
      layoutType: CLASSROOM_CONFIG_EXAMPLE.layoutType,
      rowsPerDivision: CLASSROOM_CONFIG_EXAMPLE.rowsPerDivision,
    }}
  />
);

// 좌석배치도 인쇄 미리보기 — 기본 PRINT_GROUPS(1·2반 가로 체크, 3반 세로 미체크).
const SeatPrintGallery: React.FC = () => <SeatPrintMock width={WIDTH} height={1700} groups={PRINT_GROUPS} />;

export const ENTRIES: GalleryEntry[] = [
  { id: "GradeAdmin-Seats", component: SeatEditorGallery, width: WIDTH, height: 960 },
  { id: "GradeAdmin-ClassroomConfig", component: ClassroomConfigGallery, width: WIDTH, height: 570 },
  { id: "GradeAdmin-SeatPrint", component: SeatPrintGallery, width: WIDTH, height: 1700 },
];
