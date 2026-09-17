import type { GalleryEntry } from "./types";
import { PC_VIEWPORT } from "../layout";
import { StudentTableMock } from "../../grade-admin/mocks/StudentTableMock";
import { StudentModalMock } from "../../grade-admin/mocks/StudentModalMock";
import { ExcelUploadMock } from "../../grade-admin/mocks/ExcelUploadMock";
import { ParticipationTableMock } from "../ParticipationTableMock";
import { GRADE, STUDENT_ROWS, NEW_STUDENT, EXCEL_RESULT, PARTICIPATION_ROWS } from "../../grade-admin/data";

// 태스크 3 몫: 학생 관리 표·학생 추가 모달·Excel 업로드 모달. 파일명은 "grade-participation" 이지만
// 병렬 충돌을 막으려는 배치라 그대로 둔다(task-3-brief 참고).
const TABLE_WIDTH = PC_VIEWPORT.w;
// 갤러리 캔버스 전용 높이(컴포넌트는 height 를 받지 않고 자연 높이로 그린다) — 44(툴바)+16(mb-4)+44(헤더)+
// 37행*68(ROW_H)+44(푸터) = 2664, 여유를 조금 두었다.
const TABLE_HEIGHT = 2680;

const MODAL_WIDTH = PC_VIEWPORT.w;
const MODAL_HEIGHT = PC_VIEWPORT.h;

// 태스크 5b 몫: 참여 설정 표(variant="grade") — Participation·ParticipationBulk 장면용.
// 자연 높이로 그린다(ParticipationTableMock.tsx GradeParticipationTable 은 셸의 scrollY 로 스크롤되는
// 목업 관례라 자체 height 를 받지 않는다) — 아래 높이는 GRADE_TABLE_TOP(60)+HEADER_FULL_H(56)+
// rows.length*BODY_H(45)+FOOT_H(26)+GRADE_FOOTER_BOX_H(44) 에 여유를 조금 둔 값.
const PARTICIPATION_WIDTH = PC_VIEWPORT.w;
const PARTICIPATION_HEIGHT_FULL = 1820; // 36행: 60+56+1620+26+44=1806
const PARTICIPATION_HEIGHT_FILTERED = 740; // 12행(2반): 60+56+540+26+44=726

const CLASS_2_ROWS = PARTICIPATION_ROWS.filter((r) => r.student.classNumber === 2);

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
  {
    id: "GradeAdmin-Participation",
    width: PARTICIPATION_WIDTH,
    height: PARTICIPATION_HEIGHT_FULL,
    component: () => <ParticipationTableMock variant="grade" width={PARTICIPATION_WIDTH} rows={PARTICIPATION_ROWS} />,
  },
  {
    id: "GradeAdmin-ParticipationBulk",
    width: PARTICIPATION_WIDTH,
    height: PARTICIPATION_HEIGHT_FILTERED,
    // 2반만 필터 + 오후2 자습 일괄 해제(모두 참가중이던 세션이라 클릭 시 target=false) — 헤더 체크박스가
    // 즉시 해제된 상태로 보이도록 at:0 으로 둔다(갤러리 스틸은 프레임 0 기준).
    component: () => (
      <ParticipationTableMock
        variant="grade"
        width={PARTICIPATION_WIDTH}
        rows={CLASS_2_ROWS}
        classFilter={2}
        bulkToggle={{ session: "afternoon2", at: 0 }}
      />
    ),
  },
];
