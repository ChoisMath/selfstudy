// src/app/homeroom/schedule/page.tsx 296-488행(교체 모달 + TeacherSearchSelect) 이식 — 1248×570 뷰포트 전체를 덮는 오버레이.
import React from "react";
import { useCurrentFrame } from "remotion";
import { TEACHERS } from "../../app-mocks/data";
import { PC_VIEWPORT, type Point } from "../../app-mocks/layout";
import { pressScale, TypedText } from "../../app-mocks/primitives";
import { tw } from "../../app-mocks/tw";
import { FONT } from "../../fonts";

const PANEL_W = 420; // max-w-md(448) 근사, sm:p-6 패널
const PANEL_X = (PC_VIEWPORT.w - PANEL_W) / 2;
const PAD = 24; // 299행 sm:p-6

const TITLE_H = 26; // 300행 text-lg font-bold
const GAP_TITLE_SUB = 10;
const SUB_H = 18; // 301-303행 text-sm
const GAP_SUB_FIELD = 16; // 305행 space-y-4
const LABEL_H = 18; // 307행 text-sm
const GAP_LABEL_INPUT = 4; // mb-1
const SEARCH_H = 38; // TeacherSearchSelect input(442-456행)
const GAP_FIELDS = 16;
const REASON_LABEL_H = 18; // 322행
const TEXTAREA_H = 54; // 325-331행 rows=2
const GAP_TO_WARN = 14;
const WARN_H = 40; // 334-338행 — otherGrade 여부와 무관하게 자리를 항상 예약해 아래 버튼 위치를 고정한다
const GAP_TO_FOOTER = 20; // 341행 mt-6
const FOOTER_H = 38;

const PANEL_H =
  PAD * 2 +
  TITLE_H +
  GAP_TITLE_SUB +
  SUB_H +
  GAP_SUB_FIELD +
  LABEL_H +
  GAP_LABEL_INPUT +
  SEARCH_H +
  GAP_FIELDS +
  REASON_LABEL_H +
  GAP_LABEL_INPUT +
  TEXTAREA_H +
  GAP_TO_WARN +
  WARN_H +
  GAP_TO_FOOTER +
  FOOTER_H;
const PANEL_Y = (PC_VIEWPORT.h - PANEL_H) / 2;

const TITLE_Y = PANEL_Y + PAD;
const SUB_Y = TITLE_Y + TITLE_H + GAP_TITLE_SUB;
const LABEL_Y = SUB_Y + SUB_H + GAP_SUB_FIELD;
const SEARCH_Y = LABEL_Y + LABEL_H + GAP_LABEL_INPUT;
const REASON_LABEL_Y = SEARCH_Y + SEARCH_H + GAP_FIELDS;
const REASON_Y = REASON_LABEL_Y + REASON_LABEL_H + GAP_LABEL_INPUT;
const WARN_Y = REASON_Y + TEXTAREA_H + GAP_TO_WARN;
const FOOTER_Y = WARN_Y + WARN_H + GAP_TO_FOOTER;

const FIELD_X = PANEL_X + PAD;
const FIELD_W = PANEL_W - PAD * 2;

const CONFIRM_W = 132; // "확인 후 교체"까지 담을 수 있는 고정 폭 — otherGrade 전환에도 버튼 좌표가 안 움직이게
const CANCEL_W = 64;
const FOOTER_GAP = 8; // 341행 gap-2
const CONFIRM_X = PANEL_X + PANEL_W - PAD - CONFIRM_W;
const CANCEL_X = CONFIRM_X - FOOTER_GAP - CANCEL_W;

const DROP_ROW_H = 30;
const DROP_MAX_H = 186; // max-h-48(192px) 근사, overflow hidden
const DROP_TOP = SEARCH_Y + SEARCH_H + 4; // mt-1(457행)

