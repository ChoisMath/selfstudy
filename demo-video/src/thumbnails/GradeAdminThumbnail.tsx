import React from "react";
import { APP_HOST } from "../app-mocks/data";
import { PcViewport } from "../app-mocks/layout";
import { BrowserFrame } from "../components/BrowserFrame";
import { GRADE_ADMIN_BODY, GradeAdminShellMock } from "../grade-admin/mocks/GradeAdminShellMock";
import { TodayDashboardMock } from "../grade-admin/mocks/TodayDashboardMock";
import { colors } from "../theme";
import { ThumbBrowser, ThumbnailFrame } from "./ThumbnailFrame";

// 학년관리자 편 TodayScene 과 같은 화면 — 6탭 줄이 보이는 학년관리 오늘출결.
const TAB_TITLE = "포산고 자율학습";

export const GradeAdminThumbnail: React.FC = () => (
  <ThumbnailFrame role="학년관리자 편" accent={colors.purple600}>
    <ThumbBrowser>
      <BrowserFrame url={`${APP_HOST}/grade-admin/1`} tabTitle={TAB_TITLE}>
        <PcViewport>
          <GradeAdminShellMock tab="today" showHelp>
            <TodayDashboardMock width={GRADE_ADMIN_BODY.w} />
          </GradeAdminShellMock>
        </PcViewport>
      </BrowserFrame>
    </ThumbBrowser>
  </ThumbnailFrame>
);
