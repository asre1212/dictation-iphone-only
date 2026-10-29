import { defineConfig } from 'vite';
import {readFileSync} from 'node:fs';
const version=JSON.parse(readFileSync(new URL('./package.json',import.meta.url),'utf8')).version;
export default defineConfig({ base: './', define:{__APP_VERSION__:JSON.stringify(version)}, worker:{format:'es'}, build:{target:'es2022',chunkSizeWarningLimit:1800} });
