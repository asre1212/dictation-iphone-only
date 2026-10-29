# Dictation — iPhone

A separate, local-first iPhone PWA. Tap the microphone to record, tap again to stop, edit the transcript, and tap **Copy transcript**. Switch apps and paste. No desktop transfer or keyboard extension is required.

## Use

Open the published GitHub Pages URL in Safari, choose **Share → Add to Home Screen**, then tap **Prepare Whisper (download if needed)** while online. Keep the app open until the selected model and offline app are ready. Start with Tiny English. Base and Small are larger, optional models that can exceed phone memory. Tap the microphone, allow access, dictate, and tap it again. Recordings stop at 30 seconds or when the app is hidden. Each completed recording appends to the editable transcript. Copy before clearing or closing/reloading; draft text is held in memory, not persisted.

The offline app cache includes local scripts, worker code, audio worklet, and ONNX WASM runtime. Model assets are downloaded separately into Transformers.js cache. The engine loads only after an explicit Prepare tap, allowing the app to open and update without immediately recreating a crashed runtime. Cached files are reused. iOS/browser storage eviction can remove either cache; reopen online and prepare again if necessary. The first installation and model download require internet.

## Medical terminology

Settings includes GI vocabulary and optional exact-phrase spelling suggestions. Format: `preferred spelling | misheard phrase`, one entry per line. Reference terms without an alias do not bias the acoustic model. Suggestions are displayed for explicit approval and never automatically rewrite your note. Personal aliases are local deterministic corrections, not model fine-tuning. Phone-transfer backups include vocabulary and settings. Current transcript text is included only if you select that option. Recordings and model weights are never exported.

This release uses pinned Hugging Face Whisper Tiny/Base/Small English via Transformers.js 3.8.1 and ONNX Runtime Web WASM in a dedicated Web Worker. It does not claim to ship a medical-trained model or an LLM cleanup pass. See [medical-model evaluation](docs/medical-models.md) for the next comparison.

## Privacy

No audio or transcript uploads, analytics, cloud transcription, API keys, or server-side patient storage. Only the app assets and initial model downloads require network access. Audio buffers are released after transcription. Preferences and vocabulary are stored locally. An explicit “Update & keep draft” temporarily stores the draft in sessionStorage for this tab; that temporary copy is removed as the app restores it. Exported JSON backups are readable files and may contain transcript text only when selected. Clipboard history and cross-device clipboard syncing are managed by the operating system, outside this app. Source code is public; your draft is never written to this repository. On-device processing alone is not proof of HIPAA compliance. Review transcripts, especially negation, medications, numbers, and units, before clinical use.

## Development

Node 22 or newer:

```sh
npm ci
npm test
npm run build
npm run serve
```

Production output is `dist/`. The build copies the pinned package's WASM runtime and creates a versioned offline cache manifest. Relative asset paths support a GitHub Pages project subdirectory. App updates download automatically while online. See the update and phone-transfer instructions below.

## GitHub Pages

The included workflow builds, tests, and deploys `dist/` on pushes to `main`. If initial automatic Pages enablement is restricted, set **Settings → Pages → Source → GitHub Actions**, then rerun the workflow. No credentials or tokens belong in the source.

## Verification limits

Unit tests cover exact medical phrase matching, clinical-content preservation, explicit formatting, append behavior, and resampling/silence checks. Build and browser checks are separate from physical-device validation. iPhone Air microphone behavior, transcription latency, memory pressure, long recordings, and word accuracy require testing on that actual phone. This app is a transcription aid and has not been clinically validated.

## Automatic updates (v1.1)

The app checks on startup, on return to the foreground, on reconnection, and every five minutes while visible. Settings → **Check for updates** also checks immediately. A complete app shell is cached before activation. Failed downloads leave the current version usable. Updates do not redownload or delete speech models.

