"""Qwen3-TTS 클론 음성 워커. narrate.mjs(engine "mlx")가 호출한다.

참조 음성·문장은 Voicebox DB에서 읽기만 한다. Voicebox 서버는 MLX 스레드 문제로
생성 중 멈추므로 쓰지 않는다(설계 9.1).
"""
import hashlib
import json
import sqlite3
import sys
import wave
from pathlib import Path


def load_reference(db_path, profile_name):
    with sqlite3.connect(f"file:{db_path}?mode=ro", uri=True) as conn:
        row = conn.execute(
            "SELECT s.audio_path, s.reference_text FROM profiles p "
            "JOIN profile_samples s ON s.profile_id = p.id "
            "WHERE p.name = ? ORDER BY s.rowid LIMIT 1",
            (profile_name,),
        ).fetchone()
    if row is None:
        raise SystemExit(f"voice profile not found: {profile_name}")
    return Path(db_path).parent / row[0], row[1]


def reference_hash(audio_path, reference_text):
    digest = hashlib.sha1()
    digest.update(Path(audio_path).read_bytes())
    digest.update(reference_text.encode("utf-8"))
    return digest.hexdigest()


def write_wav(path, samples, sample_rate):
    import numpy as np

    pcm = (np.clip(samples, -1.0, 1.0) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(sample_rate)
        out.writeframes(pcm.tobytes())
    return len(pcm) / sample_rate


def emit(payload):
    print(json.dumps(payload, ensure_ascii=False), flush=True)


def generate(job_path):
    import numpy as np
    from mlx_audio.tts.utils import load_model

    job = json.loads(Path(job_path).read_text(encoding="utf-8"))
    audio, reference_text = load_reference(job["db"], job["profile"])
    ref_hash = reference_hash(audio, reference_text)
    model = load_model(job["model"])
    for item in job["jobs"]:
        chunks = [
            np.array(result.audio, dtype=np.float32).reshape(-1)
            for result in model.generate(
                text=item["text"], ref_audio=str(audio), ref_text=reference_text, lang_code="korean"
            )
        ]
        out = Path(item["out"])
        out.parent.mkdir(parents=True, exist_ok=True)
        seconds = write_wav(out, np.concatenate(chunks), model.sample_rate)
        emit({"key": item["key"], "out": str(out), "seconds": round(seconds, 3), "refHash": ref_hash})


if __name__ == "__main__":
    if sys.argv[1] == "--ref-hash":
        audio_path, text = load_reference(sys.argv[3], sys.argv[2])
        emit({"refHash": reference_hash(audio_path, text)})
    else:
        generate(sys.argv[1])
