import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('public/ort',{recursive:true});
for(const name of ['ort-wasm-simd-threaded.jsep.mjs','ort-wasm-simd-threaded.jsep.wasm'])await copyFile(`node_modules/onnxruntime-web/dist/${name}`,`public/ort/${name}`);
