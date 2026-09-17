import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkSpeech, countChars, estimateSeconds, findUnreadable, isCached, lineKey, mergeStt, parseJsonLines, parseOnly,
  reviewFlag, sha1, spokenText, sttTargets, unknownKeys,
} from "./narration-core.mjs";

const NARRATION = [
  { id: "Intro", lines: ["ChoisNote 안내입니다.", "차례로 봅니다."] },
  { id: "PassWindow", lines: ["지금은 10시 10분입니다."] },
];

test("lineKey 는 장면-0부터 센 번호", () => {
  assert.equal(lineKey("Slug", 4), "Slug-4");
});

test("spokenText 는 SPOKEN 이 있으면 그것을, 없으면 원고를 쓴다", () => {
  const spoken = { "Intro-0": "초이스노트 안내입니다." };
  assert.equal(spokenText(spoken, "Intro", 0, "ChoisNote 안내입니다."), "초이스노트 안내입니다.");
  assert.equal(spokenText(spoken, "Intro", 1, "차례로 봅니다."), "차례로 봅니다.");
});

test("findUnreadable 은 숫자·영문이 남은 키만 돌려준다", () => {
  assert.deepEqual(findUnreadable(NARRATION, { "Intro-0": "초이스노트 안내입니다." }), ["PassWindow-0"]);
  assert.deepEqual(findUnreadable(NARRATION, { "Intro-0": "초이스노트 안내입니다.", "PassWindow-0": "지금은 열 시 십 분입니다." }), []);
});

test("countChars 는 공백을 뺀다", () => {
  assert.equal(countChars("설정 화면에서 탭을 엽니다."), 12);
});

test("checkSpeech 는 끊김·폭주를 거른다", () => {
  const text = "설정 화면에서 학급관리 탭을 엽니다."; // 16자
  assert.equal(checkSpeech(text, 2.6).ok, true);
  assert.equal(checkSpeech(text, 0.5).reason, "too-short");
  assert.equal(checkSpeech(text, 1.2).reason, "too-fast");
  assert.equal(checkSpeech(text, 7.0).reason, "too-slow");
});

test("isCached 는 문장·참조·모델·꼬리 무음이 같고 mp3가 있을 때만 참", () => {
  const entry = { textHash: sha1("가"), refHash: "r1", model: "m", trailing: 0.5 };
  const now = { textHash: sha1("가"), refHash: "r1", model: "m", trailing: 0.5 };
  assert.equal(isCached(entry, now, true), true);
  assert.equal(isCached(entry, now, false), false);
  assert.equal(isCached(entry, { ...now, refHash: "r2" }, true), false);
  assert.equal(isCached(entry, { ...now, textHash: sha1("나") }, true), false);
  assert.equal(isCached(undefined, now, true), false);
  assert.equal(isCached(entry, { ...now, trailing: 0.7 }, true), false);
  const { trailing, ...legacy } = entry;
  assert.equal(isCached(legacy, now, true), false);
});

test("estimateSeconds 는 초당 5.8자 + 꼬리 무음", () => {
  assert.equal(estimateSeconds("가".repeat(29), 0.5), 5.5);
});

test("parseOnly 는 쉼표 목록을 Set 으로", () => {
  assert.deepEqual([...parseOnly("Slug-4, Seats-2")], ["Slug-4", "Seats-2"]);
  assert.equal(parseOnly(null), null);
});

test("sttTargets 는 similarity 가 없고 wav 가 있는 문장만 고른다", () => {
  const lines = [{ key: "A-0" }, { key: "A-1" }, { key: "A-2" }, { key: "A-3" }];
  const manifest = { "A-0": { similarity: 0.9 }, "A-1": {}, "A-2": { speech: 1 } };
  const hasWav = (key) => key !== "A-2";
  assert.deepEqual(sttTargets(lines, manifest, hasWav).map((l) => l.key), ["A-1"]);
});

test("reviewFlag 는 전사 없음 NOCHECK, 0.8 미만 CHECK", () => {
  assert.equal(reviewFlag({}), "NOCHECK");
  assert.equal(reviewFlag(undefined), "NOCHECK");
  assert.equal(reviewFlag({ similarity: 0.79 }), "CHECK");
  assert.equal(reviewFlag({ similarity: 0.8 }), "");
  assert.equal(reviewFlag({ similarity: 0 }), "CHECK");
});

test("unknownKeys 는 NARRATION 에 없는 --only 키를 돌려준다", () => {
  assert.deepEqual(unknownKeys(new Set(["Intro-1", "Intro-2", "Nope-0"]), NARRATION), ["Intro-2", "Nope-0"]);
  assert.deepEqual(unknownKeys(new Set(["PassWindow-0"]), NARRATION), []);
  assert.deepEqual(unknownKeys(null, NARRATION), []);
});

test("parseJsonLines 는 JSON 이 아닌 줄을 건너뛴다", () => {
  const stdout = 'Loading model...\n{"key":"A-0","similarity":0.9}\n{broken progress\n\n  {"refHash":"x"}  \n[1,2]\n';
  assert.deepEqual(parseJsonLines(stdout), [{ key: "A-0", similarity: 0.9 }, { refHash: "x" }]);
});

test("mergeStt 는 manifest 에 있는 key 행만 합친다", () => {
  const manifest = { "A-0": { speech: 1 } };
  mergeStt(manifest, [
    { key: "A-0", transcript: "가", similarity: 0.9 },
    { key: "Z-9", transcript: "나", similarity: 0.1 },
    { transcript: "다", similarity: 0.2 },
  ]);
  assert.deepEqual(manifest, { "A-0": { speech: 1, transcript: "가", similarity: 0.9 } });
});
