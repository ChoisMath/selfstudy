import React from "react";
import { useCurrentFrame } from "remotion";
import { easeInOut, tween } from "../../anim";
import { APP_HOST } from "../../app-mocks/data";
import { PcViewport, pcAbs, pcRectAbs, type Rect } from "../../app-mocks/layout";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { GuideScene } from "../../guide/GuideScene";
import type { DemoProps } from "../../props";
import { colors } from "../../theme";
import { InsetCard, padRect, type InsetCrop } from "../../teacher/scenes/pc-helpers";
import { GRADE, STUDENT_ROWS } from "../data";
import { GRADE_ADMIN_BODY, GradeAdminShellMock, gradeAdminTabPoint } from "../mocks/GradeAdminShellMock";
import { StudentTableMock, studentTableRect } from "../mocks/StudentTableMock";
import { TodayDashboardMock, todayRect } from "../mocks/TodayDashboardMock";
import { lineAt, lineEnd, lineStart } from "../timing";

const ID = "StudentsList";
const TAB_TITLE = "포산고 자율학습";
const W = GRADE_ADMIN_BODY.w;

// 앞 장면(Today)은 야간 카드까지 내려간 상태로 끝난다 — 같은 스크롤에서 시작해 탭만 바꾼다.
const TODAY_SCROLL = todayRect("night", W).y + todayRect("night", W).h - GRADE_ADMIN_BODY.h;

const FILTER_CLASS = 1;
const CLASS_ROWS = STUDENT_ROWS.filter((row) => row.student.classNumber === FILTER_CLASS);

const INACTIVE_ID = STUDENT_ROWS.find((row) => row.status === "inactive")?.student.id ?? 0;
const FIRST_ID = STUDENT_ROWS[0].student.id;

const tabClick = lineAt(ID, 0, 0.25);
const pageSwap = tabClick + 3;
const filterClick = lineAt(ID, 1, 0.08);
// "표에는 이름, 반, 번호…"로 넘어가기 직전에 전체 반으로 돌린다 — 반 열이 값마다 다른 모습을 보여야 한다.
const allClick = lineAt(ID, 1, 0.35);
const cursorHide = allClick + 16;
const headerFrom = lineAt(ID, 1, 0.45);

const editFrom = lineStart(ID, 2) + 2;
const deleteFrom = lineAt(ID, 2, 0.26);
const scrollFrom = lineAt(ID, 2, 0.5);
const scrollTo = scrollFrom + 26;
const restoreFrom = scrollTo + 5;
const zoomFrom = restoreFrom + 6;
const zoomOut = lineEnd(ID, 2) + 4;

const rowsAt = (frame: number) => (frame >= filterClick && frame < allClick ? CLASS_ROWS : STUDENT_ROWS);
const filterAt = (frame: number) => (frame >= filterClick && frame < allClick ? FILTER_CLASS : undefined);

// 비활성 학생 행이 본문 가운데쯤 오도록 내린다.
const INACTIVE_ROW_Y = studentTableRect(`name_${INACTIVE_ID}`, STUDENT_ROWS, W).y;
const SCROLL_Y = INACTIVE_ROW_Y - 300;

const bodyRect = (r: Rect, scrollY: number): Rect => ({
  ...r,
  x: r.x + GRADE_ADMIN_BODY.x,
  y: r.y + GRADE_ADMIN_BODY.y - scrollY,
});

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const onStudents = frame >= pageSwap;
  const scrollY = tween(frame, [scrollFrom, scrollTo], [0, SCROLL_Y], easeInOut);
  return (
    <BrowserFrame url={`${APP_HOST}/grade-admin/1`} tabTitle={TAB_TITLE}>
      <PcViewport>
        <GradeAdminShellMock
          tab={onStudents ? "students" : "today"}
          showHelp
          tabPressAt={{ tab: "students", at: tabClick }}
          scrollY={onStudents ? scrollY : TODAY_SCROLL}
        >
          {onStudents ? (
            <div style={{ position: "absolute", inset: 0, opacity: tween(frame, [pageSwap, pageSwap + 8], [0, 1]) }}>
              <StudentTableMock
                width={W}
                rows={rowsAt(frame)}
                classFilter={filterAt(frame)}
                actionPressAt={undefined}
              />
            </div>
          ) : (
            <TodayDashboardMock width={W} />
          )}
        </GradeAdminShellMock>
      </PcViewport>
    </BrowserFrame>
  );
};

const inactiveRowRect = (): Rect => {
  const table = studentTableRect("table", STUDENT_ROWS, W);
  const name = studentTableRect(`name_${INACTIVE_ID}`, STUDENT_ROWS, W);
  return { x: table.x, y: name.y, w: table.w, h: name.h };
};

