// 환경 점검용 최소 가이드. 원고 → 클론 음성 → 길이 JSON → 장면 → 렌더·스틸 파이프라인 전체를 짧게 한 번 통과시킨다.
export type SetupCheckSceneId = "Intro" | "Check";

export type NarrationScene = { id: SetupCheckSceneId; lines: string[] };

// 문장 사이 무음. narrate.mjs 와 timing.ts 가 같은 값을 써야 자막이 맞는다.
export const LINE_GAP_SECONDS = 0.2;

// 문장 음성 끝에 붙이는 무음. 마지막 음절이 잘린 듯 끝나지 않게 한다. 문장 길이에 포함되어 자막도 이만큼 더 남는다.
export const TRAILING_SILENCE_SECONDS = 0.5;

export const NARRATION: NarrationScene[] = [
  { id: "Intro", lines: ["포산고 자율학습 안내 영상 환경 점검입니다."] },
  { id: "Check", lines: [
    "오후1 출석 화면에서 좌석을 눌러 출석을 표시합니다.",
    "이 목소리와 자막이 함께 맞게 나오면 준비가 끝났습니다.",
  ] },
];

// 숫자·영문은 음성용 읽기를 따로 둔다(자막은 원고 표기).
export const SPOKEN: Record<string, string> = {
  "Check-0": "오후 일 출석 화면에서 좌석을 눌러 출석을 표시합니다.",
};
