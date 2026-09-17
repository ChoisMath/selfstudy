// src/app/homeroom/participation/page.tsx 이식 — 담임 참여설정표. 헤더 셸 없이 본문만 그린다.
import React from "react";
import { useCurrentFrame } from "remotion";
import { tw } from "./tw";
import type { Rect } from "./layout";
import { STUDENTS, type HomeroomParticipation, type ParticipationSetting, type Session } from "./data";
import { pressScale } from "./primitives";
import { isBetween } from "../anim";
import { FONT } from "../fonts";

// data.ts 의 HOMEROOM_PARTICIPATION 은 Record<studentNo, HomeroomParticipation> 라서
// 배열 prop 으로 넘기려면 studentNo 를 얹은 한 줄(row) 형태로 감싼다.
export type ParticipationRow = { studentNo: number; sessions: HomeroomParticipation };

const SESSIONS: Session[] = ["afternoon1", "afternoon2", "night"];
const SESSION_LABEL: Record<Session, string> = { afternoon1: "오후1 자습", afternoon2: "오후2 자습", night: "야간자습" };
const DAY_LABELS = ["월", "화", "수", "목", "금"];

// rows 는 항상 STUDENTS(반 2, 번호 1~12) 순서 그대로 전달된다는 가정 — participationRect 가 studentNo 로 행 위치를 계산한다.
const PARTICIPANT_COUNT = 12;

const PAD_X = 16;
const PAD_TOP = 16;
const SAVING_H = 20;
const STICKY_NAME_W = 64;
const CLASS_W = 36;
const NO_W = 36;
const PARTICIPATE_W = 54;
const DAY_W = 48;
const SESSION_W = PARTICIPATE_W + DAY_W * 5;
const HEAD1_H = 24;
const HEAD2_H = 18;
const HEAD3_H = 14;
const HEADER_FULL_H = HEAD1_H + HEAD2_H + HEAD3_H;
const DAY_BTN_H = 20;
const CTRL_GAP = 3;
const AS_SIZE = 12;
const BODY_PAD = 5;
const BODY_H = BODY_PAD * 2 + DAY_BTN_H + CTRL_GAP + AS_SIZE;
const FOOT_H = 26;
const FOOTER_TEXT_H = 26;

const contentScrollWidth = CLASS_W + NO_W + SESSION_W * 3;

const geometry = (width: number) => {
  const available = width - PAD_X * 2;
  const tableTop = PAD_TOP + SAVING_H;
  const scrollableW = Math.max(0, available - STICKY_NAME_W);
  return { available, tableTop, scrollableW };
};

const sessionX = (sessionIndex: number) => CLASS_W + NO_W + sessionIndex * SESSION_W;
const dayX = (sessionIndex: number, dayIndex: number) => sessionX(sessionIndex) + PARTICIPATE_W + dayIndex * DAY_W;
const rowY = (tableTop: number, studentNo: number) => tableTop + HEADER_FULL_H + (studentNo - 1) * BODY_H;

export const participationRect = (
  key: `control_${number}_${string}_${string}` | "header" | "totals",
  variant: "homeroom",
  width: number,
  scrollX?: number,
): Rect => {
  void variant;
  const { available, tableTop, scrollableW } = geometry(width);
  const sx = scrollX ?? 0;
  if (key === "header") {
    return { x: PAD_X, y: tableTop, w: available, h: HEADER_FULL_H };
  }
  if (key === "totals") {
    return { x: PAD_X, y: tableTop + HEADER_FULL_H + PARTICIPANT_COUNT * BODY_H, w: available, h: FOOT_H };
  }
  const [, studentNoStr, session, ...controlParts] = key.split("_");
  const studentNo = Number(studentNoStr);
  const control = controlParts.join("_");
  const sessionIndex = SESSIONS.indexOf(session as Session);
  const y = rowY(tableTop, studentNo);
  const scrollableX = (offset: number) => PAD_X + STICKY_NAME_W + Math.min(offset - sx, scrollableW);
  if (control === "participating") {
    return { x: scrollableX(sessionX(sessionIndex)), y, w: PARTICIPATE_W, h: BODY_H };
  }
  const dayIndex = Number(control.slice(control.indexOf("_") + 1));
  const x = scrollableX(dayX(sessionIndex, dayIndex));
  if (control.startsWith("day_")) {
    return { x, y: y + BODY_PAD, w: DAY_W, h: DAY_BTN_H };
  }
  return { x, y: y + BODY_PAD + DAY_BTN_H + CTRL_GAP, w: DAY_W, h: AS_SIZE };
};