// 관리 열 버튼 글자는 11px 이라 1.25배로도 읽기 어렵다 — 수정·복원 두 버튼만 잘라 키운다.
const ZOOM_SCALE = 3.4;
const zoomCrop = (): InsetCrop => {
  const edit = studentTableRect(`edit_${INACTIVE_ID}`, STUDENT_ROWS, W);
  const restore = studentTableRect(`deleteRestore_${INACTIVE_ID}`, STUDENT_ROWS, W);
  const rect = bodyRect(
    { x: edit.x - 12, y: edit.y - 10, w: restore.x + restore.w - edit.x + 24, h: edit.h + 20 },
    SCROLL_Y,
  );
  return { rect, scale: ZOOM_SCALE };
};

const ZOOM_CROP = zoomCrop();
const ZOOM_CARD = { x: 1740 - (ZOOM_CROP.rect.w * ZOOM_SCALE + 48) - 24, y: 360 };

export const StudentsListScene: React.FC<DemoProps> = () => {
  // 표는 본문보다 훨씬 길다 — 상자는 화면에 보이는 만큼만 그린다(자막 띠까지 내려가지 않게).
  const tableRect = studentTableRect("table", STUDENT_ROWS, W);
  const table = pcRectAbs(bodyRect({ ...tableRect, h: GRADE_ADMIN_BODY.h - tableRect.y - 4 }, 0));
  const header = pcRectAbs(bodyRect({ ...studentTableRect("table", STUDENT_ROWS, W), h: 44 }, 0));
  const filter = pcRectAbs(bodyRect(studentTableRect("classFilter", STUDENT_ROWS, W), 0));
  const edit = pcRectAbs(bodyRect(studentTableRect(`edit_${FIRST_ID}`, STUDENT_ROWS, W), 0));
  const remove = pcRectAbs(bodyRect(studentTableRect(`deleteRestore_${FIRST_ID}`, STUDENT_ROWS, W), 0));
  const inactiveRow = pcRectAbs(bodyRect(inactiveRowRect(), SCROLL_Y));
  const restore = pcRectAbs(bodyRect(studentTableRect(`deleteRestore_${INACTIVE_ID}`, STUDENT_ROWS, W), SCROLL_Y));

  const tab = pcAbs(gradeAdminTabPoint("students"));
  const filterCenter = { x: filter.x + filter.width / 2, y: filter.y + filter.height / 2 };

  return (
    <GuideScene id={ID} step={3} label="학생 목록">
      <Stage />

      <Annotation
        from={pageSwap + 14}
        durationInFrames={lineEnd(ID, 0) + 4 - pageSwap - 14}
        {...padRect(table, 5)}
        label={`${GRADE}학년 전체 학생 명단`}
        labelPosition="top"
        labelAlign="end"
        color={colors.blue600}
      />

      <Annotation
        from={filterClick - 10}
        durationInFrames={headerFrom - filterClick + 10}
        {...padRect(filter, 5)}
        label="반 선택"
        // 기본 간격이면 라벨이 Excel 버튼을 덮는다 — 툴바 오른쪽 빈 자리로 민다.
        labelPosition="right"
        labelGap={285}
        color={colors.indigo600}
      />
      <Annotation
        from={headerFrom}
        durationInFrames={lineEnd(ID, 1) + 6 - headerFrom}
        {...padRect(header, 4)}
        label="이름 · 반 · 번호 · 학번 · 상태 · 도우미"
        labelPosition="top"
        labelAlign="end"
        color={colors.blue600}
      />

      <Annotation
        from={editFrom}
        durationInFrames={deleteFrom + 6 - editFrom}
        {...padRect(edit, 5)}
        label="정보 고치기"
        labelPosition="left"
        color={colors.blue600}
      />
      <Annotation
        from={deleteFrom}
        durationInFrames={scrollFrom - 2 - deleteFrom}
        {...padRect(remove, 5)}
        label="삭제 = 비활성으로"
        labelPosition="left"
        color={colors.red600}
      />

      <Annotation
        from={restoreFrom}
        durationInFrames={zoomOut + 8 - restoreFrom}
        {...padRect(inactiveRow, 4)}
        label="비활성 학생"
        labelPosition="top"
        color={colors.gray700}
      />
      <Annotation
        from={restoreFrom + 8}
        durationInFrames={zoomOut - restoreFrom - 8}
        {...padRect(restore, 5)}
        label="복원"
        labelPosition="left"
        color={colors.green600}
      />

      <InsetCard card={ZOOM_CARD} crop={ZOOM_CROP} title="관리 버튼 확대" from={zoomFrom} out={zoomOut}>
        <GradeAdminShellMock tab="students" showHelp scrollY={SCROLL_Y}>
          <StudentTableMock width={W} rows={STUDENT_ROWS} />
        </GradeAdminShellMock>
      </InsetCard>

      <Cursor
        path={[
          { frame: lineStart(ID, 0) + 4, x: 900, y: 700 },
          { frame: tabClick - 8, x: tab.x, y: tab.y },
          { frame: tabClick + 10, x: tab.x, y: tab.y },
          { frame: filterClick - 8, x: filterCenter.x, y: filterCenter.y },
          { frame: cursorHide, x: filterCenter.x, y: filterCenter.y },
        ]}
        clicks={[tabClick, filterClick, allClick]}
        hideAfter={cursorHide}
      />
    </GuideScene>
  );
};
