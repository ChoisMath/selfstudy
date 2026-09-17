import type { GalleryEntry } from "./types";
import { PC_VIEWPORT } from "../layout";
import { StudentTableMock } from "../../grade-admin/mocks/StudentTableMock";
import { StudentModalMock } from "../../grade-admin/mocks/StudentModalMock";
import { ExcelUploadMock } from "../../grade-admin/mocks/ExcelUploadMock";
import { GRADE, STUDENT_ROWS, NEW_STUDENT, EXCEL_RESULT } from "../../grade-admin/data";

// 태스크 3 몫: 학생 관리 표·학생 추가 모달·Excel 업로드 모달. 파일명은 "grade-participation" 이지만
// 병렬 충돌을 막으려는 배치라 그대로 둔다(task-3-brief 참고).
const TABLE_WIDTH = PC_VIEWPORT.w;
// 갤러리 캔버스 전용 높이(컴포넌트는 height 를 받지 않고 자연 높이로 그린다) — 44(툴바)+16(mb-4)+44(헤더)+
// 37행*68(ROW_H)+44(푸터) = 2664, 여유를 조금 두었다.
const TABLE_HEIGHT = 2680;

const MODAL_WIDTH = PC_VIEWPORT.w;
const MODAL_HEIGHT = PC_VIEWPORT.h;

export const ENTRIES: GalleryEntry[] = [
  {
    id: "GradeAdmin-Students",
    width: TABLE_WIDTH,
    height: TABLE_HEIGHT,
    component: () => <StudentTableMock width={TABLE_WIDTH} rows={STUDENT_ROWS} />,
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
