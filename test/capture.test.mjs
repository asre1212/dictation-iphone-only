import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/audio-worklet.js',import.meta.url),'utf8');
function capture(rate){
  let Processor;const messages=[];
  class AudioWorkletProcessor{constructor(){this.port={postMessage:data=>messages.push(data)}}}
  vm.runInNewContext(source,{AudioWorkletProcessor,Float32Array,sampleRate:rate,registerProcessor:(_,type)=>Processor=type});
  const processor=new Processor();
  return {processor,messages,feed(seconds){const count=Math.round(rate*seconds);for(let n=0;n<count;n+=128)processor.process([[new Float32Array(Math.min(128,count-n)).fill(.25)]]);processor.port.onmessage({data:'flush'});return messages.filter(m=>m instanceof Float32Array)}};
}
for(const rate of [16000,44100,48000])test(`capture at ${rate} Hz yields 16 kHz PCM and flushes the final partial batch`,()=>{
  const h=capture(rate),parts=h.feed(1);
  assert.equal(parts.reduce((n,p)=>n+p.length,0),16000);
  assert.ok(parts.every(p=>p.length<=2048&&p.every(x=>x===.25)));
  assert.equal(h.messages.at(-1).flushed,true);
});
test('capture hard limit holds even if the page timer is delayed',()=>{
  const parts=capture(48000).feed(32);
  assert.equal(parts.reduce((n,p)=>n+p.length,0),16000*30);
});
