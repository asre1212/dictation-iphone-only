# Dictation — iPhone

A separate, local-first iPhone PWA. Tap the microphone to record, tap again to stop, edit the transcript, and tap **Copy transcript**. Switch apps and paste. No desktop transfer or keyboard extension is required.

## Use

Open the published GitHub Pages URL in Safari, choose **Share → Add to Home Screen**, then tap **Download & prepare Whisper** while online. Keep the app open until the selected model and offline app are ready. Start with Base English; Small English is an optional, larger comparison. Tap the microphone, allow access, dictate, and tap it again. Recordings stop at three minutes or when the app is hidden. Each completed recording appends to the editable transcript. Copy before clearing or closing/reloading; draft text is held in memory, not persisted.

The offline app cache includes local scripts, worker code, audio worklet, and ONNX WASM runtime. Model assets are downloaded separately into Transformers.js cache. A cached model is checked at startup without remote model downloads. iOS/browser storage eviction can remove either cache; reopen online and prepare again if necessary. The first installation and model download require internet.

## Medical terminology

Settings includes GI vocabulary and optional exact-phrase spelling suggestions. Format: `preferred spelling | misheard phrase`, one entry per line. Reference terms without an alias do not bias the acoustic model. Suggestions are displayed for explicit approval and never automatically rewrite your note. Personal aliases are local deterministic corrections, not model fine-tuning. Vocabulary backup/export excludes transcripts and recordings.

This release uses pinned Hugging Face Whisper Base/Small English via Transformers.js 3.8.1 and ONNX Runtime Web WASM in a dedicated Web Worker. It does not claim to ship a medical-trained model or an LLM cleanup pass. See [medical-model evaluation](docs/medical-models.md) for the next comparison.

## Privacy

No audio or transcript uploads, analytics, cloud transcription, API keys, or server-side patient storage. Only the app assets and initial model downloads require network access. Audio buffers are released after transcription. Preferences and vocabulary are stored locally. Clipboard history and cross-device clipboard syncing are managed by the operating system, outside this app. Source code is public; your draft is never written to this repository. On-device processing alone is not proof of HIPAA compliance. Review transcripts, especially negation, medications, numbers, and units, before clinical use.

## Development

Node 22 or newer:

```sh
npm ci
npm test
npm run build
npm run serve
```

Production output is `dist/`. The build copies the pinned package's WASM runtime and creates a versioned offline cache manifest. Relative asset paths support a GitHub Pages project subdirectory. Updates activate after existing app windows are closed; finish/copy your draft before updating.

## GitHub Pages

The included workflow builds, tests, and deploys `dist/` on pushes to `main`. If initial automatic Pages enablement is restricted, set **Settings → Pages → Source → GitHub Actions**, then rerun the workflow. No credentials or tokens belong in the source.

## Verification limits

Unit tests cover exact medical phrase matching, clinical-content preservation, explicit formatting, append behavior, and resampling/silence checks. Build and browser checks are separate from physical-device validation. iPhone Air microphone behavior, transcription latency, memory pressure, long recordings, and word accuracy require testing on that actual phone. This app is a transcription aid and has not been clinically validated.
