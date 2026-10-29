import './style.css';
import {createBackup,parseBackup,importedTranscript,MAX_BACKUP_BYTES} from './backup.js';
import {setupUpdates,restoreUpdateDraft} from './updates.js';
import {DEFAULT_VOCABULARY,parseVocabulary,suggestions,applyCorrection,formatSpeech,appendTranscript,wordCount,hasSpeech,downsample} from './text.js';
const $=id=>document.getElementById(id), BASE=new URL('./',document.baseURI).href;
const PREF='dictation.preferences.v1';
let prefs={model:'base',format:true,vocabulary:DEFAULT_VOCABULARY};try{prefs={...prefs,...JSON.parse(localStorage.getItem(PREF)||'{}')}}catch{}
if(!['base','small'].includes(prefs.model))prefs.model='base';
let worker,seq=0,pending=new Map(),ready=false,busy=false,recording=false,audio,recordTimer,started=0,autoStopTimer,copyTimer,updates,transferring=false,importCandidate=null;
function save(){try{localStorage.setItem(PREF,JSON.stringify(prefs))}catch{$('notice').textContent='Settings could not be saved. Browser storage may be full.'}}
function status(text){$('status').textContent=text}
function sync(){updates?.refresh();const text=$('transcript').value;$('wordCount').textContent=`${wordCount(text)} words`;$('copy').disabled=busy||recording||!text.trim();$('clear').disabled=busy||recording||!text;$('mic').disabled=busy||!ready;$('mic').classList.toggle('recording',recording);$('mic').setAttribute('aria-label',recording?'Stop dictating':'Start dictating');$('mic').setAttribute('aria-pressed',String(recording));$('micLabel').textContent=recording?'Tap to stop':busy?'Working on your device…':ready?'Tap to dictate':'Prepare your model below';$('dot').className='dot '+(recording?'recording':ready?'ready':'');for(const id of ['model','download','setup','deleteModels','settingsOpen','exportBackup','shareBackup','importBackup','applyImport'])$(id).disabled=busy||recording||transferring;$('setup').hidden=ready;$('progress').hidden=!busy;$('suggestions').hidden=true;if(!busy&&!recording)renderSuggestions()}
function renderSuggestions(){const box=$('suggestions');box.replaceChildren();const matches=suggestions($('transcript').value,parseVocabulary(prefs.vocabulary));if(!matches.length)return;box.hidden=false;const label=document.createElement('div');label.textContent='Optional medical spelling suggestions · review before applying';box.append(label);for(const match of matches){const b=document.createElement('button');b.type='button';b.textContent=`${match.heard} → ${match.term}`;b.onclick=()=>{$('transcript').value=applyCorrection($('transcript').value,match);sync();status('Correction applied. Review the transcript before copying.')};box.append(b)}}
function ensureWorker(){if(worker)return;worker=new Worker(new URL('./asr-worker.js',import.meta.url),{type:'module'});worker.onmessage=({data})=>{if(data.type==='progress'){$('progress').value=data.progress||0;status(`${data.download?'Downloading':'Loading cached'} ${prefs.model==='small'?'Small':'Base'} · ${Math.round(data.progress||0)}% of current file`);return}const task=pending.get(data.id);if(task){pending.delete(data.id);data.error?task.reject(Error(data.error)):task.resolve(data)}};worker.onerror=()=>{ready=false;for(const p of pending.values())p.reject(Error('Speech engine stopped. Try preparing the model again.'));pending.clear();worker?.terminate();worker=null;sync()}}
function request(action,extra={}){ensureWorker();return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});const payload={id,action,model:prefs.model,baseURL:BASE,...extra};worker.postMessage(payload,extra.samples?[extra.samples.buffer]:[])})}
async function prepare(download=false){if(busy||recording)return;busy=true;ready=false;$('notice').textContent='';$('progress').value=0;status(download?'Preparing model download…':'Checking downloaded model…');sync();try{if(download){if(!('caches'in window))throw Error('This browser cannot store models. Use Safari outside Private Browsing.');await caches.open('transformers-cache');await navigator.storage?.persist?.().catch(()=>false)}await request('load',{download});ready=true;status(`${prefs.model==='small'?'Small':'Base'} English ready · on-device`);$('settingsStatus').textContent='Selected model is ready. Close Settings to dictate.'}catch(e){status('Model preparation needed');if(download)$('notice').textContent=e.message;$('settingsStatus').textContent=e.message}finally{busy=false;sync()}}
async function start(){if(busy||recording||!ready)return;busy=true;$('notice').textContent='';status('Opening microphone…');sync();let stream,ctx;try{if(!navigator.mediaDevices?.getUserMedia)throw Error('Microphone access requires Safari on HTTPS.');stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});ctx=new AudioContext();await ctx.resume();await ctx.audioWorklet.addModule(new URL('audio-worklet.js',BASE));const source=ctx.createMediaStreamSource(stream),node=new AudioWorkletNode(ctx,'capture'),mute=ctx.createGain();mute.gain.value=0;const session={stream,ctx,source,node,mute,chunks:[],samples:0,resolveFlush:null};node.port.onmessage=({data})=>{if(data.flushed){session.resolveFlush?.();return}session.chunks.push(data);session.samples+=data.length};source.connect(node);node.connect(mute);mute.connect(ctx.destination);audio=session;recording=true;started=Date.now();$('timer').textContent='00:00';recordTimer=setInterval(()=>{const s=Math.floor((Date.now()-started)/1000);$('timer').textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`},250);autoStopTimer=setTimeout(()=>{stop('Stopped at three minutes. Continue with another recording.')},180000);stream.getAudioTracks()[0].onended=()=>{if(recording)stop('Recording was interrupted. Review the captured text.')};ctx.onstatechange=()=>{if(ctx.state==='interrupted'&&recording)stop('Recording was interrupted.')};status('Listening · audio stays on your phone')}catch(e){stream?.getTracks().forEach(t=>t.stop());await ctx?.close().catch(()=>{});status('Microphone unavailable');$('notice').textContent=e.name==='NotAllowedError'?'Allow microphone access in Safari, then tap the microphone again.':e.message}finally{busy=false;sync()}}
async function stop(note=''){if(!recording||busy)return;recording=false;busy=true;clearInterval(recordTimer);clearTimeout(autoStopTimer);const session=audio;audio=null;status('Transcribing on your phone…');sync();$('notice').textContent=note;let samples;try{session.stream.getTracks().forEach(t=>{t.onended=null;t.stop()});session.ctx.onstatechange=null;await new Promise(resolve=>{session.resolveFlush=resolve;session.node.port.postMessage('flush');setTimeout(resolve,400)});session.node.port.onmessage=null;session.source.disconnect();session.node.disconnect();session.mute.disconnect();await session.ctx.close();const input=new Float32Array(session.samples);let offset=0;for(const part of session.chunks){input.set(part,offset);offset+=part.length;part.fill(0)}session.chunks=[];samples=downsample(input,session.ctx.sampleRate);input.fill(0);if(!hasSpeech(samples)){status('No clear speech captured. Tap to try again.');return}const result=await request('transcribe',{samples});const text=formatSpeech(result.text,prefs.format);if(text){$('transcript').value=appendTranscript($('transcript').value,text);status('Ready to review and copy')}else status('No speech recognized. Tap to try again.')}catch(e){status('Could not transcribe this recording');$('notice').textContent=e.message;session.stream.getTracks().forEach(t=>t.stop());await session.ctx.close().catch(()=>{})}finally{if(samples?.byteLength)samples.fill(0);session.chunks.forEach(p=>p.fill(0));session.chunks=[];busy=false;sync()}}
$('mic').onclick=()=>recording?stop():start();$('setup').onclick=()=>prepare(true);$('download').onclick=()=>prepare(true);
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('transcript').value);status('Copied. Switch apps and paste.');$('copy').firstChild.textContent='Copied ✓ ';clearTimeout(copyTimer);copyTimer=setTimeout(()=>$('copy').firstChild.textContent='Copy transcript ',2500)}catch{$('transcript').focus();$('transcript').select();$('notice').textContent='Copy was blocked. Touch and hold the selected text and choose Copy.'}};
$('clear').onclick=()=>{if(confirm('Clear this transcript? It cannot be recovered.')){$('transcript').value='';$('notice').textContent='';status(ready?'Ready to dictate':'Download a model to get started');sync()}};
$('transcript').oninput=sync;$('settingsOpen').onclick=()=>$('settings').showModal();$('model').value=prefs.model;$('format').checked=prefs.format;$('vocabulary').value=prefs.vocabulary;
$('model').onchange=()=>{prefs.model=$('model').value;save();prepare(false)};$('format').onchange=()=>{prefs.format=$('format').checked;save()};$('saveVocabulary').onclick=()=>{prefs.vocabulary=parseVocabulary($('vocabulary').value).map(x=>x.term+(x.heard?' | '+x.heard:'')).join('\n');$('vocabulary').value=prefs.vocabulary;save();$('settingsStatus').textContent='Vocabulary saved on this device.';sync()};
function backupFile(){
  const text=createBackup({...prefs,vocabulary:$('vocabulary').value},$('transcript').value,$('includeTranscript').checked);
  return new File([text],`dictation-backup-${new Date().toISOString().slice(0,10)}.json`,{type:'application/json'});
}
function downloadBackup(file){const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
$('exportBackup').onclick=()=>{try{downloadBackup(backupFile());$('transferStatus').textContent='Backup file prepared. Save it in Files, then import it on your new phone.'}catch(e){$('transferStatus').textContent=e.message}};
$('shareBackup').hidden=!navigator.share;
$('shareBackup').onclick=async()=>{
  if(busy||recording||transferring)return;
  try{
    const file=backupFile();
    if(!navigator.canShare?.({files:[file]})){downloadBackup(file);$('transferStatus').textContent='File sharing is unavailable here. Save the downloaded backup instead.';return}
    transferring=true;sync();
    await navigator.share({files:[file],title:'Dictation backup'});
    $('transferStatus').textContent='Backup shared. Import the file in Dictation on your new phone.';
  }catch(e){$('transferStatus').textContent=e.name==='AbortError'?'Sharing cancelled.':e.message}
  finally{transferring=false;sync()}
};
$('importBackup').onchange=async event=>{
  const file=event.target.files[0];if(!file)return;
  transferring=true;importCandidate=null;$('importPreview').hidden=true;sync();
  try{
    if(file.size>MAX_BACKUP_BYTES)throw Error('Backup must be smaller than 1 MB.');
    importCandidate=parseBackup(await file.text());
    const terms=parseVocabulary(importCandidate.vocabulary).length;
    $('importSummary').textContent=importCandidate.legacy
      ? `Vocabulary-only backup: ${terms} entries. Replaces your vocabulary; other settings and text stay as they are.`
      : `${importCandidate.settings.model==='small'?'Small':'Base'} English, formatting ${importCandidate.settings.format?'on':'off'}, ${terms} vocabulary entries. Replaces your saved settings and vocabulary.`;
    $('importDraftOptions').hidden=importCandidate.transcript===undefined;
    $('importDraftMode').value='append';
    $('importDraftSummary').textContent=importCandidate.transcript===undefined?'No transcript in this backup.':`Includes a transcript (${wordCount(importCandidate.transcript)} words).`;
    $('importPreview').hidden=false;$('transferStatus').textContent='Review the backup below, then tap Import backup to apply it.';
  }catch(e){$('transferStatus').textContent=e.message}
  finally{event.target.value='';transferring=false;sync()}
};
$('cancelImport').onclick=()=>{importCandidate=null;$('importPreview').hidden=true;$('transferStatus').textContent='Import cancelled. Nothing changed.'};
$('applyImport').onclick=()=>{
  if(!importCandidate||busy||recording||transferring)return;
  const candidate=importCandidate;
  const nextPrefs={...prefs,...candidate.settings,vocabulary:candidate.vocabulary};
  const nextText=importedTranscript($('transcript').value,candidate,$('importDraftMode').value);
  try{localStorage.setItem(PREF,JSON.stringify(nextPrefs))}catch{$('transferStatus').textContent='Could not save the imported settings. Free up browser storage and try again. Nothing changed.';return}
  const modelChanged=prefs.model!==nextPrefs.model;prefs=nextPrefs;
  $('model').value=prefs.model;$('format').checked=prefs.format;$('vocabulary').value=prefs.vocabulary;$('transcript').value=nextText;
  importCandidate=null;$('importPreview').hidden=true;
  $('transferStatus').textContent='Backup imported. Copy any restored text before closing. Download the selected speech model on this phone if needed.';
  sync();if(modelChanged)prepare(false);
};
$('deleteModels').onclick=async()=>{if(!confirm('Remove downloaded speech models? You will need internet to download them again.'))return;busy=true;sync();try{await request('dispose');await caches.delete('transformers-cache');ready=false;status('Speech models removed');$('settingsStatus').textContent='Speech model cache removed. Your vocabulary is retained.'}catch(e){$('settingsStatus').textContent=e.message}finally{busy=false;sync()}};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&recording)stop('Recording stopped when you left the app. Review the captured text.')});window.addEventListener('pagehide',()=>{audio?.stream.getTracks().forEach(t=>t.stop())});
try{const restored=restoreUpdateDraft(sessionStorage);if(restored!==null){$('transcript').value=restored;$('notice').textContent='App updated. Your draft was restored; review and copy when ready.'}}catch{$('notice').textContent='Temporary update storage is unavailable. Copy your draft before reloading.'}
$('appVersion').textContent=`Version ${__APP_VERSION__}`;
updates=setupUpdates({baseURL:BASE,entryURL:import.meta.url,getState:()=>({busy,recording,draft:$('transcript').value,dialogOpen:$('settings').open,unsavedSettings:$('vocabulary').value!==prefs.vocabulary,transferring}),banner:$('updateBanner'),message:$('updateMessage'),applyButton:$('applyUpdate'),checkButton:$('checkUpdate'),updateStatus:$('updateStatus'),offlineLabel:$('offlineLabel')});
$('settings').addEventListener('close',()=>updates.refresh());
sync();prepare(false);
