import {mkdir,copyFile,rm} from 'node:fs/promises';
await rm('public/ort',{recursive:true,force:true}); // obsolete generated runtime
await mkdir('public/ort-cpu',{recursive:true});
for(const name of ['ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.wasm'])await copyFile(`node_modules/onnxruntime-web/dist/${name}`,`public/ort-cpu/${name}`);
