# Medical dictation evaluation

The shipped app uses general Whisper Base English and Small English. The local vocabulary presents explicit correction suggestions; it does not train or prompt the model.

Next evaluate Google MedASR (105M parameters, trained on approximately 5,000 hours of physician dictation) against both Whisper baselines. An ONNX community export is available, but its ONNX preprocessing, CTC decoding, operator compatibility, memory, and Safari performance must be validated before integration. Access and redistribution are subject to Google's HAI-DEF terms; do not put a Hugging Face token in the PWA. A community medical fine-tune such as medxcribe/whisper-base.en is another candidate, but its card provides no clear evaluation results; verify licensing, ONNX compatibility, and accuracy independently.

Use 30–50 fictional dictated GI notes spoken in the intended user's voice. Include esophagogastroduodenoscopy, choledocholithiasis, Barrett's esophagus, eosinophilic esophagitis, anastomosis, biologic medications, H. pylori, negation, dose/units, dates, and measurements. Compare all models on the same recordings and reference transcripts. Report word error rate and critical clinical errors separately; also measure cold load, cached load, latency after Stop, memory/thermal behavior, silence hallucinations, and 1–3 minute recordings. Do not infer superiority from unrelated model-card benchmarks. Fine-tuning, if later justified, happens in a separate offline training workflow, not on the iPhone.

References reviewed:
- https://huggingface.co/docs/transformers.js/index
- https://huggingface.co/docs/transformers.js/api/env
- https://huggingface.co/Xenova/whisper-base.en
- https://huggingface.co/google/medasr
- https://huggingface.co/bizenlabs/medasr-onnx
- https://huggingface.co/medxcribe/whisper-base.en
- https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API

## MedASR browser feasibility, reviewed 2026-10-29

MedASR is not enabled in v1.1.0. The installed Transformers.js 3.8.1 source has no LASR model/feature-extractor/tokenizer integration, so changing the model ID in the existing Whisper pipeline is insufficient.

A concrete browser path now exists: `ainergiz/medasr-patient-summary` contains a `web/` ONNX + WebGPU demo, and `ysdede/medasr-onnx` provides browser loading notes for external ONNX model data. These are community implementations; their claimed iPhone speed and accuracy have not been verified in this app. BizenLabs also publishes a 149 MB INT8 export, but its documented example still uses Python preprocessing and decoding. Google's original Hugging Face model requires agreeing to its access conditions and HAI-DEF terms. Do not substitute a community mirror to circumvent those conditions or embed access tokens in the public PWA.

The next implementation should isolate MedASR in its own worker adapter: reproduce its 16 kHz feature extraction, run the pinned ONNX graph, decode CTC output with the matching tokenizer, and add bounded chunking. Validate a legally accessible artifact on a known fictional sample first, then on the target iPhone in Safari and as an installed PWA. Measure model download, offline reopen, memory, recording interruption, and critical transcription errors against the same Whisper recordings before offering it in the production model selector. Existing backup schema only accepts shipped model IDs; add a documented migration when MedASR is actually supported.

Additional primary sources:
- https://developers.google.com/health-ai-developer-foundations/medasr/model-card
- https://github.com/huggingface/transformers/blob/main/docs/source/en/model_doc/lasr.md
- https://github.com/ainergiz/medasr-patient-summary
- https://huggingface.co/ysdede/medasr-onnx
