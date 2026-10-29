import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackup,parseBackup,importedTranscript} from '../src/backup.js';
import {canReload,restoreUpdateDraft,UPDATE_DRAFT_KEY} from '../src/updates.js';

const prefs={model:'small',format:false,vocabulary:"H. pylori | h pylori\nCrohn's disease"};
const draft='  No bleeding.\nOmeprazole 20 mg daily.\n';
test('phone backup round trip preserves settings and optional clinical text exactly',()=>{
  const backup=parseBackup(createBackup(prefs,draft,true));
  assert.deepEqual(backup.settings,{model:'small',format:false});
  assert.equal(backup.vocabulary,prefs.vocabulary);
  assert.equal(backup.transcript,draft);
  assert.equal('transcript' in parseBackup(createBackup(prefs,draft,false)),false);
});
test('legacy vocabulary backups are accepted without replacing other settings',()=>{
  assert.deepEqual(parseBackup(JSON.stringify({version:1,vocabulary:prefs.vocabulary})),{legacy:true,vocabulary:prefs.vocabulary});
});
test('append preserves both drafts; skip and replace are explicit choices',()=>{
  const backup={transcript:draft};
  assert.equal(importedTranscript('Edited note.  ',backup,'append'),'Edited note.  \n\n'+draft);
  assert.equal(importedTranscript('Edited note.',backup,'skip'),'Edited note.');
  assert.equal(importedTranscript('Edited note.',backup,'replace'),draft);
  assert.equal(importedTranscript('Edited note.',{},'replace'),'Edited note.');
});
test('malformed, oversized, future, and invalid preference backups fail before import',()=>{
  const valid=JSON.parse(createBackup(prefs,draft,true));
  for(const data of [null,{...valid,version:99},{...valid,settings:{model:'remote',format:false}},{...valid,settings:{model:'base',format:'false'}},{...valid,transcript:{}},{...valid,vocabulary:'x'.repeat(161)}])
    assert.throws(()=>parseBackup(JSON.stringify(data)));
  assert.throws(()=>parseBackup('not JSON'));
  assert.throws(()=>parseBackup(JSON.stringify({...valid,transcript:'é'.repeat(500001)})));
});
test('automatic reload never discards a draft, recording, pending work, or settings edits',()=>{
  const idle={busy:false,recording:false,draft:'',dialogOpen:false,transferring:false,unsavedSettings:false};
  assert.equal(canReload(idle),true);
  for(const patch of [{busy:true},{recording:true},{draft},{draft:' '},{dialogOpen:true},{transferring:true},{unsavedSettings:true}])
    assert.equal(canReload({...idle,...patch}),false);
});
test('explicit update handoff restores exact text once and removes temporary storage',()=>{
  const values=new Map([[UPDATE_DRAFT_KEY,draft]]);
  const storage={getItem:key=>values.get(key)??null,removeItem:key=>values.delete(key)};
  assert.equal(restoreUpdateDraft(storage),draft);
  assert.equal(values.size,0);
  assert.equal(restoreUpdateDraft(storage),null);
});
