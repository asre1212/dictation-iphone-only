import { defineConfig } from 'vite';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const version=JSON.parse(readFileSync(new URL('./package.json',import.meta.url),'utf8')).version;
// The default ORT entry includes JSEP/Asyncify even with device:'wasm'.
// Use its matching CPU-only JS + WASM pair to avoid that Safari crash path.
export default defineConfig({ base: './', resolve:{alias:[{find:/^onnxruntime-web$/,replacement:fileURLToPath(new URL('./node_modules/onnxruntime-web/dist/ort.wasm.min.mjs',import.meta.url))}]}, define:{__APP_VERSION__:JSON.stringify(version)}, worker:{format:'es'}, build:{target:'es2022',chunkSizeWarningLimit:1800} });