// 386-394행: primaryGrade===grade 그룹 먼저, 나머지 뒤. TEACHERS는 이미 학년 오름차순이라
// grade=1(이 프로젝트의 유일한 교체 시나리오, SWAP_EXAMPLE.grade)일 때 그룹핑 결과가 원본 순서와 같다.
const OPTION_ORDER = TEACHERS.map((t) => t.name);
const PRIMARY_COUNT = TEACHERS.filter((t) => t.primaryGrade === 1).length;

export const swapModalPoint = (key: "search" | `option_${string}` | "reason" | "confirm" | "cancel"): Point => {
  if (key === "search") {
    return { x: FIELD_X + FIELD_W / 2, y: SEARCH_Y + SEARCH_H / 2 };
  }
  if (key === "reason") {
    return { x: FIELD_X + FIELD_W / 2, y: REASON_Y + TEXTAREA_H / 2 };
  }
  if (key === "confirm") {
    return { x: CONFIRM_X + CONFIRM_W / 2, y: FOOTER_Y + FOOTER_H / 2 };
  }
  if (key === "cancel") {
    return { x: CANCEL_X + CANCEL_W / 2, y: FOOTER_Y + FOOTER_H / 2 };
  }
  const name = key.slice("option_".length);
  const idx = Math.max(0, OPTION_ORDER.indexOf(name));
  const dividerOffset = idx >= PRIMARY_COUNT ? 6 : 0;
  return { x: FIELD_X + FIELD_W / 2, y: DROP_TOP + idx * DROP_ROW_H + dividerOffset + DROP_ROW_H / 2 };
};

export type SwapModalMockProps = {
  date: string;
  grade: number;
  search: { text: string; typeFrom?: number };
  dropdownOpenAt?: number;
  pickAt?: number;
  picked?: string;
  otherGrade?: boolean;
  reason: { text: string; typeFrom?: number };
  confirmPressAt?: number;
  busy?: boolean;
};

