import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {MessageChannel} from 'node:worker_threads';

const source=await readFile(new URL('../scripts/service-worker.js',import.meta.url),'utf8');
function workerHarness(entryURLs){
  const listeners={},deleted=[],scope='https://example.test/dictation/';
  const self={location:{href:scope+'sw.js',origin:'https://example.test'},registration:{scope},
    addEventListener:(name,callback)=>listeners[name]=callback,
    clients:{claim:async()=>{},matchAll:async()=>entryURLs.map(entryURL=>({url:scope,postMessage:(_,ports)=>ports[0].postMessage({entryURL})}))}};
  const caches={keys:async()=>['dictation-shell-old','dictation-shell-current','transformers-cache'],delete:async key=>deleted.push(key)};
  vm.runInNewContext(source,{self,caches,URL,MessageChannel,setTimeout,clearTimeout,CACHE:'dictation-shell-current',FILES:['./assets/current.js','./index.html']});
  return {listeners,deleted,scope};
}
test('an older open window retains its shell and all downloaded speech models',async()=>{
  const h=workerHarness(['https://example.test/dictation/assets/current.js','https://example.test/dictation/assets/old.js']);
  let completed;h.listeners.activate({waitUntil:p=>completed=p});await completed;
  assert.deepEqual(h.deleted,[]);
});
test('old shell cleanup occurs only once every open window reports the new build',async()=>{
  const h=workerHarness(['https://example.test/dictation/assets/current.js']);
  let completed;h.listeners.message({data:{type:'CLEAN_OLD_SHELLS'},waitUntil:p=>completed=p});await completed;
  assert.deepEqual(h.deleted,['dictation-shell-old']);
});
