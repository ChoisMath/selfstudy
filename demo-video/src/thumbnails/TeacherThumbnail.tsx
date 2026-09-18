import React from "react";
import { AttendanceBoardMock, baseVisual, buildAfternoonGroups } from "../app-mocks/AttendanceBoardMock";
import { BOARD_URL, phoneBoardProps } from "../teacher/scenes/phone-helpers";
import { colors } from "../theme";
import { ThumbnailFrame, ThumbPhone } from "./ThumbnailFrame";

// 교사 편 폰 장면들(AttendanceTourScene 등)이 쓰는 출석부와 같은 목업·props.
const BOARD = phoneBoardProps({
  tab: "afternoon1",
  groups: buildAfternoonGroups((id) => baseVisual(id)),
  dateBarScrollX: 0,
});

export const TeacherThumbnail: React.FC = () => (
  <ThumbnailFrame role="교사 편" accent={colors.blue600}>
    <ThumbPhone url={BOARD_URL}>
      <AttendanceBoardMock {...BOARD} />
    </ThumbPhone>
  </ThumbnailFrame>
);