An idle page with an empty draft reloads automatically. Recording, processing, an open Settings dialog, or unsaved vocabulary defers the reload. If a draft is open, an update banner offers **Update & keep draft**. This explicit action temporarily saves the exact text in this tab's session storage, reloads, restores it, and removes the temporary copy. If temporary storage is unavailable, the app keeps the page open and asks you to copy/export and clear the draft first. There is no continuous draft autosave. Other open app windows protect their own drafts independently; old app assets are retained until all windows report the current build. A closed iPhone PWA cannot actively check for updates until reopened.

Upgrading from v1.0 requires closing all existing Dictation windows and reopening once after copying any draft; the old release does not yet contain this update manager. Subsequent updates use the automatic flow above.

## Transfer to another phone

1. Open **Settings → Move to another phone** on the old phone. Save vocabulary edits first, or export the currently displayed vocabulary directly.
2. Optionally select **Include current transcript**. It is off by default.
3. Tap **Save backup file**, or **Share backup…** to use the iPhone share sheet (including Save to Files where offered). The readable JSON file includes model preference, formatting preference, and vocabulary; it excludes audio and model weights.
4. Move that file using Files/iCloud Drive or your chosen file-transfer method. On the new phone, install/open the same app and choose the file under **Choose a backup to import**.
5. Review the import summary, choose append/replace/skip for any transcript, and tap **Import backup**. Append is the default and preserves existing text. Download the selected speech model on the new phone while online.

Imports validate the complete file before changing anything, are limited to 1 MB, and support original v1 vocabulary-only backups. Imported transcript text remains an in-memory draft. Copy it before closing or ordinary reloading. Backups do not transfer microphone permissions, the Home Screen installation, or downloaded speech models.

## Spoken punctuation (v1.1.1)

With **Recognize spoken punctuation and line breaks** enabled in Settings (the existing formatting preference, on by default), say comma, period/full stop, question mark, exclamation mark/point, colon, or semicolon to insert punctuation. New line/next line and new paragraph/next paragraph insert line and paragraph breaks. Conversion applies only to newly recognized speech; manually edited text stays unchanged. Turn formatting off when you need those words literally, such as anatomical “colon” or “period”.

## iPhone crash mitigation (v1.2.0)

The reported Safari page-reset screen does not identify the cause by itself. Source inspection found that v1.1.1 bundled the JSEP ONNX runtime despite selecting `device: 'wasm'`. Upstream reports describe WebKit compilation memory spikes with that runtime. This release aliases ONNX to the matching non-JSEP CPU-only JavaScript and WASM from the same pinned package; it does not enable WebGPU or change inference to a server. The production build fails if the old JSEP binary is bundled again.

Existing preferences migrate once to Tiny English, preserving vocabulary and formatting. Models no longer load automatically on page open. Capture downsamples incrementally to 16 kHz, caps audio at 30 seconds in the worklet as well as the page timer, and exposes a microphone level meter. A model change terminates the previous worker before loading another model. Processing requests have deadlines and a Cancel action. Text appears after Stop and transcription, not live during recording.

If Safari previously crashed: close that tab/app window, reopen online, check for version 1.2.0 in Settings, and prepare Tiny English. **Test speech engine** in Settings downloads the public JFK sample from Hugging Face and transcribes it locally without using the microphone or altering your draft. It requires internet for the sample. Then try a 5–10 second microphone recording. Do not clear all Safari website data; that would also remove unrelated local PWA data on the same origin. No microphone or transcript data is uploaded by the test.

Validation covers 16/44.1/48 kHz capture, final audio flush, capture limits, existing functionality, and absence of JSEP in the production bundle. A desktop browser test does not prove resolution of a physical iPhone Safari crash; actual iPhone recording and repeated inference still need verification on that device.

References:
- https://github.com/microsoft/onnxruntime/issues/26827
- https://bugs.webkit.org/show_bug.cgi?id=304810
- https://huggingface.co/Xenova/whisper-tiny.en
