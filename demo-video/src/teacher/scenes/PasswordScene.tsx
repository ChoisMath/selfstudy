import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../anim";
import { Annotation } from "../../components/Annotation";
import { BrowserFrame } from "../../components/BrowserFrame";
import { Cursor } from "../../components/Cursor";
import { GuideScene } from "../../guide/GuideScene";
import { APP_HOST } from "../../app-mocks/data";
import { PcViewport, pcAbs, pcRectAbs, type Point } from "../../app-mocks/layout";
import { colors } from "../../theme";
import { lineAt, lineEnd, lineStart } from "../timing";
import { HOMEROOM_BODY, HomeroomShellMock, homeroomTabPoint } from "../mocks/HomeroomShellMock";
import { HomeroomRequestsMock } from "../mocks/HomeroomRequestsMock";
import { PasswordFormMock, passwordPoint } from "../mocks/PasswordFormMock";
import type { DemoProps } from "../../props";

const ID = "Password";
const W = HOMEROOM_BODY.w;
// 앞 장면(HomeroomRequests)에서 승인한 신청.
const APPROVED_REQUEST_ID = 4;

// PasswordFormMock 내부 치수(앱 password/page.tsx 압축판) — 입력칸 폭 400(max-w-md 448 − 좌우 p-6), 높이 34, 알림 28, 버튼 34.
const FIELD_W = 400;
const INPUT_H = 34;
const MESSAGE_H = 28;
const BUTTON_H = 34;

const tabClick = lineAt(ID, 0, 0.3);
const pageSwap = tabClick + 3;
const currentClick = lineAt(ID, 1, 0.03);
const nextClick = lineAt(ID, 1, 0.2);
const confirmClick = lineAt(ID, 1, 0.42);
const submitClick = lineAt(ID, 1, 0.78);
const successFrom = submitClick + 8;
const TYPE_DELAY = 3;

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const onPassword = frame >= pageSwap;
  return (
    <BrowserFrame url={`${APP_HOST}/homeroom/${onPassword ? "password" : "absence-requests"}`} tabTitle="포산고 자율학습">
      <PcViewport>
        <HomeroomShellMock
          tab={onPassword ? "password" : "absenceRequests"}
          role="homeroom"
          tabPressAt={{ tab: "password", at: tabClick }}
        >
          {onPassword ? (
            <div style={{ position: "absolute", inset: 0, opacity: tween(frame, [pageSwap, pageSwap + 8], [0, 1]) }}>
              <PasswordFormMock
                width={W}
                current={{ typeFrom: currentClick + TYPE_DELAY }}
                next={{ typeFrom: nextClick + TYPE_DELAY }}
                confirm={{ typeFrom: confirmClick + TYPE_DELAY }}
                submitPressAt={submitClick}
                successFrom={successFrom}
              />
            </div>
          ) : (
            <HomeroomRequestsMock width={W} filter="all" approvedIds={[APPROVED_REQUEST_ID]} />
          )}
        </HomeroomShellMock>
      </PcViewport>
    </BrowserFrame>
  );
};

const bodyPoint = (p: Point) => pcAbs({ x: HOMEROOM_BODY.x + p.x, y: HOMEROOM_BODY.y + p.y });
const centeredRect = (p: Point, w: number, h: number) =>
  pcRectAbs({ x: HOMEROOM_BODY.x + p.x - w / 2, y: HOMEROOM_BODY.y + p.y - h / 2, w, h });

const box = (r: { x: number; y: number; width: number; height: number }, pad = 6) => ({
  x: r.x - pad,
  y: r.y - pad,
  width: r.width + pad * 2,
  height: r.height + pad * 2,
});

export const PasswordScene: React.FC<DemoProps> = () => {
  const tab = pcAbs(homeroomTabPoint("password", "homeroom"));
  const point = (key: Parameters<typeof passwordPoint>[0]) => passwordPoint(key, W);
  const current = bodyPoint(point("current"));
  const next = bodyPoint(point("next"));
  const confirm = bodyPoint(point("confirm"));
  const submit = bodyPoint(point("submit"));

  const submitButton = centeredRect(point("submit"), FIELD_W, BUTTON_H);
  const nextField = centeredRect(point("next"), FIELD_W, INPUT_H);
  const success = centeredRect(point("success"), FIELD_W, MESSAGE_H);

  return (
    <GuideScene id={ID} step={19} label="비밀번호">
      <Stage />

      <Annotation
        from={successFrom + 6}
        durationInFrames={lineEnd(ID, 2) + 10 - successFrom - 6}
        {...box(success, 4)}
        label="변경 완료"
        labelPosition="right"
        color={colors.green600}
      />
      <Annotation
        from={lineAt(ID, 2, 0.03)}
        durationInFrames={lineEnd(ID, 2) + 10 - lineAt(ID, 2, 0.03)}
        {...box(nextField, 4)}
        label="새 비밀번호는 4자 이상"
        labelPosition="right"
      />
      <Annotation
        from={lineAt(ID, 2, 0.45)}
        durationInFrames={lineEnd(ID, 2) + 10 - lineAt(ID, 2, 0.45)}
        {...box(submitButton, 4)}
        label="초기 비밀번호 1111은 꼭 변경"
        labelPosition="right"
      />

      <Cursor
        path={[
          { frame: lineStart(ID, 0), x: 1100, y: 640 },
          { frame: tabClick - 6, x: tab.x, y: tab.y },
          { frame: tabClick + 8, x: tab.x, y: tab.y },
          { frame: currentClick - 6, x: current.x, y: current.y },
          { frame: nextClick - 6, x: next.x, y: next.y },
          { frame: confirmClick - 6, x: confirm.x, y: confirm.y },
          { frame: confirmClick + 20, x: confirm.x, y: confirm.y },
          { frame: submitClick - 6, x: submit.x, y: submit.y },
        ]}
        clicks={[tabClick, currentClick, nextClick, confirmClick, submitClick]}
        hideAfter={successFrom + 12}
      />
    </GuideScene>
  );
};
