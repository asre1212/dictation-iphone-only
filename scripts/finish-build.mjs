import {readdir,readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
async function walk(root){let files=[];for(const f of await readdir(root,{withFileTypes:true})){const path=`${root}/${f.name}`;files.push(...f.isDirectory()?await walk(path):[path])}return files}
const files=(await walk('dist')).filter(p=>!p.endsWith('/sw.js'));
const hash=createHash('sha256');for(const file of files){hash.update(file);hash.update(await readFile(file))}hash.update(await readFile('scripts/service-worker.js'));const version=hash.digest('hex').slice(0,12);
const urls=files.map(p=>'./'+p.slice(5));
const worker = await readFile('scripts/service-worker.js','utf8');
await writeFile('dist/sw.js',`const CACHE='dictation-shell-${version}';\nconst FILES=${JSON.stringify(urls)};\n${worker}`);
console.log(`Offline app ${version}: ${files.length} cached files`);
