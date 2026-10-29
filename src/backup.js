import {parseVocabulary} from './text.js';

export const MAX_BACKUP_BYTES = 1_000_000;
const MAX_TRANSCRIPT = 500_000;
const MAX_VOCABULARY = 70_000;
const normalizeVocabulary = text => parseVocabulary(text).map(({term,heard}) => term + (heard ? ` | ${heard}` : '')).join('\n');

function vocabulary(value) {
  if (typeof value !== 'string' || value.length > MAX_VOCABULARY || value.split('\n').length > 200)
    throw Error('Vocabulary must contain at most 200 entries.');
  if (value.split('\n').some(line => {
    const [term,...heard] = line.split('|');
    return term.trim().length > 160 || heard.join('|').trim().length > 160;
  })) throw Error('Vocabulary entries must be 160 characters or fewer per phrase.');
  return normalizeVocabulary(value);
}

export function parseBackup(text) {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) throw Error('Backup must be smaller than 1 MB.');
  let data;
  try { data = JSON.parse(text); } catch { throw Error('Choose a valid Dictation JSON backup.'); }
  if (!data || typeof data !== 'object') throw Error('Invalid Dictation backup.');
  // Vocabulary files from the original release remain importable.
  if (data.version === 1 && !data.app) return {legacy:true, vocabulary:vocabulary(data.vocabulary)};
  if (data.app !== 'dictation-iphone' || data.version !== 2) throw Error('This backup format is not supported. Update the app, then try again.');
  if (!data.settings || !['tiny','base','small'].includes(data.settings.model) || typeof data.settings.format !== 'boolean')
    throw Error('The backup contains invalid settings.');
  if (data.transcript !== undefined && (typeof data.transcript !== 'string' || data.transcript.length > MAX_TRANSCRIPT))
    throw Error('The backup transcript is invalid or too large.');
  return {legacy:false, settings:{model:data.settings.model,format:data.settings.format}, vocabulary:vocabulary(data.vocabulary), ...(data.transcript !== undefined ? {transcript:data.transcript} : {})};
}

export function createBackup(prefs, transcript, includeTranscript, date = new Date()) {
  const data = {app:'dictation-iphone',version:2,createdAt:date.toISOString(),settings:{model:prefs.model,format:prefs.format},vocabulary:prefs.vocabulary};
  if (includeTranscript) data.transcript = transcript;
  const text = JSON.stringify(data,null,2);
  parseBackup(text);
  return text;
}

export function importedTranscript(current, backup, mode) {
  if (backup.transcript === undefined || mode === 'skip') return current;
  if (mode === 'replace') return backup.transcript;
  // Preserve both notes verbatim, including whitespace and clinical punctuation.
  return current && backup.transcript ? current + '\n\n' + backup.transcript : current + backup.transcript;
}
