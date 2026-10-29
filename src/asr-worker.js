import { pipeline, env } from '@huggingface/transformers';
const MODELS={base:{id:'Xenova/whisper-base.en',revision:'95bf40a508535962c6483ead40270b2e32267508'},small:{id:'Xenova/whisper-small.en',revision:'fa16a75f5d91e83ecb6a2ccb690f14d91ef00ca4'}};
let recognizer,activeModel;
env.allowLocalModels=true;env.useBrowserCache=true;
self.onmessage=async({data})=>{const{id,action,model,baseURL,samples,download=false}=data;try{
 if(action==='load'){
  if(!MODELS[model])throw Error('Unknown model');
  env.allowLocalModels=!download;env.allowRemoteModels=download;env.localModelPath=new URL('models/',baseURL).href;
  env.backends.onnx.wasm.wasmPaths=new URL('ort/',baseURL).href;
  env.backends.onnx.wasm.numThreads=1;
  if(recognizer&&activeModel!==model){await recognizer.dispose();recognizer=null;activeModel=null}
  if(!recognizer){recognizer=await pipeline('automatic-speech-recognition',MODELS[model].id,{revision:MODELS[model].revision,dtype:'q8',device:'wasm',local_files_only:!download,progress_callback:p=>{if(p.status==='progress')self.postMessage({type:'progress',file:p.file,progress:p.progress,download})}});activeModel=model}
  self.postMessage({id,ok:true});
 }else if(action==='transcribe'){
  if(!recognizer)throw Error('Load a model first');
  try{const result=await recognizer(samples,{chunk_length_s:25,stride_length_s:4,return_timestamps:false,do_sample:false,max_new_tokens:448});self.postMessage({id,text:result.text.trim()})}finally{samples.fill(0)}
 }else if(action==='dispose'){if(recognizer)await recognizer.dispose();recognizer=null;activeModel=null;self.postMessage({id,ok:true})}
}catch(error){self.postMessage({id,error:action==='load'?(download?'Model download failed. Check storage and connection, then retry.':'Model is not available offline. Tap Download to prepare it.'):'Transcription failed. Please try a shorter recording.'})}};
