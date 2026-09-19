import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  AUDIO_PROCESSING_VERSION, assertNarrationMode, assertReprocessable, audioTailFilter, checkSpeech, countChars,
  estimateSeconds, findUnreadable, isCached, lineKey, mergeStt, parseJsonLines, parseOnly, reviewFlag, sha1,
  spokenText, sttTargets, unknownKeys, withAudioProcessing,
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

test("isCached 는 음성 출처와 fade·무음·처리 버전이 같고 mp3가 있을 때만 참", () => {
  const now = { textHash: sha1("가"), refHash: "r1", model: "m", trailing: 1, fadeOut: 0.5 };
  const entry = { ...now, processingVersion: AUDIO_PROCESSING_VERSION };
  assert.equal(isCached(entry, now, true), true);
  assert.equal(isCached(entry, now, false), false);
  assert.equal(isCached(entry, { ...now, refHash: "r2" }, true), false);
  assert.equal(isCached(entry, { ...now, textHash: sha1("나") }, true), false);
  assert.equal(isCached(undefined, now, true), false);
  assert.equal(isCached(entry, { ...now, trailing: 0.7 }, true), false);
  assert.equal(isCached(entry, { ...now, fadeOut: 0.3 }, true), false);
  assert.equal(isCached({ ...entry, processingVersion: AUDIO_PROCESSING_VERSION - 1 }, now, true), false);
  const { trailing, ...legacy } = entry;
  assert.equal(isCached(legacy, now, true), false);
  const { fadeOut, processingVersion, ...beforeFade } = entry;
  assert.equal(isCached(beforeFade, now, true), false);
});

test("audioTailFilter 는 발화 마지막 0.5초를 fade한 뒤 1초 무음을 붙인다", () => {
  assert.equal(audioTailFilter(3.185, { fadeOut: 0.5, trailing: 1 }), "afade=t=out:st=2.685:d=0.5:curve=qsin,apad=pad_dur=1");
  assert.equal(audioTailFilter(0.2, { fadeOut: 0.5, trailing: 1 }), "afade=t=out:st=0:d=0.2:curve=qsin,apad=pad_dur=1");
  assert.equal(audioTailFilter(2, { fadeOut: 0, trailing: 0.5 }), "apad=pad_dur=0.5");
  assert.throws(() => audioTailFilter(0, { fadeOut: 0.5, trailing: 1 }), /발화 길이/);
  assert.throws(() => audioTailFilter(NaN, { fadeOut: 0.5, trailing: 1 }), /발화 길이/);
  assert.throws(() => audioTailFilter(2, { fadeOut: -0.1, trailing: 1 }), /fadeOut/);
  assert.throws(() => audioTailFilter(2, { fadeOut: 0.5, trailing: -1 }), /trailing/);
});

test("ffmpeg PCM 결과는 fade 이전 음량을 유지하고 끝으로 줄어든 뒤 정확히 1초 무음이다", (t) => {
  const version = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  if (version.error?.code === "ENOENT") return t.skip("ffmpeg가 설치되지 않았습니다.");
  const result = spawnSync("ffmpeg", [
    "-v", "error", "-f", "lavfi", "-i", "sine=frequency=1000:sample_rate=8000:duration=2",
    "-af", audioTailFilter(2, { fadeOut: 0.5, trailing: 1 }), "-f", "f32le", "pipe:1",
  ]);
  assert.equal(result.status, 0, result.stderr?.toString());
  const pcm = result.stdout;
  assert.equal(pcm.length / 4 / 8000, 3);
  const rms = (start, end) => {
    let squares = 0;
    for (let i = Math.round(start * 8000); i < Math.round(end * 8000); i += 1) {
      squares += pcm.readFloatLE(i * 4) ** 2;
    }
    return Math.sqrt(squares / Math.round((end - start) * 8000));
  };
  assert.ok(Math.abs(rms(0.5, 1) - rms(1, 1.5)) < 0.00001);
  assert.ok(rms(1.5, 1.6) > rms(1.7, 1.8));
  assert.ok(rms(1.7, 1.8) > rms(1.9, 2));
  assert.ok(rms(1.9, 2) < rms(1, 1.5) * 0.25);
  assert.equal(rms(2, 3), 0);
});

test("재처리 사전 검사는 모든 원고 해시와 raw를 검사하고 실패해도 manifest를 바꾸지 않는다", () => {
  const lines = [{ key: "A-0", textHash: sha1("가") }, { key: "A-1", textHash: sha1("나") }];
  const manifest = { "A-0": { textHash: sha1("가"), transcript: "가" }, "A-1": { textHash: sha1("옛 원고") } };
  const before = structuredClone(manifest);
  const checked = [];
  assert.throws(() => assertReprocessable(lines, manifest, (key) => {
    checked.push(key);
    return key !== "A-0";
  }), (error) => /A-0: raw WAV 없음/.test(error.message) && /A-1: 음성 원고 해시 불일치/.test(error.message));
  assert.deepEqual(checked, ["A-0", "A-1"]);
  assert.deepEqual(manifest, before);
  assert.throws(() => assertReprocessable(lines, {}, () => true), /manifest 항목 없음/);
  assert.throws(() => assertReprocessable(lines, [], () => true), /올바른 객체/);
  assert.doesNotThrow(() => assertReprocessable(lines, {
    "A-0": { textHash: sha1("가") }, "A-1": { textHash: sha1("나") },
  }, () => true));
});

test("withAudioProcessing 은 전사·유사도·시도·원고·참조·모델을 보존하고 처리 설정만 갱신한다", () => {
  const entry = {
    textHash: sha1("가"), refHash: "reference", model: "same-model", attempts: 2,
    transcript: "가", similarity: 0.95, cps: 5.8, speech: 3.185, trailing: 0.5,
  };
  const before = structuredClone(entry);
  const updated = withAudioProcessing(entry, 3.185, { fadeOut: 0.5, trailing: 1 });
  assert.deepEqual(entry, before);
  assert.deepEqual(updated, { ...entry, fadeOut: 0.5, trailing: 1, processingVersion: AUDIO_PROCESSING_VERSION });
  assert.deepEqual(withAudioProcessing(updated, 3.185, { fadeOut: 0.5, trailing: 1 }), updated);
});

test("읽기·재처리 모드는 섞거나 --only로 일부 적용할 수 없다", () => {
  const mode = { reprocess: true, measure: false, estimate: false, only: null, engine: "mlx" };
  assert.doesNotThrow(() => assertNarrationMode(mode));
  assert.throws(() => assertNarrationMode({ ...mode, measure: true }), /함께 사용할 수 없습니다/);
  assert.throws(() => assertNarrationMode({ ...mode, estimate: true }), /함께 사용할 수 없습니다/);
  assert.throws(() => assertNarrationMode({ ...mode, reprocess: false, measure: true, estimate: true }), /함께 사용할 수 없습니다/);
  assert.throws(() => assertNarrationMode({ ...mode, only: new Set(["Intro-0"]) }), /기본 합성 모드/);
  assert.throws(() => assertNarrationMode({ ...mode, engine: "say" }), /mlx 가이드/);
});

test("CLI는 --reprocess 충돌 옵션을 실제 파일 처리 전에 거부한다", () => {
  const script = new URL("../narrate.mjs", import.meta.url);
  for (const extra of [["--measure"], ["--estimate"], ["--only", "Intro-0"]]) {
    const result = spawnSync(process.execPath, [script.pathname, "--guide", "teacher", "--reprocess", ...extra], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /함께 사용할 수 없습니다|기본 합성 모드/);
    assert.equal(result.stdout, "");
  }
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
