import type { GalleryEntry } from "./types";
import { PC_VIEWPORT } from "../layout";
import { StudentTableMock } from "../../grade-admin/mocks/StudentTableMock";
import { StudentModalMock } from "../../grade-admin/mocks/StudentModalMock";
import { ExcelUploadMock } from "../../grade-admin/mocks/ExcelUploadMock";
import { GRADE, STUDENT_ROWS, NEW_STUDENT, EXCEL_RESULT } from "../../grade-admin/data";

// 태스크 3 몫: 학생 관리 표·학생 추가 모달·Excel 업로드 모달. 파일명은 "grade-participation" 이지만
// 병렬 충돌을 막으려는 배치라 그대로 둔다(task-3-brief 참고).
const TABLE_WIDTH = PC_VIEWPORT.w;
const TABLE_HEIGHT = 1800; // 37행(36 활성 + 비활성 1) 전부 보이도록 넉넉히 잡은 갤러리 전용 높이

const MODAL_WIDTH = PC_VIEWPORT.w;
const MODAL_HEIGHT = PC_VIEWPORT.h;

export const ENTRIES: GalleryEntry[] = [
  {
    id: "GradeAdmin-Students",
    width: TABLE_WIDTH,
    height: TABLE_HEIGHT,
    component: () => <StudentTableMock width={TABLE_WIDTH} height={TABLE_HEIGHT} rows={STUDENT_ROWS} />,
  },
  {
    id: "GradeAdmin-StudentModal",
    width: MODAL_WIDTH,
    height: MODAL_HEIGHT,
    component: () => (
      <StudentModalMock
        width={MODAL_WIDTH}
        height={MODAL_HEIGHT}
        grade={GRADE}
        mode="add"
        classNumber={{ text: String(NEW_STUDENT.classNumber) }}
        studentNumber={{ text: String(NEW_STUDENT.number) }}
        name={{ text: NEW_STUDENT.name }}
      />
    ),
  },
  {
    id: "GradeAdmin-Excel",
    width: MODAL_WIDTH,
    height: MODAL_HEIGHT,
    component: () => (
      <ExcelUploadMock
        width={MODAL_WIDTH}
        height={MODAL_HEIGHT}
        grade={GRADE}
        step="result"
        fileName="1학년_학생명단.xlsx"
        result={EXCEL_RESULT}
      />
    ),
  },
];
