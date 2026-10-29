export const DEFAULT_VOCABULARY = `esophagogastroduodenoscopy | esophageal gastro duodenoscopy
choledocholithiasis | choledocho lithiasis
Barrett's esophagus | barretts esophagus
H. pylori | h pylori
ileocolonic anastomosis | ileo colonic anastomosis
ulcerative colitis
Crohn's disease
infliximab
vedolizumab
ustekinumab
eosinophilic esophagitis
endoscopic retrograde cholangiopancreatography
endoscopic ultrasound
sessile serrated lesion`;
export function parseVocabulary(text){return String(text).split('\n').slice(0,200).map(line=>{const [term,...rest]=line.split('|');return {term:term.trim().slice(0,160),heard:rest.join('|').trim().slice(0,160)}}).filter(x=>x.term)}
const escapeRegExp=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function phrasePattern(phrase){return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(phrase)}(?![\\p{L}\\p{N}])`,'giu')}
export function suggestions(text,vocabulary){return vocabulary.filter(v=>v.heard&&v.heard.toLocaleLowerCase()!==v.term.toLocaleLowerCase()&&phrasePattern(v.heard).test(text)).slice(0,12)}
export function applyCorrection(text,{heard,term}){return text.replace(phrasePattern(heard),()=>term)}
export function formatSpeech(text,enabled){if(!enabled)return text.trim();return text.replace(/\bnew paragraph\b[,.]?/gi,'\n\n').replace(/\bnew line\b[,.]?/gi,'\n').replace(/[^\S\n]*\n[^\S\n]*/g,'\n').trim()}
export function appendTranscript(current,next){if(!next)return current;return current?current.replace(/\s+$/,'')+'\n\n'+next:next}
export function wordCount(text){return text.trim()?text.trim().split(/\s+/u).length:0}
export function hasSpeech(samples){let sum=0;for(const x of samples)sum+=x*x;return samples.length>4000&&Math.sqrt(sum/samples.length)>.002}
export function downsample(input,rate,target=16000){if(rate===target)return input.slice();const out=new Float32Array(Math.floor(input.length*target/rate));for(let i=0;i<out.length;i++){const start=Math.floor(i*rate/target),end=Math.max(start+1,Math.floor((i+1)*rate/target));let sum=0;for(let j=start;j<end&&j<input.length;j++)sum+=input[j];out[i]=sum/(Math.min(end,input.length)-start)}return out}
