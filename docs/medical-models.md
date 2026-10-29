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