const effectiveSettings = (
  row: ParticipationRow,
  session: Session,
  frame: number,
  toggle: { studentNo: number; session: Session; control: string; at: number } | undefined,
): ParticipationSetting => {
  const base = row.sessions[session];
  if (!toggle || toggle.studentNo !== row.studentNo || toggle.session !== session || frame < toggle.at) {
    return base;
  }
  const days = [...base.days];
  const afterSchool = [...base.afterSchool];
  let participating = base.participating;
  if (toggle.control === "participating") {
    participating = !participating;
  } else if (toggle.control.startsWith("day_")) {
    days[Number(toggle.control.slice(4))] = !days[Number(toggle.control.slice(4))];
  } else if (toggle.control.startsWith("afterSchool_")) {
    afterSchool[Number(toggle.control.slice(12))] = !afterSchool[Number(toggle.control.slice(12))];
  }
  return { participating, days, afterSchool };
};

const pressOf = (
  toggle: { studentNo: number; session: Session; control: string; at: number } | undefined,
  studentNo: number,
  session: Session,
  control: string,
) => (toggle && toggle.studentNo === studentNo && toggle.session === session && toggle.control === control ? toggle.at : null);

export const ParticipationTableMock: React.FC<{
  variant: "homeroom";
  width: number;
  height: number;
  rows: ParticipationRow[];
  scrollX?: number;
  savingFrom?: number;
  toggle?: { studentNo: number; session: Session; control: "participating" | `day_${number}` | `afterSchool_${number}`; at: number };
}> = ({ variant, width, height, rows, scrollX, savingFrom, toggle }) => {
  void variant;
  const frame = useCurrentFrame();
  const { available, tableTop, scrollableW } = geometry(width);
  const sx = scrollX ?? 0;
  const saving = savingFrom !== undefined && isBetween(frame, savingFrom, savingFrom + 20);
  const bodyAreaH = rows.length * BODY_H;

  return (
    <div style={{ position: "absolute", width, height, background: tw.gray[50], fontFamily: FONT, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: PAD_X, top: PAD_TOP, height: SAVING_H, fontSize: 11, color: tw.gray[400], whiteSpace: "nowrap", opacity: saving ? 1 : 0 }}>
        저장 중...
      </div>

      <div style={{ position: "absolute", left: PAD_X, top: tableTop, width: available, background: tw.white, border: `1px solid ${tw.gray[200]}`, borderRadius: 8, overflow: "hidden", boxSizing: "border-box" }}>
        {/* 헤더 */}
        <div style={{ position: "relative", height: HEADER_FULL_H, background: tw.gray[50], borderBottom: `1px solid ${tw.gray[200]}` }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: STICKY_NAME_W, height: HEADER_FULL_H, background: tw.gray[50], zIndex: 4, display: "flex", alignItems: "center", paddingLeft: 10, fontSize: 11, fontWeight: 500, color: tw.gray[600], whiteSpace: "nowrap", boxSizing: "border-box" }}>
            이름
          </div>
          <div style={{ position: "absolute", left: STICKY_NAME_W, top: 0, width: scrollableW, height: HEADER_FULL_H, overflow: "hidden" }}>
            <div style={{ position: "absolute", left: -sx, top: 0, width: contentScrollWidth, height: HEADER_FULL_H }}>
              <div style={{ position: "absolute", left: 0, top: 0, width: CLASS_W, height: HEADER_FULL_H, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, color: tw.gray[600] }}>반</div>
              <div style={{ position: "absolute", left: CLASS_W, top: 0, width: NO_W, height: HEADER_FULL_H, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, color: tw.gray[600] }}>번호</div>
              {SESSIONS.map((session, sessionIndex) => (
                <React.Fragment key={session}>
                  <div
                    style={{
                      position: "absolute",
                      left: sessionX(sessionIndex),
                      top: 0,
                      width: SESSION_W,
                      height: HEAD1_H,
                      borderLeft: `1px solid ${tw.gray[200]}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 500,
                      color: tw.gray[600],
                      whiteSpace: "nowrap",
                      boxSizing: "border-box",
                    }}
                  >
                    {SESSION_LABEL[session]}
                  </div>
                  <div style={{ position: "absolute", left: sessionX(sessionIndex), top: HEAD1_H, width: PARTICIPATE_W, height: HEAD2_H, borderLeft: `1px solid ${tw.gray[200]}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 500, color: tw.gray[500], boxSizing: "border-box" }}>
                    참가
                  </div>
                  <div style={{ position: "absolute", left: sessionX(sessionIndex), top: HEAD1_H + HEAD2_H, width: PARTICIPATE_W, height: HEAD3_H, background: tw.orange[50] }} />
                  {DAY_LABELS.map((label, dayIndex) => (
                    <React.Fragment key={label}>
                      <div style={{ position: "absolute", left: dayX(sessionIndex, dayIndex), top: HEAD1_H, width: DAY_W, height: HEAD2_H, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 500, color: tw.gray[500] }}>
                        {label}
                      </div>
                      <div style={{ position: "absolute", left: dayX(sessionIndex, dayIndex), top: HEAD1_H + HEAD2_H, width: DAY_W, height: HEAD3_H, background: tw.orange[50], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 500, color: tw.orange[600] }}>
                        방과후
                      </div>
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* 본문 */}
        <div style={{ position: "relative", height: bodyAreaH }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: STICKY_NAME_W, height: bodyAreaH, background: tw.white, zIndex: 3 }}>
            {rows.map((row, rowIndex) => {
              const student = STUDENTS.find((s) => s.classNumber === 2 && s.number === row.studentNo);
              return (
                <div key={row.studentNo} style={{ position: "absolute", left: 0, top: rowIndex * BODY_H, width: STICKY_NAME_W, height: BODY_H, borderBottom: `1px solid ${tw.gray[100]}`, display: "flex", alignItems: "center", paddingLeft: 10, fontSize: 12, fontWeight: 500, color: tw.gray[900], whiteSpace: "nowrap", boxSizing: "border-box" }}>
                  {student?.name ?? row.studentNo}
                </div>
              );
            })}
          </div>
          <div style={{ position: "absolute", left: STICKY_NAME_W, top: 0, width: scrollableW, height: bodyAreaH, overflow: "hidden" }}>
            <div style={{ position: "absolute", left: -sx, top: 0, width: contentScrollWidth, height: bodyAreaH }}>
              {rows.map((row, rowIndex) => {
                const student = STUDENTS.find((s) => s.classNumber === 2 && s.number === row.studentNo);
                const y = rowIndex * BODY_H;
                return (
                  <React.Fragment key={row.studentNo}>
                    <div style={{ position: "absolute", left: 0, top: y, width: CLASS_W, height: BODY_H, borderBottom: `1px solid ${tw.gray[100]}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: tw.gray[600] }}>
                      {student?.classNumber ?? 2}
                    </div>
                    <div style={{ position: "absolute", left: CLASS_W, top: y, width: NO_W, height: BODY_H, borderBottom: `1px solid ${tw.gray[100]}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: tw.gray[600] }}>
                      {row.studentNo}
                    </div>
                    {SESSIONS.map((session, sessionIndex) => {
                      const settings = effectiveSettings(row, session, frame, toggle);
                      return (
                        <React.Fragment key={session}>
                          <div
                            style={{
                              position: "absolute",
                              left: sessionX(sessionIndex),
                              top: y,
                              width: PARTICIPATE_W,
                              height: BODY_H,
                              borderLeft: `1px solid ${tw.gray[100]}`,
                              borderBottom: `1px solid ${tw.gray[100]}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxSizing: "border-box",
                            }}
                          >
                            <span
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: 3,
                                border: `1px solid ${settings.participating ? tw.blue[600] : tw.gray[300]}`,
                                background: settings.participating ? tw.blue[600] : tw.white,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                scale: String(pressScale(frame, pressOf(toggle, row.studentNo, session, "participating"))),
                                boxSizing: "border-box",
                              }}
                            >
                              {settings.participating ? <span style={{ fontSize: 10, color: tw.white, lineHeight: 1 }}>✓</span> : null}
                            </span>
                          </div>
                          {DAY_LABELS.map((label, dayIndex) => {
                            const on = settings.days[dayIndex];
                            const afterSchoolOn = settings.afterSchool[dayIndex];
                            const dayDisabled = !settings.participating;
                            const asDisabled = !settings.participating || !on;
                            return (
                              <div
                                key={label}
                                style={{
                                  position: "absolute",
                                  left: dayX(sessionIndex, dayIndex),
                                  top: y,
                                  width: DAY_W,
                                  height: BODY_H,
                                  borderBottom: `1px solid ${tw.gray[100]}`,
                                  boxSizing: "border-box",
                                }}
                              >
                                <div
                                  style={{
                                    position: "absolute",
                                    left: (DAY_W - 36) / 2,
                                    top: BODY_PAD,
                                    width: 36,
                                    height: DAY_BTN_H,
                                    borderRadius: 5,
                                    background: dayDisabled ? tw.gray[100] : on ? tw.blue[100] : tw.gray[100],
                                    color: dayDisabled ? tw.gray[300] : on ? tw.blue[700] : tw.gray[400],
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 10,
                                    fontWeight: 500,
                                    whiteSpace: "nowrap",
                                    scale: String(pressScale(frame, pressOf(toggle, row.studentNo, session, `day_${dayIndex}`))),
                                    boxSizing: "border-box",
                                  }}
                                >
                                  {label}
                                </div>
                                <div
                                  style={{
                                    position: "absolute",
                                    left: (DAY_W - AS_SIZE) / 2,
                                    top: BODY_PAD + DAY_BTN_H + CTRL_GAP,
                                    width: AS_SIZE,
                                    height: AS_SIZE,
                                    borderRadius: 3,
                                    border: `1px solid ${asDisabled ? tw.gray[200] : tw.orange[600]}`,
                                    background: !asDisabled && afterSchoolOn ? tw.orange[600] : tw.white,
                                    opacity: asDisabled ? 0.4 : 1,
                                    scale: String(pressScale(frame, pressOf(toggle, row.studentNo, session, `afterSchool_${dayIndex}`))),
                                    boxSizing: "border-box",
                                  }}
                                />
                              </div>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* 합계 */}
        <div style={{ position: "relative", height: FOOT_H, background: tw.gray[50], borderTop: `2px solid ${tw.gray[300]}`, boxSizing: "border-box" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: STICKY_NAME_W + 0, height: FOOT_H, background: tw.gray[50], zIndex: 3, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6, fontSize: 10, fontWeight: 600, color: tw.gray[600], whiteSpace: "nowrap", boxSizing: "border-box" }}>
            합계
          </div>
          <div style={{ position: "absolute", left: STICKY_NAME_W, top: 0, width: scrollableW, height: FOOT_H, overflow: "hidden" }}>
            <div style={{ position: "absolute", left: -sx, top: 0, width: contentScrollWidth, height: FOOT_H }}>
              <div style={{ position: "absolute", left: 0, top: 0, width: CLASS_W + NO_W, height: FOOT_H }} />
              {SESSIONS.map((session, sessionIndex) => {
                const effRows = rows.map((r) => effectiveSettings(r, session, frame, toggle));
                const participating = effRows.filter((s) => s.participating).length;
                return (
                  <React.Fragment key={session}>
                    <div
                      style={{
                        position: "absolute",
                        left: sessionX(sessionIndex),
                        top: 0,
                        width: PARTICIPATE_W,
                        height: FOOT_H,
                        borderLeft: `1px solid ${tw.gray[200]}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        color: tw.blue[700],
                        boxSizing: "border-box",
                      }}
                    >
                      {participating}
                    </div>
                    {DAY_LABELS.map((_, dayIndex) => {
                      const count = effRows.filter((s) => s.participating && s.days[dayIndex]).length;
                      return (
                        <div
                          key={dayIndex}
                          style={{
                            position: "absolute",
                            left: dayX(sessionIndex, dayIndex),
                            top: 0,
                            width: DAY_W,
                            height: FOOT_H,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 500,
                            color: tw.gray[600],
                          }}
                        >
                          {count}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", left: PAD_X, top: tableTop + HEADER_FULL_H + bodyAreaH + FOOT_H + 6, height: FOOTER_TEXT_H, fontSize: 12, color: tw.gray[500], whiteSpace: "nowrap" }}>
        총 {rows.length}명
      </div>
    </div>
  );
};
