import sqlite3, sys, tempfile, unittest, wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import tts_mlx


def make_db(root: Path, reference_text: str = "안녕하세요.") -> Path:
    db = root / "voicebox.db"
    (root / "profiles" / "p1").mkdir(parents=True)
    (root / "profiles" / "p1" / "s1.wav").write_bytes(b"RIFFfake")
    with sqlite3.connect(db) as conn:
        conn.execute("CREATE TABLE profiles (id TEXT PRIMARY KEY, name TEXT UNIQUE)")
        conn.execute("CREATE TABLE profile_samples (id TEXT PRIMARY KEY, profile_id TEXT, audio_path TEXT, reference_text TEXT)")
        conn.execute("INSERT INTO profiles VALUES ('p1', 'Chois')")
        conn.execute("INSERT INTO profile_samples VALUES ('s1', 'p1', 'profiles/p1/s1.wav', ?)", (reference_text,))
    return db


class LoadReferenceTest(unittest.TestCase):
    def test_reads_audio_path_relative_to_db_and_text(self):
        with tempfile.TemporaryDirectory() as tmp:
            db = make_db(Path(tmp))
            audio, text = tts_mlx.load_reference(db, "Chois")
            self.assertEqual(audio, Path(tmp) / "profiles/p1/s1.wav")
            self.assertEqual(text, "안녕하세요.")

    def test_unknown_profile_exits(self):
        with tempfile.TemporaryDirectory() as tmp:
            db = make_db(Path(tmp))
            with self.assertRaises(SystemExit):
                tts_mlx.load_reference(db, "Nobody")


class ReferenceHashTest(unittest.TestCase):
    def test_changes_when_text_changes(self):
        with tempfile.TemporaryDirectory() as tmp:
            audio = Path(tmp) / "a.wav"
            audio.write_bytes(b"same")
            self.assertNotEqual(tts_mlx.reference_hash(audio, "가"), tts_mlx.reference_hash(audio, "나"))
            self.assertEqual(tts_mlx.reference_hash(audio, "가"), tts_mlx.reference_hash(audio, "가"))


class WriteWavTest(unittest.TestCase):
    def test_writes_mono_16bit_and_returns_seconds(self):
        import numpy as np
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "x.wav"
            seconds = tts_mlx.write_wav(out, np.zeros(24000, dtype=np.float32), 24000)
            self.assertAlmostEqual(seconds, 1.0)
            with wave.open(str(out)) as w:
                self.assertEqual((w.getnchannels(), w.getsampwidth(), w.getframerate()), (1, 2, 24000))


if __name__ == "__main__":
    unittest.main()
