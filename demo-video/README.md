# 안내 영상 · 가이드 이미지 (Remotion)

포산고 자율학습 화면의 **안내 영상**과 **도움말(가이드) 페이지 이미지**를 같은 Remotion 장면에서 만든다. Next.js 앱과는 독립된 Node 프로젝트이고, 루트 `tsconfig.json`·`eslint.config.mjs`·`globals.css`(`@source not`)에서 제외되어 Railway 빌드에 영향을 주지 않는다.

작업 기준(원고 → 음성 → 장면 → 스틸 → 도움말 페이지 → 영상)은 [`.claude/GUIDE_PAGES.md`](../.claude/GUIDE_PAGES.md), 절차는 `/guide-page <page>` 스킬.

원본 파이프라인은 `school_cowork/demo-video`(ChoisNote 안내 영상 6편)에서 가져왔다. 버전(`package-lock.json`, `requirements-tts.lock.txt`)이 같다.

## 설치 (한 번만)

```bash
brew install ffmpeg webp python@3.12   # ffmpeg·ffprobe·cwebp. node 는 22.18+ 또는 23.6+ (.ts 원고를 플래그 없이 import)
cd demo-video
npm ci
/opt/homebrew/bin/python3.12 -m venv .venv-tts && .venv-tts/bin/pip install -r requirements-tts.lock.txt

# 검수용 Whisper: 모델은 SD 카드 캐시에, 토크나이저는 openai 저장소에서 복사한다(mlx-community 저장소에는 토크나이저가 없다).
# HF_HUB_CACHE 는 export 하지 말고 이 명령에만 붙인다.
HF_HUB_CACHE=/Volumes/Chois_SD2/dev/hf-cache .venv-tts/bin/python -c "
from huggingface_hub import snapshot_download, hf_hub_download
import shutil
snap = snapshot_download('mlx-community/whisper-large-v3-turbo')
for f in ['tokenizer.json','tokenizer_config.json','vocab.json','merges.txt','normalizer.json','added_tokens.json','special_tokens_map.json','preprocessor_config.json','generation_config.json']:
    shutil.copy(hf_hub_download('openai/whisper-large-v3-turbo', f), f'{snap}/{f}')"

npm run doctor     # 도구·모델 캐시·Voicebox 프로필·Whisper 토크나이저 점검
npm test           # narration-core(node:test) + tts_mlx/stt_check(unittest)
```

TTS 모델(`Qwen3-TTS-12Hz-0.6B-Base-bf16`)과 `Chois` 목소리 프로필은 **Voicebox 앱**에서 받고 만든다. 모델은 `~/.cache/huggingface/hub` 에 저장되고, 프로필의 참조 문장은 녹음과 한 글자까지 같아야 한다(아래 「음성」 절).

## 폴더

| 위치 | 내용 |
|---|---|
| `src/guide/` | 공용: `createTiming`(`lineAt`·`captionsFor`), `GuideScene`(배경·STEP 배지·장면 mp3·자막), `GuideContext`, `createGuideVideo`(장면 사이 페이드) |
| `src/components/` | `BrowserFrame`·`Cursor`·`Annotation`·`FlashNotice`·`StepBadge`·`icons` |
| `src/<guide>/` | 가이드별 `narration.ts`·`narration-durations.json`·`timing.ts`·장면·`<Guide>Video.tsx` |
| `src/stills/<page>.ts` | 가이드 페이지 스틸 목록 `{ composition, file, frame, crop?, resize? }` |
| `src/setup-check/` | 환경 점검용 최소 가이드(장면 2개·문장 3개). 파이프라인 전체를 1분 안에 통과시킨다 |
| `scripts/narrate.mjs` | 원고 → 클론 음성 mp3 + 길이 JSON + `review.tsv` |
| `scripts/guide-stills.mjs` | 장면 프레임 → WebP (`../public/guide/<page>/`) |
| `scripts/doctor.mjs` | 환경 점검 |
| `public/narration/<guide>/` | 장면 mp3, `.lines/`(문장 mp3·`manifest.json` 캐시), `review.tsv` |

## 명령