export const SwapModalMock: React.FC<SwapModalMockProps> = ({
  date,
  grade,
  search,
  dropdownOpenAt,
  pickAt,
  picked,
  otherGrade,
  reason,
  confirmPressAt,
  busy,
}) => {
  const frame = useCurrentFrame();
  const isPicked = picked !== undefined && (pickAt === undefined || frame >= pickAt);
  const dropdownOpen = dropdownOpenAt !== undefined && frame >= dropdownOpenAt && !isPicked;
  const disabled = !isPicked || Boolean(busy);

  const primary = TEACHERS.filter((t) => t.primaryGrade === grade);
  const others = TEACHERS.filter((t) => t.primaryGrade !== grade);
  const optionRows = [...primary.map((t) => ({ ...t, dividerBefore: false })), ...others.map((t, i) => ({ ...t, dividerBefore: i === 0 && primary.length > 0 }))];

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: PC_VIEWPORT.w, height: PC_VIEWPORT.h, background: "rgba(0,0,0,0.4)", fontFamily: FONT }}>
      <div style={{ position: "absolute", left: PANEL_X, top: PANEL_Y, width: PANEL_W, height: PANEL_H, background: tw.white, borderRadius: 8, boxShadow: "0 10px 25px rgba(0,0,0,0.25)", boxSizing: "border-box" }}>
        <div style={{ position: "absolute", left: PAD, top: PAD, width: FIELD_W, height: TITLE_H, fontSize: 18, fontWeight: 700, color: tw.gray[900], whiteSpace: "nowrap" }}>
          감독 교체
        </div>
        <div style={{ position: "absolute", left: PAD, top: SUB_Y - PANEL_Y, width: FIELD_W, height: SUB_H, fontSize: 14, color: tw.gray[600], whiteSpace: "nowrap" }}>
          {date} {grade}학년 감독을 교체합니다.
        </div>

        <div style={{ position: "absolute", left: PAD, top: LABEL_Y - PANEL_Y, width: FIELD_W, height: LABEL_H, fontSize: 14, fontWeight: 500, color: tw.gray[700], whiteSpace: "nowrap" }}>
          교체 대상 교사
        </div>
        <div
          style={{
            position: "absolute",
            left: PAD,
            top: SEARCH_Y - PANEL_Y,
            width: FIELD_W,
            height: SEARCH_H,
            borderRadius: 6,
            border: `1px solid ${tw.gray[300]}`,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            fontSize: 14,
            color: tw.gray[900],
          }}
        >
          {isPicked ? (
            <span style={{ whiteSpace: "nowrap" }}>{picked}</span>
          ) : (
            <TypedText text={search.text} from={search.typeFrom} placeholder="이름을 입력하여 검색..." />
          )}
        </div>

        {dropdownOpen ? (
          <div
            style={{
              position: "absolute",
              left: PAD,
              top: DROP_TOP - PANEL_Y,
              width: FIELD_W,
              maxHeight: DROP_MAX_H,
              overflow: "hidden",
              background: tw.white,
              border: `1px solid ${tw.gray[200]}`,
              borderRadius: 6,
              boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              boxSizing: "border-box",
              zIndex: 2,
            }}
          >
            {optionRows.map((t) => (
              <div
                key={t.id}
                style={{
                  height: DROP_ROW_H,
                  marginTop: t.dividerBefore ? 6 : 0,
                  borderTop: t.dividerBefore ? `1px solid ${tw.gray[300]}` : "none",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 12px",
                  gap: 6,
                  fontSize: 13,
                  color: t.name === picked ? tw.blue[700] : tw.gray[700],
                  fontWeight: t.name === picked ? 600 : 400,
                  whiteSpace: "nowrap",
                  boxSizing: "border-box",
                }}
              >
                <span>{t.name}</span>
                <span style={{ fontSize: 11, color: tw.gray[400] }}>{t.primaryGrade}학년</span>
              </div>
            ))}
          </div>
        ) : null}

        <div style={{ position: "absolute", left: PAD, top: REASON_LABEL_Y - PANEL_Y, width: FIELD_W, height: REASON_LABEL_H, fontSize: 14, fontWeight: 500, color: tw.gray[700], whiteSpace: "nowrap" }}>
          교체 사유 (선택)
        </div>
        <div
          style={{
            position: "absolute",
            left: PAD,
            top: REASON_Y - PANEL_Y,
            width: FIELD_W,
            height: TEXTAREA_H,
            borderRadius: 6,
            border: `1px solid ${tw.gray[300]}`,
            boxSizing: "border-box",
            padding: "8px 12px",
            fontSize: 14,
            color: tw.gray[900],
          }}
        >
          <TypedText text={reason.text} from={reason.typeFrom} placeholder="교체 사유를 입력하세요" />
        </div>

        {otherGrade ? (
          <div
            style={{
              position: "absolute",
              left: PAD,
              top: WARN_Y - PANEL_Y,
              width: FIELD_W,
              height: WARN_H,
              borderRadius: 6,
              background: tw.yellow[50],
              border: `1px solid ${tw.yellow[200]}`,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              fontSize: 13,
              color: tw.yellow[800],
            }}
          >
            선택한 교사는 다른 학년 소속입니다. 정말 교체하시겠습니까?
          </div>
        ) : null}

        <div
          style={{
            position: "absolute",
            left: CANCEL_X,
            top: FOOTER_Y - PANEL_Y,
            width: CANCEL_W,
            height: FOOTER_H,
            borderRadius: 6,
            border: `1px solid ${tw.gray[300]}`,
            color: tw.gray[600],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            whiteSpace: "nowrap",
            boxSizing: "border-box",
          }}
        >
          취소
        </div>
        <div
          style={{
            position: "absolute",
            left: CONFIRM_X,
            top: FOOTER_Y - PANEL_Y,
            width: CONFIRM_W,
            height: FOOTER_H,
            borderRadius: 6,
            background: tw.blue[600],
            color: tw.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 500,
            whiteSpace: "nowrap",
            boxSizing: "border-box",
            opacity: disabled ? 0.5 : 1,
            scale: String(pressScale(frame, confirmPressAt ?? null)),
          }}
        >
          {busy ? "처리 중..." : otherGrade ? "확인 후 교체" : "교체"}
        </div>
      </div>
    </div>
  );
};