```bash
npm run dev                                                   # Remotion Studio
node scripts/narrate.mjs --guide <guide>                      # 생성(캐시 제외) + 끝 0.5초 무음 + 길이 검증 + Whisper 검수 → review.tsv
node scripts/narrate.mjs --guide <guide> --only Check-1       # 특정 문장만 다시
node scripts/narrate.mjs --guide <guide> --estimate           # 음성 없이 임시 길이 JSON (초당 5.8자) — 추적 중인 JSON 을 덮어쓰므로 음성을 만든 뒤 반드시 다시 생성
node scripts/narrate.mjs --guide <guide> --measure            # 생성 없이 기존 문장 mp3 길이로 JSON만 다시
npx remotion render <Composition> out/<name>.mp4              # 영상
node scripts/guide-stills.mjs --page <page> [--only NN-slug]  # 가이드 이미지
```

환경 점검 한 번에 돌리기:

```bash
npm run doctor && node scripts/narrate.mjs --guide setup-check && npx remotion render SetupCheck out/setup-check.mp4 \
  && node scripts/guide-stills.mjs --page setup-check --out out/guide-stills-check
```

## 음성 (Qwen3-TTS 0.6B · `Chois` 클론 · 로컬 mlx-audio 0.5.3)

| 항목 | 값 |
|---|---|
| Python | Homebrew `python3.12` (시스템 3.14에는 mlx 휠이 없을 수 있다) |
| 가상환경 | `demo-video/.venv-tts` (약 540MB, SD 카드) — `requirements-tts.lock.txt` |
| TTS 모델 | `mlx-community/Qwen3-TTS-12Hz-0.6B-Base-bf16` — Voicebox 앱이 받아 둔 `~/.cache/huggingface/hub` 를 `HF_HUB_OFFLINE=1` 로 쓴다 |
| 참조 음성·문장 | Voicebox DB `~/Library/Application Support/sh.voicebox.app/voicebox.db` 를 **읽기 전용**으로 열어 `profiles.name = 'Chois'` 의 첫 샘플을 쓴다. Voicebox 앱은 꺼져 있어도 된다 |
| 검수 STT | `mlx-community/whisper-large-v3-turbo`, 캐시 `HF_HUB_CACHE=/Volumes/Chois_SD2/dev/hf-cache` (openai 토크나이저 파일을 스냅샷에 복사해 둠) |
| 환경변수 | `TTS_PROFILE`(기본 `Chois`) · `TTS_MODEL` · `TTS_PYTHON` · `VOICEBOX_DB` · `HF_HUB_CACHE`(STT 캐시 전용 — `narrate.mjs` 가 TTS 워커에서는 지운다) |

지켜야 할 것:

- **Voicebox 서버 API는 쓰지 않는다.** MLX 스레드 문제로 생성 중 멈춘다. Voicebox 앱은 목소리 프로필을 만들고 고치는 도구로만 쓴다.
- **참조 문장은 녹음과 한 글자까지 같아야 한다.** 다르면 생성 음성이 대상 문장 대신 참조 음성의 발화를 읽다가 끊긴다.
- 음성용 문장에는 한글·공백·`.`·`,`·`·` 만 허용한다. 숫자·영문·기호는 `narration.ts` 의 `SPOKEN` 에 한글 읽기를 둔다(자막은 원고 표기). 빠지면 생성 전에 멈춘다.
- 생성 음성은 앞뒤 무음을 잘라(앞 -40dB, 뒤 -45dB) 끝에 0.5초 무음을 붙인다. 트림 설정은 캐시 키에 없으므로 바꾸면 `--only` 로 다시 만든다.
- 발화 속도가 초당 3~9자(공백 제외)를 벗어나거나 0.6초 미만이면 실패로 보고 최대 3라운드 다시 만든다.
- `review.tsv` 의 `CHECK` 는 Whisper 유사도 0.8 미만(실패 아님, 사람이 들어서 판단), `NOCHECK` 는 전사가 아직 없는 문장(`--no-check` 로 만들었거나 raw wav 가 없음). 다음 실행(`--no-check` 없이)은 `.lines/raw/` 에 wav 가 남은 NOCHECK 문장만 전사한다 — raw 는 git 제외라 워크트리·새 clone 에서는 `--only` 로 다시 만들어야 전사된다.
- 캐시 키는 음성용 문장·참조 해시·모델·끝 무음 길이다. Voicebox에서 목소리를 다시 녹음하면 전체가 다시 생성된다.
- TTS 워커와 Whisper 워커를 동시에 돌리지 않는다(`narrate.mjs` 가 순서대로 실행한다).

장면 길이와 자막 타이밍은 `narration-durations.json` 에서 자동 계산되므로, 원고를 고치면 `narrate.mjs` 만 다시 돌리면 된다.

렌더 시 Google Fonts(Inter, Noto Sans KR)를 네트워크에서 받으므로 오프라인에서는 실패한다.
